/**
 * Contract Metadata API
 * 
 * Endpoint: GET /api/v1/contractMetadata/[chainId]/[name]
 * 
 * Optimizations:
 * 1. Paid RPC Endpoints: Uses configured RPC_ENDPOINT from env (NEXT_PUBLIC_RPC, etc.)
 * 2. Parallel Calls: Fetches direct text records for one ENS name in parallel
 * 3. Resolver Caching: Caches resolver per ENS name within a single request
 * 
 * Returns: Text records (name, alias, description, avatar, url, category, license, docs, audits)
 * with parent domain fallback for url, category, license, docs, and audits.
 */

import { NextApiRequest, NextApiResponse } from 'next'
import { ethers } from 'ethers'
import { CONTRACTS } from '@/utils/constants'

interface TextRecords {
  name?: string
  alias?: string
  description?: string
  avatar?: string
  url?: string
  category?: string
  license?: string
  docs?: string
  audits?: string
}

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
  key: string
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

// Function to fetch text records with parent fallback
async function fetchTextRecordsWithFallback(
  provider: ethers.JsonRpcProvider,
  ensName: string
): Promise<TextRecords> {
  const records: TextRecords = {}
  
  // Resolver cache scoped to this request only
  const resolverCache = new Map<string, ethers.EnsResolver | null>()

  try {
    // Step 1: Fetch direct records in parallel (name, alias, description, avatar)
    const directKeys = ['name', 'alias', 'description', 'avatar']
    const directPromises = directKeys.map((key) => 
      fetchTextRecord(provider, resolverCache, ensName, key).then((value) => ({ key, value }))
    )
    
    const directResults = await Promise.all(directPromises)
    directResults.forEach(({ key, value }) => {
      if (value) {
        records[key as keyof TextRecords] = value
      }
    })

    // Step 2: Fetch fallback records with parent fallback (sequential)
    const fallbackKeys = ['url', 'category', 'license', 'docs', 'audits']
    const domainChain = [ensName, ...getParentDomains(ensName)]
    
    for (const key of fallbackKeys) {
      for (const domain of domainChain) {
        const value = await fetchTextRecord(provider, resolverCache, domain, key)
        if (value) {
          records[key as keyof TextRecords] = value
          break // Stop once found
        }
      }
    }

    return records
  } catch (error) {
    console.error('[API] Error fetching text records:', error)
    return records
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
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
