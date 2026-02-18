import type { Metadata } from 'next'
import Script from 'next/script'
import { Providers } from './providers'
import '@rainbow-me/rainbowkit/styles.css'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Give your smart contracts on Ethereum an identity with Enscribe. Powered by ENS.',
  description: 'Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks.',
  keywords: 'smart, contract, naming, naming smart contracts, web3, blockchain, ens, Ethereum Name Service, Ethereum, smart contracts, Enscribe, UX, smart contract deployment',
  viewport: 'width=device-width, initial-scale=1',
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
    <html lang="en">
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
      <body className="antialiased">
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
