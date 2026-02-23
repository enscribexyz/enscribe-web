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
import { Skeleton } from '@/components/ui/skeleton'

const queryClient = new QueryClient()
const chains = WAGMI_CHAINS

export function Providers({ children }: { children: React.ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = React.useState<Config | null>(null)
  const [initError, setInitError] = React.useState(false)

  React.useEffect(() => {
    const initWagmi = async () => {
      try {
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
      } catch (err) {
        console.error('Wagmi init failed:', err)
        setInitError(true)
      }
    }

    initWagmi()
  }, [])

  if (initError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <p className="text-foreground font-medium">
            Failed to initialize wallet connection.
          </p>
          <button
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!wagmiConfig) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Sidebar skeleton */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col bg-muted p-4 space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          {/* Header skeleton */}
          <div className="h-16 border-b border-border bg-background flex items-center px-6 gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="flex-1" />
            <Skeleton className="h-8 w-24" />
          </div>
          {/* Page skeleton */}
          <div className="flex-1 p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
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
              <TransactionProvider>{children}</TransactionProvider>
            </ChainProvider>
          </ThemeAwareRainbowKit>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
