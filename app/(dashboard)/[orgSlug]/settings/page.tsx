'use client'

import React, { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useOrg } from '@/components/providers/org-provider'
import { useOrganization } from '@clerk/nextjs'
import { createClient } from '@/lib/supabase/client'
import { CHAIN_OPTIONS } from '@/lib/chains'
import type { Contract } from '@/types/contracts'

export default function SettingsPage() {
  const { orgId, orgName } = useOrg()
  const { organization } = useOrganization()

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization settings
        </p>
      </div>

      <Tabs defaultValue="namespace" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="namespace">Namespace</TabsTrigger>
          <TabsTrigger value="delegation">Delegation</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="namespace" className="mt-6">
          <NamespaceSettings orgId={orgId} />
        </TabsContent>

        <TabsContent value="delegation" className="mt-6">
          <DelegationSettings orgId={orgId} />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamSettings orgName={orgName} memberCount={organization?.membersCount} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NamespaceSettings({ orgId }: { orgId: string | null }) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return

    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('contracts')
        .select('*')
        .eq('org_id', orgId!)
        .eq('status', 'named')

      setContracts((data as Contract[]) ?? [])
      setLoading(false)
    }

    load()
  }, [orgId])

  const chainGroups = CHAIN_OPTIONS.filter((c) => !c.isTestnet)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          ENS namespace configuration
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          View which ENS domains are configured per chain for your organization.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {chainGroups.map((chain) => {
          const chainContracts = contracts.filter(
            (c) => c.chain_id === chain.id,
          )
          return (
            <div
              key={chain.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {chain.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {loading
                  ? '...'
                  : `${chainContracts.length} named contract${chainContracts.length !== 1 ? 's' : ''}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DelegationSettings({ orgId }: { orgId: string | null }) {
  const [delegateAddress, setDelegateAddress] = useState('')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">
          Delegation management
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage addresses that can name contracts on behalf of your
          organization.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <Input
            placeholder="Delegate address (0x...)"
            value={delegateAddress}
            onChange={(e) => setDelegateAddress(e.target.value)}
            className="flex-1"
          />
          <Button disabled={!delegateAddress}>Add Delegate</Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No delegates configured yet. Add a delegate address above to allow
            other wallets to name contracts under your namespace.
          </p>
        </div>
      </div>
    </div>
  )
}

function TeamSettings({
  orgName,
  memberCount,
}: {
  orgName: string | null
  memberCount: number | undefined
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Team</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization members through the Clerk dashboard.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground font-medium">
            Organization
          </span>
          <span className="text-sm text-muted-foreground">
            {orgName ?? '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground font-medium">Members</span>
          <span className="text-sm text-muted-foreground">
            {memberCount ?? '—'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t border-border">
          To invite or remove team members, use the organization switcher in the
          sidebar or visit the Clerk organization settings.
        </p>
      </div>
    </div>
  )
}
