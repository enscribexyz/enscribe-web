'use client'

import { useState } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { namehash, type Address } from 'viem'
import { OrganizationProfile } from '@clerk/nextjs'
import {
  Settings,
  Globe,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { useOrg } from '@/src/components/providers/org-provider'
import { createClient } from '@/src/lib/supabase/client'
import { CONTRACTS, CHAINS } from '@/src/lib/blockchain/chains'
import { ChainBadge } from '@/src/components/dashboard/chain-badge'
import nameWrapperABI from '@/src/contracts/NameWrapper'
import ensRegistryABI from '@/src/contracts/ENSRegistry'

type Tab = 'namespace' | 'team' | 'delegation'

export default function SettingsPage() {
  const { address: walletAddress } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { org, isAdmin, refetchOrg } = useOrg()

  const [tab, setTab] = useState<Tab>('namespace')
  const [ensDomain, setEnsDomain] = useState(org?.ens_domain || '')
  const [chainId, setChainId] = useState(
    org?.ens_domain_chain_id || CHAINS.MAINNET,
  )
  const [saving, setSaving] = useState(false)
  const [delegating, setDelegating] = useState(false)

  const config = CONTRACTS[chainId]

  const handleSaveNamespace = async () => {
    if (!org || !ensDomain) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('organizations')
        .update({
          ens_domain: ensDomain,
          ens_domain_chain_id: chainId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org.id)

      if (error) {
        toast.error('Failed to save namespace')
        return
      }

      toast.success('Namespace updated')
      await refetchOrg()
    } finally {
      setSaving(false)
    }
  }

  const handleDelegate = async () => {
    if (!walletClient || !config || !ensDomain) return

    setDelegating(true)
    try {
      // Grant approval to Enscribe contract on NameWrapper
      const hash = await walletClient.writeContract({
        address: config.NAME_WRAPPER as Address,
        abi: nameWrapperABI,
        functionName: 'setApprovalForAll',
        args: [config.ENSCRIBE_CONTRACT as Address, true],
        chain: walletClient.chain,
        account: walletClient.account,
      })

      // Update org delegation status
      const supabase = createClient()
      await supabase
        .from('organizations')
        .update({
          delegation_status: 'delegated',
          delegation_tx_hash: hash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', org!.id)

      toast.success('Delegation successful')
      await refetchOrg()
    } catch (err: unknown) {
      const error = err as { code?: number | string }
      if (error?.code === 4001) {
        toast.error('Transaction rejected')
      } else {
        toast.error('Delegation failed')
      }
    } finally {
      setDelegating(false)
    }
  }

  const tabs = [
    { id: 'namespace' as Tab, label: 'Namespace', icon: Globe },
    { id: 'delegation' as Tab, label: 'Delegation', icon: Shield },
    { id: 'team' as Tab, label: 'Team', icon: Users },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization, namespace, and delegation.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Namespace tab */}
      {tab === 'namespace' && (
        <div className="max-w-lg space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold">ENS Namespace</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              The ENS domain under which your contract subnames will be created.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  ENS Domain
                </label>
                <input
                  type="text"
                  value={ensDomain}
                  onChange={(e) => setEnsDomain(e.target.value)}
                  placeholder="yourorg.eth"
                  className="h-10 w-full rounded-md border border-input bg-secondary px-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Chain
                </label>
                <select
                  value={chainId}
                  onChange={(e) => setChainId(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-input bg-secondary px-3 text-sm outline-none focus:border-ring"
                >
                  <option value={CHAINS.MAINNET}>Ethereum Mainnet</option>
                  <option value={CHAINS.SEPOLIA}>Sepolia Testnet</option>
                  <option value={CHAINS.BASE}>Base</option>
                  <option value={CHAINS.OPTIMISM}>Optimism</option>
                  <option value={CHAINS.ARBITRUM}>Arbitrum</option>
                  <option value={CHAINS.LINEA}>Linea</option>
                  <option value={CHAINS.SCROLL}>Scroll</option>
                </select>
              </div>

              <button
                onClick={handleSaveNamespace}
                disabled={saving || !ensDomain || !isAdmin}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save Namespace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegation tab */}
      {tab === 'delegation' && (
        <div className="max-w-lg space-y-6">
          <div className="rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold">Name Delegation</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Grant Enscribe permission to create subnames under your ENS domain.
              This allows your team to assign names without needing access to the
              domain owner wallet.
            </p>

            {org?.delegation_status === 'delegated' ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-500/10 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-400">
                    Delegation Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enscribe can create subnames under {org.ens_domain}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-4">
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-yellow-400">
                      Delegation Required
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Connect the wallet that owns {ensDomain || 'your ENS domain'}{' '}
                      and approve the delegation transaction.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleDelegate}
                  disabled={
                    delegating || !walletAddress || !ensDomain || !config
                  }
                  className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {delegating && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  <Shield className="h-4 w-4" />
                  Delegate to Enscribe
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <div className="overflow-hidden rounded-lg border border-border">
          <OrganizationProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-[hsl(0,0%,7%)] shadow-none border-0',
                header: 'hidden',
                pageScrollBox: 'pt-2 pb-0 px-6 bg-[hsl(0,0%,7%)]',
                page: 'bg-[hsl(0,0%,7%)] gap-6',
                profilePage: 'bg-[hsl(0,0%,7%)] gap-6',
                membersPage: 'bg-[hsl(0,0%,7%)] gap-6',
                profileSection:
                  'border-b border-[hsl(0,0%,15%)] pb-6',
                profileSectionHeader: 'px-0',
                profileSectionContent: 'px-0',
                navbar: 'bg-[hsl(0,0%,7%)]',
                navbarButtons: 'bg-[hsl(0,0%,7%)]',
              },
            }}
          />
        </div>
      )}
    </div>
  )
}
