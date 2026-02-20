/**
 * Single source of truth for all chain configuration.
 * Import chain display metadata, wagmi chain objects, viem chain map, and chain ID arrays from here.
 */

import {
  mainnet,
  sepolia,
  linea,
  lineaSepolia,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  scroll,
  scrollSepolia,
} from 'wagmi/chains'
import type { Chain } from 'viem'
import { CHAINS } from '@/utils/constants'

// ─── Wagmi Chains Array ────────────────────────────────────────────────────

export const WAGMI_CHAINS = [
  mainnet,
  linea,
  base,
  optimism,
  arbitrum,
  scroll,
  sepolia,
  lineaSepolia,
  baseSepolia,
  optimismSepolia,
  arbitrumSepolia,
  scrollSepolia,
] as const

export type SupportedChain = (typeof WAGMI_CHAINS)[number]

// ─── Chain Display Config ──────────────────────────────────────────────────

export interface ChainOption {
  id: CHAINS
  name: string
  logo: string
  isTestnet: boolean
}

export const CHAIN_OPTIONS: ChainOption[] = [
  { id: CHAINS.MAINNET, name: 'Ethereum', logo: '/images/ethereum.svg', isTestnet: false },
  { id: CHAINS.LINEA, name: 'Linea Mainnet', logo: '/images/linea.svg', isTestnet: false },
  { id: CHAINS.BASE, name: 'Base Mainnet', logo: '/images/base.svg', isTestnet: false },
  { id: CHAINS.OPTIMISM, name: 'Optimism Mainnet', logo: '/images/optimism.svg', isTestnet: false },
  { id: CHAINS.ARBITRUM, name: 'Arbitrum Mainnet', logo: '/images/arbitrum.svg', isTestnet: false },
  { id: CHAINS.SCROLL, name: 'Scroll Mainnet', logo: '/images/scroll.svg', isTestnet: false },
  { id: CHAINS.SEPOLIA, name: 'Sepolia Testnet', logo: '/images/ethereum.svg', isTestnet: true },
  { id: CHAINS.LINEA_SEPOLIA, name: 'Linea Sepolia', logo: '/images/linea.svg', isTestnet: true },
  { id: CHAINS.BASE_SEPOLIA, name: 'Base Sepolia', logo: '/images/base.svg', isTestnet: true },
  { id: CHAINS.OPTIMISM_SEPOLIA, name: 'Optimism Sepolia', logo: '/images/optimism.svg', isTestnet: true },
  { id: CHAINS.ARBITRUM_SEPOLIA, name: 'Arbitrum Sepolia', logo: '/images/arbitrum.svg', isTestnet: true },
  { id: CHAINS.SCROLL_SEPOLIA, name: 'Scroll Sepolia', logo: '/images/scroll.svg', isTestnet: true },
]

export function getChainOption(chainId: number): ChainOption | undefined {
  return CHAIN_OPTIONS.find((c) => c.id === chainId)
}

// ─── L2 Chain Names (for BatchNaming) ─────────────────────────────────────

export const L2_CHAIN_NAMES = ['Optimism', 'Arbitrum', 'Scroll', 'Base', 'Linea'] as const
export type L2ChainName = (typeof L2_CHAIN_NAMES)[number]

// ─── Chain ID Sets ─────────────────────────────────────────────────────────

export const L2_MAINNET_CHAIN_IDS: CHAINS[] = [
  CHAINS.OPTIMISM,
  CHAINS.ARBITRUM,
  CHAINS.SCROLL,
  CHAINS.BASE,
  CHAINS.LINEA,
]

export const L2_TESTNET_CHAIN_IDS: CHAINS[] = [
  CHAINS.OPTIMISM_SEPOLIA,
  CHAINS.ARBITRUM_SEPOLIA,
  CHAINS.SCROLL_SEPOLIA,
  CHAINS.BASE_SEPOLIA,
  CHAINS.LINEA_SEPOLIA,
]

export const L2_CHAIN_IDS: CHAINS[] = [...L2_MAINNET_CHAIN_IDS, ...L2_TESTNET_CHAIN_IDS]

// ─── Viem Chain Map ──────────────────────────────────────────────────────

export const VIEM_CHAIN_MAP: Record<number, Chain> = {
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

export function getViemChain(chainId: number): Chain {
  return VIEM_CHAIN_MAP[chainId] ?? mainnet
}
