'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Tag, Layers, Activity, ArrowRight } from 'lucide-react'
import { useOrg } from '@/components/providers/org-provider'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { Contract, NamingOperation } from '@/types/contracts'

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div>
                <Skeleton className="h-7 w-12" />
                <Skeleton className="h-3 w-20 mt-1" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div>
        <Skeleton className="h-6 w-32 mb-3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card"
            >
              <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-36 mt-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OrgOverviewPage() {
  const { orgId, orgSlug, orgName, isLoaded } = useOrg()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [operations, setOperations] = useState<NamingOperation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orgId) return

    const supabase = createClient()

    async function load() {
      const [contractsRes, opsRes] = await Promise.all([
        supabase
          .from('contracts')
          .select('*')
          .eq('org_id', orgId!)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('naming_operations')
          .select('*')
          .eq('org_id', orgId!)
          .order('created_at', { ascending: false })
          .limit(5),
      ])

      setContracts((contractsRes.data as Contract[]) ?? [])
      setOperations((opsRes.data as NamingOperation[]) ?? [])
      setLoading(false)
    }

    load()
  }, [orgId])

  // Show loading skeleton while Clerk loads or org sync is in progress
  if (!isLoaded || !orgSlug) {
    return <LoadingSkeleton />
  }

  const basePath = `/dashboard/${orgSlug}`
  const namedCount = contracts.filter((c) => c.status === 'named').length
  const pendingOps = operations.filter((o) => o.status === 'pending').length

  const stats = [
    { label: 'Total Contracts', value: contracts.length, icon: FileText },
    { label: 'Named', value: namedCount, icon: Tag },
    { label: 'Pending Ops', value: pendingOps, icon: Activity },
  ]

  const quickActions = [
    {
      label: 'Assign a Name',
      description: 'Attach an ENS name to a contract',
      href: `${basePath}/assign`,
      icon: Tag,
    },
    {
      label: 'Batch Naming',
      description: 'Name multiple contracts at once',
      href: `${basePath}/batch`,
      icon: Layers,
    },
    {
      label: 'View Contracts',
      description: 'Manage your contract inventory',
      href: `${basePath}/contracts`,
      icon: FileText,
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {orgName ?? 'Organization'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your ENS naming operations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? '—' : stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-3 p-4 rounded-xl border border-border bg-card hover:border-ring hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {action.label}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.description}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {operations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Recent activity
            </h2>
            <Link
              href={`${basePath}/activity`}
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {operations.map((op) => (
              <div key={op.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">
                    {op.operation_type}: {op.ens_name ?? op.contract_address}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chain {op.chain_id}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    op.status === 'confirmed'
                      ? 'bg-success/10 text-success'
                      : op.status === 'failed'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-warning/10 text-warning'
                  }`}
                >
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
