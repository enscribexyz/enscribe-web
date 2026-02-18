'use client'

import React from 'react'
import { WagmiProvider } from 'wagmi'
import type { Config } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransactionProvider } from 'ethereum-identity-kit'
import { ThemeProvider } from '@/hooks/useTheme'
import { ThemeAwareRainbowKit } from '@/components/ThemeAwareRainbowKit'
import { SafeAutoConnect } from '@/components/SafeAutoConnect'
import { CONTRACTS, CHAINS } from '@/utils/constants'
import { WAGMI_CHAINS } from '@/lib/chains'
import { ChainProvider } from '@/hooks/useSelectedChain'

const queryClient = new QueryClient()
const chains = WAGMI_CHAINS

export function Providers({ children }: { children: React.ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = React.useState<Config | null>(null)

  React.useEffect(() => {
    const initWagmi = async () => {
      const rainbowkit = await import('@rainbow-me/rainbowkit')
      const { safe } = await import('@wagmi/connectors')
      const { createConfig, http, createStorage } = await import('wagmi')

      const { connectors } = rainbowkit.getDefaultWallets({
        appName: 'enscribe',
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
      })

      const safeConnector = safe({
        allowedDomains: [/app.safe.global$/, /safe.global$/],
        debug: false,
      })

      const config = createConfig({
        chains,
        connectors: [...connectors, safeConnector],
        transports: chains.reduce(
          (acc, chain) => {
            const chainConfig = CONTRACTS[chain.id as CHAINS]
            const rpcUrl = chainConfig?.RPC_ENDPOINT

            if (rpcUrl) {
              acc[chain.id] = http(rpcUrl)
            } else {
              console.warn(`No RPC endpoint configured for chain ${chain.id}`)
              acc[chain.id] = http()
            }
            return acc
          },
          {} as Record<number, ReturnType<typeof http>>,
        ),
        storage: createStorage({
          storage: window.localStorage,
        }),
      })

      setWagmiConfig(config)
    }

    initWagmi()
  }, [])

  if (!wagmiConfig) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col bg-gray-900 dark:bg-gray-950" />
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          {/* Header skeleton */}
          <div className="h-16 border-b border-border bg-background" />
          {/* Page skeleton */}
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="enscribe-theme">
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ThemeAwareRainbowKit>
            <SafeAutoConnect />
            <ChainProvider>
              <TransactionProvider>
                {children}
              </TransactionProvider>
            </ChainProvider>
          </ThemeAwareRainbowKit>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
