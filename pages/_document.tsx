import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks." />
        <meta name="keywords" content="smart, contract, naming, naming smart contracts, web3, blockchain, ens, Ethereum Name Service, Ethereum, smart contracts, Enscribe, UX, smart contract deployment" />

        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://www.enscribe.xyz/img/social-card.png" />
        <meta name="twitter:title" content="Enscribe - Name your smart contracts" />
        <meta name="twitter:description" content="Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks." />

        {/* Open Graph meta tags */}
        <meta property="og:image" content="https://www.enscribe.xyz/img/social-card.png" />
        <meta property="og:title" content="Enscribe - Name your smart contracts" />
        <meta property="og:description" content="Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.enscribe.xyz" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://www.enscribe.xyz/" />

        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org/',
              '@type': 'Organization',
              name: 'Enscribe',
              url: 'https://www.enscribe.xyz/',
              logo: 'https://www.enscribe.xyz/img/logo.svg',
              description: 'Easily name your Ethereum smart contracts with ENS names using Enscribe. Live on Ethereum, Base, and Linea networks.'
            })
          }}
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
