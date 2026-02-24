import React from 'react'
import type { ContractStatus, OperationStatus } from '@/types/contracts'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: ContractStatus | OperationStatus
  className?: string
}

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  named: 'bg-success/10 text-success',
  confirmed: 'bg-success/10 text-success',
  failed: 'bg-destructive/10 text-destructive',
}

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  named: 'Named',
  confirmed: 'Confirmed',
  failed: 'Failed',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        statusStyles[status] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  )
}
