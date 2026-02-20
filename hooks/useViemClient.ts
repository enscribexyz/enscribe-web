/**
 * Returns a viem PublicClient for the currently-connected chain (or a given chainId).
 * Thin React wrapper around the pure getPublicClient factory.
 */
import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import type { PublicClient } from 'viem'
import { getPublicClient } from '@/lib/viemClient'

export function useViemClient(chainId?: number): PublicClient | undefined {
  const connectedChainId = useChainId()
  const id = chainId ?? connectedChainId

  return useMemo(() => (id ? getPublicClient(id) : undefined), [id])
}
