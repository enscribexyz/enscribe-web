import type { Chain } from 'viem'
import { CHAINS } from '@/utils/constants'
import { type L2ChainName, VIEM_CHAIN_MAP } from './chains'

export interface L2ChainConfig {
  mainnet: CHAINS
  testnet: CHAINS
}

export const L2_CHAIN_CONFIGS: Record<L2ChainName, L2ChainConfig> = {
  Optimism: { mainnet: CHAINS.OPTIMISM, testnet: CHAINS.OPTIMISM_SEPOLIA },
  Arbitrum: { mainnet: CHAINS.ARBITRUM, testnet: CHAINS.ARBITRUM_SEPOLIA },
  Scroll: { mainnet: CHAINS.SCROLL, testnet: CHAINS.SCROLL_SEPOLIA },
  Base: { mainnet: CHAINS.BASE, testnet: CHAINS.BASE_SEPOLIA },
  Linea: { mainnet: CHAINS.LINEA, testnet: CHAINS.LINEA_SEPOLIA },
}

export function getL2ChainId(name: L2ChainName, isMainnet: boolean): number {
  const config = L2_CHAIN_CONFIGS[name]
  return isMainnet ? config.mainnet : config.testnet
}

export function getL2ViemChain(name: L2ChainName, isMainnet: boolean): Chain {
  return VIEM_CHAIN_MAP[getL2ChainId(name, isMainnet)]
}

export function getL2ChainDisplayName(name: L2ChainName, isMainnet: boolean): string {
  return isMainnet ? name : `${name} Sepolia`
}
