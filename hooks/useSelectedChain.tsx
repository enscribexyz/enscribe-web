/**
 * ChainContext — single source of truth for the user-selected explorer chain.
 * Replaces `selectedChain` state triplicated in Layout, SearchModal, and AddressSearch.
 *
 * Usage:
 *   // In providers: wrap with <ChainProvider>
 *   // In components: const { selectedChain, setSelectedChain } = useSelectedChain()
 */
'use client'

import { createContext, useContext, useState } from 'react'
import type { Dispatch, SetStateAction, ReactNode } from 'react'
import { CHAINS } from '@/utils/constants'

interface ChainContextValue {
  selectedChain: number
  setSelectedChain: Dispatch<SetStateAction<number>>
}

export const ChainContext = createContext<ChainContextValue>({
  selectedChain: CHAINS.MAINNET,
  setSelectedChain: () => {},
})

export function ChainProvider({ children }: { children: ReactNode }) {
  const [selectedChain, setSelectedChain] = useState<number>(CHAINS.MAINNET)
  return (
    <ChainContext.Provider value={{ selectedChain, setSelectedChain }}>
      {children}
    </ChainContext.Provider>
  )
}

export function useSelectedChain(): ChainContextValue {
  return useContext(ChainContext)
}
