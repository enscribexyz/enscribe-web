'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Activity } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChainBadge } from '@/components/dashboard/chain-badge'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { EmptyState } from '@/components/dashboard/empty-state'
import { useOrg } from '@/components/providers/org-provider'
import { createClient } from '@/lib/supabase/client'
import type { NamingOperation } from '@/types/contracts'

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

const operationLabels: Record<string, string> = {
  assign: 'Assign Name',
  batch: 'Batch Naming',
  delegate: 'Delegate',
  revoke: 'Revoke',
}

export default function ActivityPage() {
  const { orgId } = useOrg()
  const [operations, setOperations] = useState<NamingOperation[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!orgId) return

    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('naming_operations')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })

      setOperations((data as NamingOperation[]) ?? [])
      setLoading(false)
    }

    load()
  }, [orgId])

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      const matchesStatus = statusFilter === 'all' || op.status === statusFilter
      const matchesSearch =
        !search ||
        (op.ens_name && op.ens_name.toLowerCase().includes(search.toLowerCase())) ||
        (op.contract_address &&
          op.contract_address.toLowerCase().includes(search.toLowerCase())) ||
        (op.tx_hash && op.tx_hash.toLowerCase().includes(search.toLowerCase()))
      return matchesStatus && matchesSearch
    })
  }, [operations, statusFilter, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Audit log of all naming operations
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search by name, address, or tx hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Loading activity...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Naming operations will appear here as you assign, batch name, or delegate ENS names."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operation</TableHead>
                <TableHead>ENS Name</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((op) => (
                <TableRow key={op.id}>
                  <TableCell className="font-medium">
                    {operationLabels[op.operation_type] ?? op.operation_type}
                  </TableCell>
                  <TableCell>{op.ens_name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {op.contract_address
                      ? shortenAddress(op.contract_address)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <ChainBadge chainId={op.chain_id} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={op.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(op.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
