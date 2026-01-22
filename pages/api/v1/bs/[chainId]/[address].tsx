import { CHAINS, CONTRACTS } from '@/utils/constants'
import { ethers } from 'ethers'

import type { NextApiRequest, NextApiResponse } from 'next'

const fetchAssociatedNamesCount = async (address: string, chainId: number): Promise<number> => {
    const config = CONTRACTS[chainId]

    if (!address || !config?.SUBGRAPH_API) return 0

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
        return domainsData.data.domains.length
      } else {
        return 0
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching associated ENS names:', error)
      return 0
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
    const associatedNamesCount = await fetchAssociatedNamesCount(address as string, chainIdNum)
    if (associatedNamesCount > 0) {
      return res.status(200).json({ label: associatedNamesCount === 1 ? '1 Name' : `${associatedNamesCount} Names`})
    } else {
      return res.status(404).json({ label: 'Set Name' })
    }
  }
}
