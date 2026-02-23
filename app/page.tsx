'use client'

import React, { useState } from 'react'
import Layout from '../components/Layout'
import { FileText, Layers, Rocket, Search, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SearchModal from '../components/SearchModal'
import { motion, type Variants } from 'framer-motion'
import { useAccount } from 'wagmi'

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
)

const features = [
  {
    title: 'Name Contract',
    description: 'Attach an ENS name to any existing smart contract on Ethereum, Base, or Linea.',
    icon: FileText,
    href: '/nameContract',
    accent: 'bg-blue-500/10 text-blue-500',
  },
  {
    title: 'Deploy & Name',
    description: 'Deploy a new smart contract and give it an ENS identity in a single flow.',
    icon: Rocket,
    href: '/deploy',
    accent: 'bg-emerald-500/10 text-emerald-500',
  },
  {
    title: 'Batch Naming',
    description: 'Name dozens of contracts at once — ideal for protocol teams and power users.',
    icon: Layers,
    href: '/batchNaming',
    accent: 'bg-violet-500/10 text-violet-500',
  },
]

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: i * 0.08 },
  }),
}

export default function Home() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const { isConnected } = useAccount()

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col gap-12">

        {/* Hero */}
        <motion.div
          className="text-center flex flex-col items-center gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase">
            Powered by ENS
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
            Give your smart contracts<br className="hidden sm:block" /> a human-readable identity
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
            Enscribe lets you attach ENS names to smart contracts on Ethereum, Base, and Linea — making on-chain interactions transparent and trustworthy.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-1 w-full max-w-md">
            {!isConnected ? (
              <div className="w-full sm:w-auto flex justify-center">
                <ConnectButton label="Connect Wallet" showBalance={false} />
              </div>
            ) : (
              <Link
                href="/nameContract"
                className="w-full sm:min-w-[140px] sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium text-sm transition-colors"
              >
                Get started
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full sm:min-w-[140px] sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-muted hover:bg-accent text-muted-foreground hover:text-accent-foreground rounded-lg font-medium text-sm border border-border hover:border-ring transition-colors"
            >
              <Search className="w-4 h-4" />
              Explore
            </button>
          </div>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.href}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                <Link
                  href={feature.href}
                  className="group flex flex-col gap-4 p-5 rounded-xl border border-border bg-card hover:border-ring hover:shadow-md transition-all duration-200 h-full"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${feature.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground">{feature.title}</span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

      </div>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </Layout>
  )
}
