/**
 * Returns the NetworkConfig for the currently-connected chain (or a given chainId).
 * Replaces the `const config = CONTRACTS[chain?.id]` pattern copy-pasted in every component.
 */
import { useChainId } from 'wagmi'
import { CONTRACTS } from '@/utils/constants'
import type { NetworkConfig } from '@/utils/constants'

export function useChainConfig(chainId?: number): NetworkConfig | undefined {
  const connectedChainId = useChainId()
  const id = chainId ?? connectedChainId
  return id ? CONTRACTS[id] : undefined
}
