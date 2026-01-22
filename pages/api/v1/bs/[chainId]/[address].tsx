import { CHAINS, CONTRACTS } from '@/utils/constants'
import { ethers } from 'ethers'

import type { NextApiRequest, NextApiResponse } from 'next'

const shortenENSName = (name: string, maxLength: number = 13): string => {
  if (name.length <= maxLength) return name
  
  // Extract the suffix (e.g., ".eth")
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex === -1) return name
  
  const label = name.slice(0, dotIndex)
  const suffix = name.slice(dotIndex) // includes the dot, e.g., ".eth"
  
  const ellipsis = '...'
  const availableForLabel = maxLength - suffix.length - ellipsis.length
  
  if (availableForLabel <= 0) return name
  
  return label.slice(0, availableForLabel) + ellipsis + suffix
}

const fetchAssociatedNamesCount = async (address: string, chainId: number): Promise<{ count: number, name?: string }> => {
    const config = CONTRACTS[chainId]

    if (!address || !config?.SUBGRAPH_API) return { count: 0 }

    try {
      console.log(`[ENSDetails] Fetching associated ENS names for ${address}`)

      // Fetch domains with their registration data in a single query
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
      } else {
        return { count: 0 }
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching associated ENS names:', error)
      return { count: 0 }
    }
}

const getENS = async (addr: string, chainId: number): Promise<string> => {
  const config = CONTRACTS[chainId]

  if (!config || !config.RPC_ENDPOINT) {
    console.error(
      `[address][getENS] Missing RPC endpoint configuration for chainId ${chainId}`,
    )
    return ''
  }

  const provider = new ethers.JsonRpcProvider(config.RPC_ENDPOINT)

  // Use the effectiveChainId instead of chain?.id to ensure we're using the correct chain
  // for ENS lookups even when the wallet is not connected
  if (chainId === CHAINS.MAINNET || chainId === CHAINS.SEPOLIA) {
    try {
      // console.log(
      //   `[address] Looking up ENS name for ${addr} on chain ${chainId}`,
      // )
      return (await provider.lookupAddress(addr)) || ''
    } catch (error) {
      console.error('[address] Error looking up ENS name:', error)
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
    // For L2s, use reverse registrar nameForAddr.

    try {
      // console.log(
      //   `[address] Looking up ENS name via reverse registrar nameForAddr for ${addr} on chain ${chainId}`,
      // )

      if (!config?.L2_REVERSE_REGISTRAR) {
        console.error(
          `[address] Missing reverse registrar for chain ${chainId}`,
        )
        return ''
      }

      const nameForAddrABI = [
        {
          inputs: [
            { internalType: 'address', name: 'addr', type: 'address' },
          ],
          name: 'nameForAddr',
          outputs: [{ internalType: 'string', name: 'name', type: 'string' }],
          stateMutability: 'view',
          type: 'function',
        },
      ]

      const rr = new ethers.Contract(
        config.L2_REVERSE_REGISTRAR,
        nameForAddrABI,
        provider,
      )
      const name = (await rr.nameForAddr(addr)) as string
      // console.log(`[address] nameForAddr result for ${addr}: ${name}`)
      if (name && name.length > 0) return name
    } catch (err) {
      console.error('[address] nameForAddr failed:', err)
    }
  }

  // Default fallback
  return ''
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { chainId, address } = req.query

  const chainIdNum = Number(chainId)

  if (!chainId || Number.isNaN(chainIdNum)) {
    return res
      .status(400)
      .json({ error: `Invalid chainId parameter: ${String(chainId)}` })
  }

  if (!address || typeof address !== 'string') {
    return res
      .status(400)
      .json({ error: `Invalid address parameter: ${String(address)}` })
  }

  const primaryENS = await getENS(address as string, chainIdNum)

  if (primaryENS) {
    return res.status(200).json({ label: 'View Metadata' })
  } else {
    const { count, name } = await fetchAssociatedNamesCount(address as string, chainIdNum)
    if (count > 0) {
      return res.status(200).json({ label: count === 1 ? `${name}` : `⚠️ ${count} Names`})
    } else {
      return res.status(404).json({ label: '❌ Set ENS' })
    }
  }
}
