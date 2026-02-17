import { createPublicClient, http, type Address } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'
import { CHAINS, CONTRACTS, isL2Chain } from '@/src/lib/blockchain/chains'

const nameForAddrAbi = [
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'nameForAddr',
    outputs: [{ internalType: 'string', name: 'name', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

function getViemChain(chainId: number) {
  if (chainId === 1) return mainnet
  if (chainId === 11155111) return sepolia
  return undefined
}

export async function getENS(
  addr: string,
  chainId: number,
): Promise<string> {
  const config = CONTRACTS[chainId]
  if (!config?.RPC_ENDPOINT) return ''

  // For mainnet and Sepolia, use standard ENS reverse resolution via viem
  if (chainId === CHAINS.MAINNET || chainId === CHAINS.SEPOLIA) {
    try {
      const chain = getViemChain(chainId)
      if (!chain) return ''
      const client = createPublicClient({
        chain,
        transport: http(config.RPC_ENDPOINT),
      })
      const name = await client.getEnsName({ address: addr as Address })
      return name || ''
    } catch {
      return ''
    }
  }

  // For L2s, use L2 reverse registrar nameForAddr
  if (isL2Chain(chainId)) {
    try {
      if (!config.L2_REVERSE_REGISTRAR) return ''
      const client = createPublicClient({
        transport: http(config.RPC_ENDPOINT),
      })
      const name = await client.readContract({
        address: config.L2_REVERSE_REGISTRAR as Address,
        abi: nameForAddrAbi,
        functionName: 'nameForAddr',
        args: [addr as Address],
      })
      return name && name.length > 0 ? name : ''
    } catch {
      return ''
    }
  }

  return ''
}

export async function fetchAssociatedNamesCount(
  address: string,
  chainId: number,
): Promise<{ count: number; name?: string }> {
  const config = CONTRACTS[chainId]
  if (!address || !config?.SUBGRAPH_API) return { count: 0 }

  try {
    const response = await fetch(config.SUBGRAPH_API, {
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
        variables: { address: address.toLowerCase() },
      }),
    })

    const data = await response.json()
    if (data.data?.domains) {
      const domains = data.data.domains
      if (domains.length === 1 && domains[0].name) {
        return { count: 1, name: domains[0].name }
      }
      return { count: domains.length }
    }
    return { count: 0 }
  } catch {
    return { count: 0 }
  }
}
