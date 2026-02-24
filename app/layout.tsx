import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'
import { Providers } from './providers'
import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Give your smart contracts on Ethereum an identity with Enscribe. Powered by ENS.',
  description: 'Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks.',
  keywords: 'smart, contract, naming, naming smart contracts, web3, blockchain, ens, Ethereum Name Service, Ethereum, smart contracts, Enscribe, UX, smart contract deployment',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Enscribe - Name your smart contracts',
    description: 'Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks.',
    type: 'website',
    url: 'https://www.enscribe.xyz',
    images: [{ url: 'https://www.enscribe.xyz/img/social-card.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Enscribe - Name your smart contracts',
    description: 'Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks.',
    images: ['https://www.enscribe.xyz/img/social-card.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://www.enscribe.xyz/" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org/',
              '@type': 'Organization',
              name: 'Enscribe',
              url: 'https://www.enscribe.xyz/',
              logo: 'https://www.enscribe.xyz/img/logo.svg',
              description: 'Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks.',
            }),
          }}
        />
      </head>
      <body className="antialiased font-sans">
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
        <ClerkProvider
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: 'hsl(243, 75%, 59%)',
            },
          }}
        >
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
