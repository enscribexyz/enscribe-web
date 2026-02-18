import React from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
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
import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/globals.css'

const queryClient = new QueryClient()

const chains = WAGMI_CHAINS

export default function MyApp({ Component, pageProps }: AppProps) {
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
      <Head>
        <title>
          Give your smart contracts on Ethereum an identity with Enscribe. Powered by ENS.
        </title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {/* GA4 — loaded after page is interactive */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-ZP0CQ3RP8K"
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-ZP0CQ3RP8K');
      `}</Script>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ThemeAwareRainbowKit>
            <SafeAutoConnect />
            <ChainProvider>
              <TransactionProvider>
                <Component {...pageProps} />
              </TransactionProvider>
            </ChainProvider>
          </ThemeAwareRainbowKit>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
