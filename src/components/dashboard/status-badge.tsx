'use client'

import { cn } from '@/src/lib/utils'
import type { ContractStatus } from '@/src/types/contracts'

const statusConfig: Record<
  ContractStatus,
  { label: string; className: string; dot: string }
> = {
  named: {
    label: 'Named',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
    dot: 'bg-green-500',
  },
  unnamed: {
    label: 'Unnamed',
    className: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    dot: 'bg-yellow-500 animate-pulse',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
    dot: 'bg-red-500',
  },
}

interface StatusBadgeProps {
  status: ContractStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
