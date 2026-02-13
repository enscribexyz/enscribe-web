import React, { useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAccount } from 'wagmi'
import Layout from '@/components/Layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import SearchModal from '@/components/SearchModal'
import {
  Blocks,
  FileText,
  LayoutDashboard,
  Layers,
  Rocket,
  Search,
  ShieldCheck,
  Zap,
} from 'lucide-react'

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
)

export default function Home() {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const { isConnected } = useAccount()

  const products = [
    {
      title: 'Identity Workspace',
      description:
        'Manage orgs, projects, contract inventory, and ENS delegation in one platform.',
      icon: LayoutDashboard,
      href: '/workspace',
      style:
        'bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white border-0',
      iconStyle: 'text-cyan-200',
      cta: 'Open Workspace',
    },
    {
      title: 'Name Existing Contracts',
      description: 'Assign ENS names to deployed contracts in a guided flow.',
      icon: FileText,
      href: '/nameContract',
      style: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900',
      iconStyle: 'text-blue-600 dark:text-blue-300',
      cta: 'Name Contract',
    },
    {
      title: 'Deploy + Name',
      description:
        'Deploy contracts and attach identity as part of your deployment workflow.',
      icon: Rocket,
      href: '/deploy',
      style: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900',
      iconStyle: 'text-emerald-600 dark:text-emerald-300',
      cta: 'Deploy Contract',
    },
    {
      title: 'Batch Naming',
      description: 'Queue multiple naming actions and execute them efficiently.',
      icon: Layers,
      href: '/batchNaming',
      style: 'bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-900',
      iconStyle: 'text-orange-600 dark:text-orange-300',
      cta: 'Batch Name',
    },
  ]

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-8 py-4">
        <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-white/15 text-white">
                ENS Contract Identity
              </Badge>
              <Badge variant="secondary" className="bg-white/15 text-white">
                Enterprise-ready UX
              </Badge>
              <Badge variant="secondary" className="bg-white/15 text-white">
                Batched Transactions
              </Badge>
            </div>

            <CardTitle className="text-4xl md:text-5xl font-semibold leading-tight">
              Enscribe is your contract identity cloud
            </CardTitle>
            <CardDescription className="text-slate-200 max-w-3xl text-base">
              Delegate ENS manager permissions, map names to contracts across
              projects, and operate naming as part of your deployment lifecycle.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <ShieldCheck className="h-4 w-4" /> Identity integrity
              </div>
              <p className="mt-2 text-sm">
                Clear ownership boundaries using ENS delegation and auditable actions.
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Zap className="h-4 w-4" /> Single signing flow
              </div>
              <p className="mt-2 text-sm">
                Queue and batch operations so teams spend less time approving wallets.
              </p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <Blocks className="h-4 w-4" /> Project inventory
              </div>
              <p className="mt-2 text-sm">
                Track every deployment, chain, and assigned ENS identity centrally.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => {
            const Icon = product.icon

            return (
              <Link key={product.title} href={product.href}>
                <Card
                  className={`h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${product.style}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle
                          className={`text-xl ${product.href === '/workspace' ? 'text-white' : ''}`}
                        >
                          {product.title}
                        </CardTitle>
                        <CardDescription
                          className={`mt-2 ${product.href === '/workspace' ? 'text-slate-200' : ''}`}
                        >
                          {product.description}
                        </CardDescription>
                      </div>
                      <Icon className={`h-7 w-7 ${product.iconStyle}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant={product.href === '/workspace' ? 'secondary' : 'outline'}
                      className="w-full"
                    >
                      {product.cta}
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Explore any address</CardTitle>
            <CardDescription>
              Search for a smart contract or wallet to inspect ENS-linked identity details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isConnected ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  Connect a wallet to unlock account-specific workflows.
                </p>
                <ConnectButton label="Connect Wallet" showBalance={false} />
              </div>
            ) : null}

            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              onClick={() => setIsSearchModalOpen(true)}
            >
              <Search className="h-4 w-4" /> Explore Contract or Wallet
            </Button>
          </CardContent>
        </Card>

        <SearchModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
        />
      </div>
    </Layout>
  )
}
