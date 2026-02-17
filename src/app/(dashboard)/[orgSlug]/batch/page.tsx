'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { namehash, type Address } from 'viem'
import {
  Layers,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { shortenAddress } from '@/src/lib/utils'
import { useOrg } from '@/src/components/providers/org-provider'
import { ChainBadge } from '@/src/components/dashboard/chain-badge'
import { EmptyState } from '@/src/components/dashboard/empty-state'
import { TxProgress, type TxStep } from '@/src/components/dashboard/tx-progress'
import { CONTRACTS } from '@/src/lib/blockchain/chains'
import enscribeV2ContractABI from '@/src/contracts/EnscribeV2'
import ensRegistryABI from '@/src/contracts/ENSRegistry'
import type { Contract } from '@/src/types/contracts'

interface BatchEntry {
  contract: Contract
  label: string
  error?: string
}

export default function BatchAssignPage() {
  const { chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { org, contracts, refetchContracts } = useOrg()

  const [entries, setEntries] = useState<BatchEntry[]>([])
  const [showProgress, setShowProgress] = useState(false)
  const [txSteps, setTxSteps] = useState<TxStep[]>([])

  const parentName = org?.ens_domain || ''
  const chainId = org?.ens_domain_chain_id || chain?.id || 1
  const config = CONTRACTS[chainId]

  const unnamedContracts = useMemo(
    () => contracts.filter((c) => c.status === 'unnamed'),
    [contracts],
  )

  const addEntry = (contract: Contract) => {
    if (entries.some((e) => e.contract.id === contract.id)) return
    setEntries((prev) => [...prev, { contract, label: '' }])
  }

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const updateLabel = (index: number, label: string) => {
    setEntries((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              label: label.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              error: undefined,
            }
          : entry,
      ),
    )
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter((l) => l.trim())

      const newEntries: BatchEntry[] = []
      for (const line of lines) {
        const [address, label] = line.split(',').map((s) => s.trim())
        if (!address || !label) continue

        const contract = contracts.find(
          (c) => c.address.toLowerCase() === address.toLowerCase(),
        )
        if (contract) {
          newEntries.push({
            contract,
            label: label.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          })
        }
      }

      if (newEntries.length > 0) {
        setEntries((prev) => [...prev, ...newEntries])
        toast.success(`Added ${newEntries.length} entries from CSV`)
      } else {
        toast.error('No matching contracts found in CSV')
      }
    }
    reader.readAsText(file)
  }

  const validate = (): boolean => {
    let valid = true
    const labels = new Set<string>()

    setEntries((prev) =>
      prev.map((entry) => {
        if (!entry.label) {
          valid = false
          return { ...entry, error: 'Label is required' }
        }
        if (labels.has(entry.label)) {
          valid = false
          return { ...entry, error: 'Duplicate label' }
        }
        labels.add(entry.label)
        return { ...entry, error: undefined }
      }),
    )

    return valid
  }

  const buildSteps = useCallback((): TxStep[] => {
    if (!walletClient || !config || !parentName || entries.length === 0)
      return []

    const steps: TxStep[] = []
    const addresses = entries.map((e) => e.contract.address as Address)
    const labels = entries.map((e) => e.label)

    // Step 1: Grant manager permission to Enscribe V2
    steps.push({
      title: 'Grant manager permission',
      description: `Allow Enscribe to create subnames under ${parentName}`,
      chainId,
      action: async () => {
        const hash = await walletClient.writeContract({
          address: config.ENS_REGISTRY as Address,
          abi: ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_V2_CONTRACT as Address, true],
          chain: walletClient.chain,
          account: walletClient.account,
        })
        return hash
      },
    })

    // Step 2: Batch assign names
    steps.push({
      title: `Assign ${entries.length} names`,
      description: `Create subnames under ${parentName}`,
      chainId,
      action: async () => {
        const hash = await walletClient.writeContract({
          address: config.ENSCRIBE_V2_CONTRACT as Address,
          abi: enscribeV2ContractABI,
          functionName: 'setNameBatch',
          args: [addresses, labels, parentName],
          chain: walletClient.chain,
          account: walletClient.account,
        })
        return hash
      },
    })

    return steps
  }, [walletClient, config, parentName, entries, chainId])

  const handleBatchAssign = () => {
    if (!validate()) return

    const steps = buildSteps()
    if (steps.length === 0) {
      toast.error('Unable to build transaction steps')
      return
    }
    setTxSteps(steps)
    setShowProgress(true)
  }

  const handleTxComplete = async (
    result: 'success' | 'error' | 'cancelled',
  ) => {
    setShowProgress(false)
    if (result === 'success') {
      toast.success(`Successfully assigned ${entries.length} names`)
      await refetchContracts()
      setEntries([])
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Batch Assign
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Assign ENS names to multiple contracts in a single transaction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            <Upload className="h-4 w-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {!parentName && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
          <p className="text-sm text-yellow-400">
            No ENS domain configured. Set up your namespace in Settings first.
          </p>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-2">
        {entries.length > 0 && (
          <div className="rounded-lg border border-border">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 border-b border-border bg-muted/50 px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Contract
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Label
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                Full Name
              </span>
              <span />
            </div>

            {entries.map((entry, index) => (
              <div
                key={entry.contract.id}
                className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <ChainBadge chainId={entry.contract.chain_id} />
                  <span className="font-mono text-sm">
                    {shortenAddress(entry.contract.address, 4)}
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={entry.label}
                    onChange={(e) => updateLabel(index, e.target.value)}
                    placeholder="label"
                    className={cn(
                      'h-8 w-full rounded-md border bg-secondary px-2 font-mono text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring',
                      entry.error ? 'border-red-500' : 'border-input',
                    )}
                  />
                  {entry.error && (
                    <p className="mt-0.5 text-xs text-red-400">
                      {entry.error}
                    </p>
                  )}
                </div>

                <span className="text-xs text-muted-foreground">
                  {entry.label ? `${entry.label}.${parentName}` : '—'}
                </span>

                <button
                  onClick={() => removeEntry(index)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add contracts */}
      {unnamedContracts.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Add unnamed contracts
          </p>
          <div className="flex flex-wrap gap-2">
            {unnamedContracts
              .filter((c) => !entries.some((e) => e.contract.id === c.id))
              .slice(0, 10)
              .map((contract) => (
                <button
                  key={contract.id}
                  onClick={() => addEntry(contract)}
                  className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  <ChainBadge
                    chainId={contract.chain_id}
                    showTestnet={false}
                  />
                  {shortenAddress(contract.address, 4)}
                </button>
              ))}
          </div>
        </div>
      )}

      {entries.length === 0 && (
        <EmptyState
          icon={Layers}
          title="No contracts selected"
          description="Select contracts from your inventory to batch assign names."
        />
      )}

      {/* Submit */}
      {entries.length > 0 && (
        <button
          onClick={handleBatchAssign}
          disabled={!parentName || entries.some((e) => !e.label)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Layers className="h-4 w-4" />
          Assign {entries.length} Name{entries.length !== 1 ? 's' : ''}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}

      {/* Tx Progress */}
      <TxProgress
        open={showProgress}
        onClose={handleTxComplete}
        title="Batch Assigning Names"
        steps={txSteps}
      />
    </div>
  )
}
