import React, { useState } from 'react'
import Layout from '../components/Layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { FileText, Layers, Rocket, History, Wallet, Search } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SearchModal from '../components/SearchModal'
import { useAccount } from 'wagmi'

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
)

export default function Home() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const { isConnected } = useAccount()
  const features = [
    {
      title: 'Name Contract',
      description: 'Name your existing smart contracts with ENS names',
      icon: FileText,
      href: '/nameContract',
      color: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Deploy Contract',
      description: 'Deploy new smart contracts with ENS names',
      icon: Rocket,
      href: '/deploy',
      color: 'bg-green-50 dark:bg-green-950',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Batch Naming',
      description: 'Name multiple contracts at once with ENS names',
      icon: Layers,
      href: '/batchNaming',
      color: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ]

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12 max-w-3xl">
          <h1 className="text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <rect width="32" height="32" rx="4" className="fill-gray-900" />
              <path
                d="M10 12L6 16L10 20"
                className="stroke-blue-500"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 12L26 16L22 20"
                className="stroke-blue-500"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18 10L14 22"
                className="stroke-blue-500"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-gray-900 dark:text-white">Enscribe</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Name your smart contracts
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link href={feature.href} key={index}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-2 border-border hover:border-ring">
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <div className={`p-4 rounded-xl ${feature.color}`}>
                        <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-bold mb-2">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {feature.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-6 w-full max-w-lg mb-12">
          {/* Connect Wallet Button - only show when not connected */}
          {!isConnected && (
            <>
              <div className="w-full flex justify-center scale-150">
                <ConnectButton 
                  label="Connect Wallet"
                  showBalance={false}
                />
              </div>

              {/* Or divider */}
              <div className="text-muted-foreground text-sm font-medium">
                -or-
              </div>
            </>
          )}

          {/* Explore Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-card hover:bg-accent text-card-foreground rounded-2xl font-semibold text-lg border-2 border-border hover:border-ring transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Search className="w-6 h-6" />
            <span>Explore Contract or Wallet</span>
          </button>
        </div>

        {/* Search Modal */}
        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
        />

        {/* Info Section */}
        {/* <Card className="w-full max-w-5xl shadow-lg">
          <CardContent className="p-8 space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p className="text-lg">
              Enscribe is here to increase trust for users of Ethereum. By
              getting everyone to name their smart contracts with ENS names,
              users stop being confronted with meaningless hex and instead see
              ENS names such as{' '}
              <a
                href="https://app.ens.domains/v0.app.enscribe.eth"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                v0.app.enscribe.eth
              </a>{' '}
              when transacting with an app.
            </p>

            <p className="text-lg">
              Naming contracts is the first step in improving the safety of
              Ethereum for users. Coming soon are verifications to further
              enhance the safety and UX.
            </p>

            <p className="text-lg font-semibold text-gray-900 dark:text-white text-center pt-4">
              Happy naming! 🎉
            </p>
          </CardContent>
        </Card> */}
      </div>
    </Layout>
  )
}
