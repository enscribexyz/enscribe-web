'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useOrganization } from '@clerk/nextjs'
import {
  Plus,
  Search,
  Filter,
  Check,
  Copy,
  Tag,
  Trash2,
  ExternalLink,
  FileCode2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { shortenAddress } from '@/src/lib/utils'
import { useOrg } from '@/src/components/providers/org-provider'
import { ChainBadge } from '@/src/components/dashboard/chain-badge'
import { StatusBadge } from '@/src/components/dashboard/status-badge'
import { EmptyState } from '@/src/components/dashboard/empty-state'
import { AddContractDialog } from '@/src/components/dashboard/add-contract-dialog'
import { CONTRACTS as CHAIN_CONTRACTS } from '@/src/lib/blockchain/chains'
import type { ContractStatus } from '@/src/types/contracts'

type FilterStatus = 'all' | ContractStatus
type FilterChain = 'all' | number

export default function ContractsPage() {
  const { organization } = useOrganization()
  const { contracts, isLoading } = useOrg()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [chainFilter, setChainFilter] = useState<FilterChain>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(
    searchParams?.get('action') === 'add',
  )

  const orgSlug = organization?.slug || ''

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (chainFilter !== 'all' && c.chain_id !== chainFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          c.address.toLowerCase().includes(q) ||
          c.ens_name?.toLowerCase().includes(q) ||
          c.verified_name?.toLowerCase().includes(q) ||
          c.label?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [contracts, statusFilter, chainFilter, search])

  const uniqueChains = useMemo(
    () => [...new Set(contracts.map((c) => c.chain_id))],
    [contracts],
  )

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredContracts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredContracts.map((c) => c.id)))
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    toast.success('Address copied')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-14 w-full animate-pulse rounded-md bg-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Contracts</h1>
        <button
          onClick={() => setAddDialogOpen(true)}
          className="flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Contract
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by address, name, or label..."
            className="h-9 w-full rounded-md border border-input bg-secondary pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          className="h-9 rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-ring"
        >
          <option value="all">All Status</option>
          <option value="named">Named</option>
          <option value="unnamed">Unnamed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>

        {/* Chain filter */}
        {uniqueChains.length > 1 && (
          <select
            value={chainFilter}
            onChange={(e) =>
              setChainFilter(
                e.target.value === 'all' ? 'all' : Number(e.target.value),
              )
            }
            className="h-9 rounded-md border border-input bg-secondary px-3 text-sm text-foreground outline-none focus:border-ring"
          >
            <option value="all">All Chains</option>
            {uniqueChains.map((id) => (
              <option key={id} value={id}>
                {CHAIN_CONTRACTS[id]?.name || `Chain ${id}`}
              </option>
            ))}
          </select>
        )}

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 border-l border-border pl-3">
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
            <a
              href={`/${orgSlug}/batch?contracts=${[...selectedIds].join(',')}`}
              className="flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Tag className="h-3 w-3" />
              Batch Assign
            </a>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          icon={FileCode2}
          title={
            contracts.length === 0 ? 'No contracts yet' : 'No matches found'
          }
          description={
            contracts.length === 0
              ? 'Add your first contract to start managing your namespace.'
              : 'Try adjusting your search or filters.'
          }
          action={
            contracts.length === 0 ? (
              <button
                onClick={() => setAddDialogOpen(true)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Add Contract
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-lg border border-border">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredContracts.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border bg-secondary"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Contract
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Chain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  ENS Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="w-8 px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                  Primary
                </th>
                <th className="w-8 px-4 py-3 text-center text-xs font-medium text-muted-foreground">
                  Forward
                </th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => {
                const chainConfig = CHAIN_CONTRACTS[contract.chain_id]
                return (
                  <tr
                    key={contract.id}
                    className="group border-b border-border last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contract.id)}
                        onChange={() => toggleSelect(contract.id)}
                        className="h-4 w-4 rounded border-border bg-secondary"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyAddress(contract.address)}
                          className="font-mono text-sm text-foreground hover:text-primary"
                          title={contract.address}
                        >
                          {shortenAddress(contract.address, 6)}
                        </button>
                        <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        {contract.verified_name && (
                          <span className="text-xs text-muted-foreground">
                            {contract.verified_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <ChainBadge chainId={contract.chain_id} />
                    </td>
                    <td className="px-4 py-3">
                      {contract.ens_name ? (
                        <span className="font-mono text-sm text-foreground">
                          {contract.ens_name}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          &mdash;
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {contract.primary_name_set ? (
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {contract.forward_resolve_set ? (
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-muted-foreground">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                        {contract.status === 'unnamed' && (
                          <a
                            href={`/${orgSlug}/assign?address=${contract.address}&chain=${contract.chain_id}`}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="Assign name"
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {chainConfig?.ETHERSCAN_URL && (
                          <a
                            href={`${chainConfig.ETHERSCAN_URL}/address/${contract.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                            title="View on explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary */}
      {filteredContracts.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredContracts.length} of {contracts.length} contracts
        </p>
      )}

      {/* Add dialog */}
      <AddContractDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  )
}
