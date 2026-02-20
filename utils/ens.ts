import { CHAINS, CONTRACTS } from './constants'
import { getEnsName, readContract } from 'viem/actions'
import { namehash } from 'viem/ens'
import L2ReverseRegistrarABI from '@/contracts/L2ReverseRegistrar'
import { getPublicClient } from '@/lib/viemClient'

/**
 * Safely computes the namehash of an ENS name, returning '' on error.
 * Replaces the identical getParentNode function duplicated in 3 components.
 */
export function getParentNode(name: string): `0x${string}` | '' {
  try {
    return namehash(name)
  } catch {
    return ''
  }
}

const METADATA_TEXT_KEYS = new Set([
  'alias',
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
])

/**
 * Fetches the primary ENS name (reverse resolution) for an address
 * @param addr - The address to look up
 * @param chainId - The chain ID to perform the lookup on
 * @returns The primary ENS name if found, empty string otherwise
 */
export const getENS = async (
  addr: string,
  chainId: number,
): Promise<string> => {
  const config = CONTRACTS[chainId]

  if (!config || !config.RPC_ENDPOINT) {
    console.error(
      `[getENS] Missing RPC endpoint configuration for chainId ${chainId}`,
    )
    return ''
  }

  const client = getPublicClient(chainId)
  if (!client) return ''

  // For mainnet and sepolia, use standard ENS reverse resolution
  if (chainId === CHAINS.MAINNET || chainId === CHAINS.SEPOLIA) {
    try {
      return (
        (await getEnsName(client, { address: addr as `0x${string}` })) || ''
      )
    } catch (error) {
      console.error('[getENS] Error looking up ENS name:', error)
      return ''
    }
  } else if (
    [
      CHAINS.OPTIMISM,
      CHAINS.OPTIMISM_SEPOLIA,
      CHAINS.ARBITRUM,
      CHAINS.ARBITRUM_SEPOLIA,
      CHAINS.SCROLL,
      CHAINS.SCROLL_SEPOLIA,
      CHAINS.BASE,
      CHAINS.BASE_SEPOLIA,
      CHAINS.LINEA,
      CHAINS.LINEA_SEPOLIA,
    ].includes(chainId)
  ) {
    // For L2s, use reverse registrar nameForAddr
    try {
      if (!config?.L2_REVERSE_REGISTRAR) {
        console.error(`[getENS] Missing reverse registrar for chain ${chainId}`)
        return ''
      }

      const name = (await readContract(client, {
        address: config.L2_REVERSE_REGISTRAR as `0x${string}`,
        abi: L2ReverseRegistrarABI,
        functionName: 'nameForAddr',
        args: [addr as `0x${string}`],
      })) as string
      if (name && name.length > 0) return name
    } catch (err) {
      console.error('[getENS] nameForAddr failed:', err)
    }
  }

  // Default fallback
  return ''
}

const shortenENSName = (name: string, maxLength: number = 13): string => {
  if (name.length <= maxLength) return name

  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) return name

  const label = name.slice(0, dotIndex)
  const suffix = name.slice(dotIndex)
  const ellipsis = '...'
  const availableForLabel = maxLength - suffix.length - ellipsis.length

  if (availableForLabel <= 0) return name

  return label.slice(0, availableForLabel) + ellipsis + suffix
}

/**
 * Fetches the count (and optionally a single name) of ENS names that resolve to the given address
 * @param address - The address to look up
 * @param chainId - The chain ID
 * @returns Object with count and optional name (shortened) when count is 1
 */
export const fetchAssociatedNamesCount = async (
  address: string,
  chainId: number,
): Promise<{ count: number; name?: string }> => {
  const config = CONTRACTS[chainId]

  if (!address || !config?.SUBGRAPH_API) return { count: 0 }

  try {
    const domainsResponse = await fetch(config.SUBGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
      },
      body: JSON.stringify({
        query: `
          query GetENSNamesWithExpiry($address: String!) {
            domains(where: { resolvedAddress: $address }) {
              name
              registration {
                expiryDate
                registrationDate
              }
            }
          }
        `,
        variables: {
          address: address.toLowerCase(),
        },
      }),
    })

    const domainsData = await domainsResponse.json()

    if (domainsData.data && domainsData.data.domains) {
      const domains = domainsData.data.domains
      if (domains.length === 1 && domains[0].name) {
        return { count: 1, name: shortenENSName(domains[0].name) }
      }
      return { count: domains.length }
    }
    return { count: 0 }
  } catch (error) {
    console.error(
      '[fetchAssociatedNamesCount] Error fetching associated ENS names:',
      error,
    )
    return { count: 0 }
  }
}

/**
 * Fast summary for BS score calculation.
 * Uses first:2 so we can quickly distinguish 0 / 1 / multiple names.
 */
export const fetchForwardNameSummary = async (
  address: string,
  chainId: number,
): Promise<{
  count: number
  singleName?: string
  singleNameHasMetadata: boolean
}> => {
  const config = CONTRACTS[chainId]

  if (!address || !config?.SUBGRAPH_API) {
    return { count: 0, singleNameHasMetadata: false }
  }

  try {
    const domainsResponse = await fetch(config.SUBGRAPH_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
      },
      body: JSON.stringify({
        query: `
          query GetForwardNameSummary($address: String!) {
            domains(first: 2, where: { resolvedAddress: $address }) {
              name
              resolver {
                texts
              }
            }
          }
        `,
        variables: {
          address: address.toLowerCase(),
        },
      }),
    })

    const domainsData = await domainsResponse.json()
    const domains = domainsData?.data?.domains

    if (!Array.isArray(domains) || domains.length === 0) {
      return { count: 0, singleNameHasMetadata: false }
    }

    if (domains.length > 1) {
      const names = domains
        .map((domain) =>
          typeof domain?.name === 'string' ? domain.name : undefined,
        )
        .filter((name): name is string => Boolean(name))
      return { count: domains.length, singleNameHasMetadata: false }
    }

    const domain = domains[0]
    const name = typeof domain?.name === 'string' ? domain.name : undefined
    const texts = Array.isArray(domain?.resolver?.texts)
      ? (domain.resolver.texts as string[])
      : []
    const singleNameHasMetadata = texts.some((key) =>
      METADATA_TEXT_KEYS.has(key),
    )

    return {
      count: 1,
      singleName: name,
      singleNameHasMetadata,
    }
  } catch (error) {
    console.error(
      '[fetchForwardNameSummary] Error fetching forward name summary:',
      error,
    )
    return { count: 0, singleNameHasMetadata: false }
  }
}
