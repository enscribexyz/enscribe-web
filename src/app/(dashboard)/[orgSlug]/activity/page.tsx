'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  Tag,
  Layers,
  Shield,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { shortenAddress } from '@/src/lib/utils'
import { useOrg } from '@/src/components/providers/org-provider'
import { ChainBadge } from '@/src/components/dashboard/chain-badge'
import { EmptyState } from '@/src/components/dashboard/empty-state'
import { createClient } from '@/src/lib/supabase/client'
import { CONTRACTS } from '@/src/lib/blockchain/chains'
import type { NamingOperation, OperationType, OperationStatus } from '@/src/types/contracts'
import { formatDistanceToNow } from 'date-fns'

const opTypeConfig: Record<
  OperationType,
  { label: string; icon: typeof Tag; color: string }
> = {
  assign: { label: 'Assign', icon: Tag, color: 'text-blue-400' },
  batch_assign: { label: 'Batch', icon: Layers, color: 'text-purple-400' },
  delegate: { label: 'Delegate', icon: Shield, color: 'text-green-400' },
  revoke: { label: 'Revoke', icon: Shield, color: 'text-red-400' },
}

const statusConfig: Record<
  OperationStatus,
  { label: string; icon: typeof Clock; color: string }
> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-400' },
  submitted: { label: 'Submitted', icon: Loader2, color: 'text-blue-400' },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle2,
    color: 'text-green-400',
  },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-400' },
}

export default function ActivityPage() {
  const { org } = useOrg()
  const [operations, setOperations] = useState<NamingOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | OperationType>('all')

  useEffect(() => {
    if (!org?.id) {
      setLoading(false)
      return
    }

    async function fetchOps() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('naming_operations')
          .select('*')
          .eq('org_id', org!.id)
          .order('created_at', { ascending: false })
          .limit(50)

        setOperations((data as NamingOperation[]) ?? [])
      } catch {
        // Supabase not configured or query failed
      } finally {
        setLoading(false)
      }
    }

    fetchOps()
  }, [org?.id])

  const filteredOps =
    filter === 'all'
      ? operations
      : operations.filter((op) => op.operation_type === filter)

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 w-full animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Audit log of all naming operations for your organization.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {(
          ['all', 'assign', 'batch_assign', 'delegate', 'revoke'] as const
        ).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              filter === value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {value === 'all'
              ? 'All'
              : opTypeConfig[value]?.label || value}
          </button>
        ))}
      </div>

      {/* Operations list */}
      {filteredOps.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Naming operations will appear here as you assign names to your contracts."
        />
      ) : (
        <div className="space-y-2">
          {filteredOps.map((op) => {
            const typeConf = opTypeConfig[op.operation_type]
            const statConf = statusConfig[op.status]
            const chainConfig = CONTRACTS[op.chain_id]
            const TypeIcon = typeConf.icon
            const StatusIcon = statConf.icon

            return (
              <div
                key={op.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md bg-muted',
                    )}
                  >
                    <TypeIcon className={cn('h-4 w-4', typeConf.color)} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {typeConf.label}
                      </span>
                      <ChainBadge chainId={op.chain_id} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(op.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon
                      className={cn(
                        'h-3.5 w-3.5',
                        statConf.color,
                        op.status === 'submitted' && 'animate-spin',
                      )}
                    />
                    <span className={cn('text-xs font-medium', statConf.color)}>
                      {statConf.label}
                    </span>
                  </div>

                  {op.tx_hash && chainConfig?.ETHERSCAN_URL && (
                    <a
                      href={`${chainConfig.ETHERSCAN_URL}/tx/${op.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
