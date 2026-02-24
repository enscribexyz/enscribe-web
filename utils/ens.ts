import { CHAINS, CONTRACTS } from './constants'
import { getEnsName, readContract } from 'viem/actions'
import { namehash } from 'viem/ens'
import L2ReverseRegistrarABI from '@/contracts/L2ReverseRegistrar'
import { getPublicClient } from '@/lib/viemClient'
import type { ENSDomain, TextRecords } from '@/types'

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

const hasMetadataFromContractMetadataApi = async (
  chainId: number,
  apiBaseUrl: string | undefined,
  ensName?: string,
): Promise<boolean> => {
  if (!ensName) return false

  try {
    const metadataPath = `/api/v1/contractMetadata/${chainId}/${encodeURIComponent(ensName)}`
    const metadataUrl = apiBaseUrl ? `${apiBaseUrl}${metadataPath}` : metadataPath

    const response = await fetch(metadataUrl)
    if (!response.ok) return false

    const metadata = (await response.json()) as TextRecords
    return Object.values(metadata).some(
      (value) => typeof value === 'string' && value.trim().length > 0,
    )
  } catch (error) {
    console.error(
      '[fetchForwardNameSummary] Error fetching metadata from contractMetadata API:',
      error,
    )
    return false
  }
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
  apiBaseUrl?: string,
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
      return { count: domains.length, singleNameHasMetadata: false }
    }

    const domain = domains[0]
    const name = typeof domain?.name === 'string' ? domain.name : undefined
    const singleNameHasMetadata = await hasMetadataFromContractMetadataApi(
      chainId,
      apiBaseUrl,
      name,
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

// ─── Owned Domains ────────────────────────────────────────────────────────────

/** Helper to extract 2LD (e.g. "foo.eth") from a full domain name. */
function get2LD(domain: string): string {
  const parts = domain.split('.')
  if (parts.length < 2) return domain
  return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
}

/**
 * Fetches all ENS domains owned by an address via three parallel subgraph queries
 * (owner, registrant, wrappedOwner). Deduplicates, filters, and sorts results
 * by 2LD grouping + depth.
 *
 * Replaces the identical ~120-line fetchUserOwnedDomains function duplicated
 * in NameContract, DeployForm, BatchNamingForm, and ENSDetails.
 *
 * @param options.includeRegistration - If true, also fetches registration data
 *   (expiryDate). ENSDetails needs this; the form components don't.
 * @param options.chainFilter - Optional chain ID for chain-specific filtering
 *   (e.g. Base only shows .base.eth names).
 */
export async function fetchOwnedDomains(
  address: string,
  subgraphApi: string,
  options?: { includeRegistration?: boolean; chainId?: number },
): Promise<ENSDomain[]> {
  const registrationFields = options?.includeRegistration
    ? `registration { expiryDate registrationDate }`
    : ''

  const makeQuery = (filterField: string) =>
    JSON.stringify({
      query: `
        query getDomainsForAccount($address: String!) {
          domains(where: { ${filterField}: $address }) {
            name
            ${registrationFields}
          }
        }
      `,
      variables: { address: address.toLowerCase() },
    })

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
  }

  const [ownerRes, registrantRes, wrappedRes] = await Promise.all([
    fetch(subgraphApi, { method: 'POST', headers, body: makeQuery('owner') }),
    fetch(subgraphApi, { method: 'POST', headers, body: makeQuery('registrant') }),
    fetch(subgraphApi, { method: 'POST', headers, body: makeQuery('wrappedOwner') }),
  ])

  const [ownerData, registrantData, wrappedData] = await Promise.all([
    ownerRes.json(),
    registrantRes.json(),
    wrappedRes.json(),
  ])

  // Deduplicate using a Map (retains first-seen registration data)
  const domainMap = new Map<string, ENSDomain>()
  const allSources = [
    ownerData?.data?.domains,
    registrantData?.data?.domains,
    wrappedData?.data?.domains,
  ]

  for (const domains of allSources) {
    if (!Array.isArray(domains)) continue
    for (const d of domains) {
      if (!d.name || d.name.endsWith('.addr.reverse')) continue
      if (domainMap.has(d.name)) continue

      const domain: ENSDomain = { name: d.name }
      if (d.registration?.expiryDate) {
        domain.expiryDate = Number(d.registration.expiryDate)
      }
      domainMap.set(d.name, domain)
    }
  }

  // Enrich with parent2LD, level, hasLabelhash
  const enriched = Array.from(domainMap.values()).map((domain) => {
    const parts = domain.name.split('.')
    const hasLabelhash = domain.name.includes('[') && domain.name.includes(']')
    return {
      ...domain,
      parent2LD: get2LD(domain.name),
      level: parts.length,
      hasLabelhash,
    }
  })

  // Sort: labelhash last, then by 2LD group, then depth, then alphabetically
  enriched.sort((a, b) => {
    if (a.hasLabelhash && !b.hasLabelhash) return 1
    if (!a.hasLabelhash && b.hasLabelhash) return -1
    if (a.parent2LD !== b.parent2LD) return (a.parent2LD ?? '').localeCompare(b.parent2LD ?? '')
    const aIs2LD = a.name === a.parent2LD
    const bIs2LD = b.name === b.parent2LD
    if (aIs2LD && !bIs2LD) return -1
    if (!aIs2LD && bIs2LD) return 1
    if ((a.level ?? 0) !== (b.level ?? 0)) return (a.level ?? 0) - (b.level ?? 0)
    return a.name.localeCompare(b.name)
  })

  // Chain-specific filtering
  if (options?.chainId === CHAINS.BASE) {
    return enriched.filter((d) => d.name.endsWith('.base.eth'))
  }
  if (options?.chainId === CHAINS.BASE_SEPOLIA) {
    return []
  }

  return enriched
}
