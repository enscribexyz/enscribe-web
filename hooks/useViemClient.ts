/**
 * Returns a viem PublicClient for the currently-connected chain (or a given chainId).
 * Replaces `new ethers.JsonRpcProvider()` created fresh on every call in 5+ locations.
 */
import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { createPublicClient, http } from 'viem'
import type { PublicClient } from 'viem'
import { CONTRACTS } from '@/utils/constants'

export function useViemClient(chainId?: number): PublicClient | undefined {
  const connectedChainId = useChainId()
  const id = chainId ?? connectedChainId

  return useMemo(() => {
    const config = id ? CONTRACTS[id] : undefined
    if (!config?.RPC_ENDPOINT) return undefined

    return createPublicClient({
      transport: http(config.RPC_ENDPOINT),
    }) as PublicClient
  }, [id])
}
