/**
 * Contract Metadata API
 * 
 * Endpoint: GET /api/v1/contractMetadata/[chainId]/[name]
 * 
 * Optimizations:
 * 1. Paid RPC Endpoints: Uses configured RPC_ENDPOINT from env (NEXT_PUBLIC_RPC, etc.)
 * 2. Fully Parallel: Fetches ALL text records from ALL domain levels in parallel
 * 3. Resolver Caching: Caches resolver per ENS name within a single request
 * 4. Smart Fallback: Uses most specific (lower-level) value first, falls back to parent if not set
 * 
 * Returns: Text records (name, alias, description, avatar, header, url, category, license, docs, audits, socials)
 * - alias: Only from the specific contract name (no parent fallback)
 * - All others: From contract name, falls back to parent domains if not set
 * - Socials: com.github, com.twitter, org.telegram, com.linkedin
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/utils/constants'
import type { TextRecords } from '@/types'

// Function to get parent domains up to 2LD
function getParentDomains(ensName: string): string[] {
  const parts = ensName.split('.')
  const parents: string[] = []

  // Build parent chain from immediate parent to 2LD
  for (let i = 1; i < parts.length - 1; i++) {
    parents.push(parts.slice(i).join('.'))
  }

  return parents
}

// Function to fetch text record from a specific ENS name
async function fetchTextRecord(
  provider: ethers.JsonRpcProvider,
  resolverCache: Map<string, ethers.EnsResolver | null>,
  ensName: string,
  key: string,
): Promise<string | null> {
  try {
    // Check resolver cache for this specific ENS name
    let resolver = resolverCache.get(ensName)

    if (resolver === undefined) {
      // Not cached yet, fetch it
      resolver = await provider.getResolver(ensName)
      resolverCache.set(ensName, resolver)
    }

    if (!resolver) return null

    const value = await resolver.getText(key)
    return value || null
  } catch (error) {
    return null
  }
}

// Function to fetch text records with parent fallback (OPTIMIZED - All parallel)
async function fetchTextRecordsWithFallback(
  provider: ethers.JsonRpcProvider,
  ensName: string,
): Promise<TextRecords> {
  const records: TextRecords = {}

  // Resolver cache scoped to this request only
  const resolverCache = new Map<string, ethers.EnsResolver | null>()

  try {
    // Build domain chain (from most specific to least specific)
    const domainChain = [ensName, ...getParentDomains(ensName)]

    // Define all keys and which ones should use fallback
    const directKeys = ['alias'] // No parent fallback
    const fallbackKeys = [
      'avatar',
      'name',
      'description',
      'header',
      'url',
      'category',
      'license',
      'docs',
      'audits',
      'com.github',
      'com.twitter',
      'org.telegram',
      'com.linkedin',
    ]

    // Create all fetch promises in parallel
    const allPromises: Promise<{
      domain: string
      key: string
      value: string | null
    }>[] = []

    // Fetch direct keys only from the specific ENS name
    for (const key of directKeys) {
      allPromises.push(
        fetchTextRecord(provider, resolverCache, ensName, key).then(
          (value) => ({
            domain: ensName,
            key,
            value,
          }),
        ),
      )
    }

    // Fetch fallback keys from all domain levels in parallel
    for (const key of fallbackKeys) {
      for (const domain of domainChain) {
        allPromises.push(
          fetchTextRecord(provider, resolverCache, domain, key).then(
            (value) => ({
              domain,
              key,
              value,
            }),
          ),
        )
      }
    }

    // Wait for ALL requests to complete in parallel
    const allResults = await Promise.all(allPromises)

    // Process results: For each key, use the value from the most specific domain (first in chain)
    const resultsByKey = new Map<string, Map<string, string>>()

    allResults.forEach(({ domain, key, value }) => {
      if (value) {
        if (!resultsByKey.has(key)) {
          resultsByKey.set(key, new Map())
        }
        resultsByKey.get(key)!.set(domain, value)
      }
    })

    // For each key, pick the value from the most specific domain (earliest in domainChain)
    resultsByKey.forEach((domainValues, key) => {
      for (const domain of domainChain) {
        if (domainValues.has(domain)) {
          records[key as keyof TextRecords] = domainValues.get(domain)
          break // Use the most specific domain's value
        }
      }

      // If not in domainChain (i.e., direct key like 'alias'), use the only value
      if (!records[key as keyof TextRecords] && domainValues.size > 0) {
        records[key as keyof TextRecords] = Array.from(domainValues.values())[0]
      }
    })

    return records
  } catch (error) {
    console.error('[API] Error fetching text records:', error)
    return records
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end(`Method ${req.method} Not Allowed`)
  }

  const { chainId, name } = req.query

  if (typeof chainId !== 'string' || typeof name !== 'string') {
    return res.status(400).json({ error: 'Invalid parameters' })
  }

  const chainIdNumber = parseInt(chainId)
  if (isNaN(chainIdNumber)) {
    return res.status(400).json({ error: 'Invalid chainId' })
  }

  try {
    // Get config for the chain
    const config = CONTRACTS[chainIdNumber]
    if (!config || !config.RPC_ENDPOINT) {
      return res.status(400).json({ error: 'Unsupported chain' })
    }

    // Initialize provider with paid RPC endpoint from env/config
    const provider = new ethers.JsonRpcProvider(config.RPC_ENDPOINT)

    // Fetch text records with parent fallback
    const records = await fetchTextRecordsWithFallback(provider, name)

    return res.status(200).json(records)
  } catch (error) {
    console.error('[API] Error in contractMetadata handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
