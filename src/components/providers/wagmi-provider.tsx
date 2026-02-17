'use client'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { injected } from 'wagmi/connectors'
import { SUPPORTED_CHAINS, CONTRACTS } from '@/src/lib/blockchain/chains'
import type { Chain } from 'wagmi/chains'
import { useState } from 'react'

function buildTransports() {
  const transports: Record<number, ReturnType<typeof http>> = {}
  for (const chain of SUPPORTED_CHAINS) {
    const config = CONTRACTS[chain.id]
    if (config?.RPC_ENDPOINT) {
      transports[chain.id] = http(config.RPC_ENDPOINT)
    } else {
      transports[chain.id] = http()
    }
  }
  return transports
}

const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS as [Chain, ...Chain[]],
  connectors: [injected()],
  transports: buildTransports(),
  ssr: true,
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      }),
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
