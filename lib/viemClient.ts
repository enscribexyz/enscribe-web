/**
 * Pure (non-React) viem PublicClient factory with caching.
 * Usable in any context: React components, hooks, API routes, pure utilities.
 */
import { createPublicClient, http, type PublicClient } from 'viem'
import { VIEM_CHAIN_MAP } from './chains'
import { CONTRACTS } from '@/utils/constants'

const clientCache = new Map<number, PublicClient>()

export function getPublicClient(chainId: number): PublicClient | undefined {
  if (clientCache.has(chainId)) return clientCache.get(chainId)!

  const config = CONTRACTS[chainId]
  if (!config?.RPC_ENDPOINT) return undefined

  const client = createPublicClient({
    chain: VIEM_CHAIN_MAP[chainId],
    transport: http(config.RPC_ENDPOINT),
  }) as PublicClient

  clientCache.set(chainId, client)
  return client
}
