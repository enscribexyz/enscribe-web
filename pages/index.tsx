import React from 'react'
import Layout from '../components/Layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { FileText, Layers, Rocket, History } from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const features = [
    {
      title: 'Name a Contract',
      description: 'Name your existing smart contracts with ENS names',
      icon: FileText,
      href: '/nameContract',
      color: 'bg-blue-50 dark:bg-blue-950',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Batch Naming',
      description: 'Name multiple contracts at once with ENS names',
      icon: Layers,
      href: '/batchNaming',
      color: 'bg-purple-50 dark:bg-purple-950',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Deploy with Name',
      description: 'Deploy new smart contracts with ENS names',
      icon: Rocket,
      href: '/deploy',
      color: 'bg-green-50 dark:bg-green-950',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'View History',
      description: 'View all contracts you\'ve deployed that can be named',
      icon: History,
      href: '/history',
      color: 'bg-orange-50 dark:bg-orange-950',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
  ]

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-12 max-w-3xl">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center gap-3">
            <svg
              width="40"
              height="40"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <rect width="32" height="32" rx="4" fill="#151A2D" />
              <path
                d="M10 12L6 16L10 20"
                stroke="#4DB8E8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M22 12L26 16L22 20"
                stroke="#4DB8E8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M18 10L14 22"
                stroke="#4DB8E8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Enscribe</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Name your smart contracts
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Link href={feature.href} key={index}>
                <Card className="h-full transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer border-2 hover:border-blue-400 dark:hover:border-blue-600">
                  <CardHeader>
                    <div className="flex items-start space-x-4">
                      <div className={`p-4 rounded-xl ${feature.color}`}>
                        <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                          {feature.title}
                        </CardTitle>
                        <CardDescription className="text-base text-gray-600 dark:text-gray-400">
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

        {/* Info Section */}
        <Card className="w-full max-w-5xl shadow-lg">
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
        </Card>
      </div>
    </Layout>
  )
}
