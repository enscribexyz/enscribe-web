'use client'

import Link from 'next/link'
import { useOrganization } from '@clerk/nextjs'
import {
  FileCode2,
  Tag,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { useOrg } from '@/src/components/providers/org-provider'
import { cn } from '@/src/lib/utils'

export default function OrgOverview() {
  const { organization } = useOrganization()
  const { org, contracts, isLoading } = useOrg()

  const orgSlug = organization?.slug || ''
  const namedCount = contracts.filter((c) => c.status === 'named').length
  const unnamedCount = contracts.filter((c) => c.status === 'unnamed').length
  const pendingCount = contracts.filter((c) => c.status === 'pending').length

  const stats = [
    {
      label: 'Total Contracts',
      value: contracts.length,
      icon: FileCode2,
      color: 'text-foreground',
    },
    {
      label: 'Named',
      value: namedCount,
      icon: CheckCircle2,
      color: 'text-green-500',
    },
    {
      label: 'Unnamed',
      value: unnamedCount,
      icon: AlertCircle,
      color: 'text-yellow-500',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      color: 'text-blue-500',
    },
  ]

  const quickActions = [
    {
      title: 'Add Contract',
      description: 'Add a deployed contract to your inventory',
      href: `/${orgSlug}/contracts?action=add`,
      icon: FileCode2,
    },
    {
      title: 'Assign Name',
      description: 'Assign an ENS name to a contract',
      href: `/${orgSlug}/assign`,
      icon: Tag,
    },
    {
      title: 'Batch Assign',
      description: 'Name multiple contracts at once',
      href: `/${orgSlug}/batch`,
      icon: Layers,
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        {org?.ens_domain && (
          <p className="mt-1 text-sm text-muted-foreground">
            Managing namespace{' '}
            <span className="font-mono font-medium text-foreground">
              {org.ens_domain}
            </span>
            {org.delegation_status === 'delegated' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                Delegated
              </span>
            )}
            {org.delegation_status === 'pending' && (
              <span className="ml-2 inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                Delegation Pending
              </span>
            )}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <stat.icon className={cn('h-5 w-5', stat.color)} />
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>

      {/* Empty state for new orgs */}
      {contracts.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <FileCode2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-sm font-medium">No contracts yet</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Add your first contract to start managing your namespace.
          </p>
          <Link
            href={`/${orgSlug}/contracts?action=add`}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Contract
          </Link>
        </div>
      )}
    </div>
  )
}
