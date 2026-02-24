'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { FileText, Search } from 'lucide-react'
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
import { AddContractDialog } from '@/components/dashboard/add-contract-dialog'
import { useOrg } from '@/components/providers/org-provider'
import { createClient } from '@/lib/supabase/client'
import type { Contract } from '@/types/contracts'
import { CHAIN_OPTIONS } from '@/lib/chains'

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function ContractsPage() {
  const { orgId } = useOrg()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [chainFilter, setChainFilter] = useState<number | 'all'>('all')

  async function loadContracts() {
    if (!orgId) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    setContracts((data as Contract[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadContracts()
  }, [orgId])

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const matchesSearch =
        !search ||
        c.address.toLowerCase().includes(search.toLowerCase()) ||
        (c.ens_name && c.ens_name.toLowerCase().includes(search.toLowerCase()))
      const matchesChain = chainFilter === 'all' || c.chain_id === chainFilter
      return matchesSearch && matchesChain
    })
  }, [contracts, search, chainFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization&apos;s smart contracts
          </p>
        </div>
        <AddContractDialog onContractAdded={loadContracts} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={chainFilter}
          onChange={(e) =>
            setChainFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">All Chains</option>
          {CHAIN_OPTIONS.map((chain) => (
            <option key={chain.id} value={chain.id}>
              {chain.name}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Loading contracts...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contracts found"
          description={
            contracts.length === 0
              ? 'Add your first contract to start naming it with ENS.'
              : 'No contracts match your current filters.'
          }
          action={
            contracts.length === 0 ? (
              <AddContractDialog onContractAdded={loadContracts} />
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ENS Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Chain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.ens_name ?? '—'}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {shortenAddress(contract.address)}
                  </TableCell>
                  <TableCell>
                    <ChainBadge chainId={contract.chain_id} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={contract.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(contract.created_at).toLocaleDateString()}
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
