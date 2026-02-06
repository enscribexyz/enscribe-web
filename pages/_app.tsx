import React from 'react'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import { WagmiProvider } from 'wagmi'
import type { Config } from 'wagmi'
import {
  sepolia,
  lineaSepolia,
  baseSepolia,
  mainnet,
  base,
  linea,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  scroll,
  scrollSepolia,
} from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TransactionProvider } from 'ethereum-identity-kit'
import { ThemeProvider } from '@/hooks/useTheme'
import { ThemeAwareRainbowKit } from '@/components/ThemeAwareRainbowKit'
import { SafeAutoConnect } from '@/components/SafeAutoConnect'
import { CONTRACTS, CHAINS } from '@/utils/constants'
import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/globals.css'

const queryClient = new QueryClient()

const chains = [
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

export default function MyApp({ Component, pageProps }: AppProps) {
  const [wagmiConfig, setWagmiConfig] = React.useState<Config | null>(null)

  React.useEffect(() => {
    // Initialize wagmi config on client side only
    const initWagmi = async () => {
      const rainbowkit = await import('@rainbow-me/rainbowkit')
      const { safe } = await import('@wagmi/connectors')
      const { createConfig, http, createStorage } = await import('wagmi')

      // Get RainbowKit connector functions
      const { connectors } = rainbowkit.getDefaultWallets({
        appName: 'enscribe',
        projectId: '6dfc28e3bd034be8e0d5ceaf0ee5c224',
      })

      // Create Safe connector
      const safeConnector = safe({
        allowedDomains: [/app.safe.global$/, /safe.global$/],
        debug: false,
      })

      // Create wagmi config with all connectors + localStorage for reconnection
      // Use explicit RPC endpoints to avoid eth.merkle.io rate limiting
      const config = createConfig({
        chains,
        connectors: [...connectors, safeConnector],
        transports: chains.reduce(
          (acc, chain) => {
            // Get RPC endpoint from CONTRACTS config
            const chainConfig = CONTRACTS[chain.id as CHAINS]
            const rpcUrl = chainConfig?.RPC_ENDPOINT
            
            if (rpcUrl) {
              acc[chain.id] = http(rpcUrl)
            } else {
              console.warn(`No RPC endpoint configured for chain ${chain.id}`)
              acc[chain.id] = http() // Fallback to default
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

  // Don't render until wagmi config is ready
  if (!wagmiConfig) {
    return null
  }

  return (
    <ThemeProvider defaultTheme="system" storageKey="enscribe-theme">
      <Head>
        <title>Give your smart contracts on Ethereum an identity with Enscribe. Powered by ENS.</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ThemeAwareRainbowKit>
            <SafeAutoConnect />
            <TransactionProvider>
              <Component {...pageProps} />
            </TransactionProvider>
          </ThemeAwareRainbowKit>
        </WagmiProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
