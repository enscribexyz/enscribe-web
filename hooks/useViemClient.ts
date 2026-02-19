/**
 * Returns a viem PublicClient for the currently-connected chain (or a given chainId).
 * Replaces `new ethers.JsonRpcProvider()` created fresh on every call in 5+ locations.
 */
import { useMemo } from 'react'
import { useChainId } from 'wagmi'
import { createPublicClient, http } from 'viem'
import type { PublicClient, Chain } from 'viem'
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  linea,
  lineaSepolia,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  scroll,
  scrollSepolia,
} from 'viem/chains'
import { CHAINS, CONTRACTS } from '@/utils/constants'

const VIEM_CHAIN_MAP: Record<number, Chain> = {
  [CHAINS.MAINNET]: mainnet,
  [CHAINS.SEPOLIA]: sepolia,
  [CHAINS.BASE]: base,
  [CHAINS.BASE_SEPOLIA]: baseSepolia,
  [CHAINS.LINEA]: linea,
  [CHAINS.LINEA_SEPOLIA]: lineaSepolia,
  [CHAINS.OPTIMISM]: optimism,
  [CHAINS.OPTIMISM_SEPOLIA]: optimismSepolia,
  [CHAINS.ARBITRUM]: arbitrum,
  [CHAINS.ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [CHAINS.SCROLL]: scroll,
  [CHAINS.SCROLL_SEPOLIA]: scrollSepolia,
}

export function useViemClient(chainId?: number): PublicClient | undefined {
  const connectedChainId = useChainId()
  const id = chainId ?? connectedChainId

  return useMemo(() => {
    const config = id ? CONTRACTS[id] : undefined
    if (!config?.RPC_ENDPOINT) return undefined

    return createPublicClient({
      chain: id ? VIEM_CHAIN_MAP[id] : undefined,
      transport: http(config.RPC_ENDPOINT),
    }) as PublicClient
  }, [id])
}
