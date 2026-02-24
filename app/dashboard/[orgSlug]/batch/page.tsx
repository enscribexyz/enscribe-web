'use client'

import React, { useState, useCallback } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CHAIN_OPTIONS, getChainOption } from '@/lib/chains'
import { CONTRACTS, CHAINS } from '@/utils/constants'
import EnscribeV2ABI from '@/contracts/EnscribeV2'
import { TxProgress, type TxStep } from '@/components/dashboard/tx-progress'
import { useOrg } from '@/components/providers/org-provider'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'
import { Plus, Trash2, Upload, Layers } from 'lucide-react'
import { EmptyState } from '@/components/dashboard/empty-state'

interface BatchEntry {
  id: string
  address: string
  label: string
}

let entryId = 0
function newEntry(): BatchEntry {
  return { id: String(++entryId), address: '', label: '' }
}

export default function BatchNamingPage() {
  const { orgId } = useOrg()
  const { user } = useUser()
  const { address, chain } = useAccount()

  const [entries, setEntries] = useState<BatchEntry[]>([newEntry()])
  const [selectedChainId, setSelectedChainId] = useState<number>(CHAINS.MAINNET)
  const [showProgress, setShowProgress] = useState(false)
  const [steps, setSteps] = useState<TxStep[]>([])

  const { writeContractAsync } = useWriteContract()

  const chainConfig = CONTRACTS[selectedChainId as CHAINS]
  const selectedChain = getChainOption(selectedChainId)

  function addEntry() {
    setEntries((prev) => [...prev, newEntry()])
  }

  function removeEntry(id: string) {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev))
  }

  function updateEntry(id: string, field: 'address' | 'label', value: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    )
  }

  function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.trim().split('\n')
      const parsed: BatchEntry[] = []

      for (const line of lines) {
        const [address, label] = line.split(',').map((s) => s.trim())
        if (address && label) {
          parsed.push({ id: String(++entryId), address, label })
        }
      }

      if (parsed.length > 0) {
        setEntries(parsed)
      }
    }
    reader.readAsText(file)
    // Reset the input so the same file can be re-uploaded
    e.target.value = ''
  }

  const updateStep = useCallback(
    (index: number, update: Partial<TxStep>) => {
      setSteps((prev) =>
        prev.map((s, i) => (i === index ? { ...s, ...update } : s)),
      )
    },
    [],
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !chainConfig) return

    const validEntries = entries.filter(
      (entry) => entry.address && entry.label,
    )
    if (validEntries.length === 0) return

    if (chain?.id !== selectedChainId) return

    const enscribeV2Address = chainConfig.ENSCRIBE_V2_CONTRACT as `0x${string}`
    if (!enscribeV2Address) return

    const explorerUrl = chainConfig.ETHERSCAN_URL

    const addresses = validEntries.map(
      (e) => e.address as `0x${string}`,
    )
    const labels = validEntries.map((e) => e.label)

    setSteps([
      { label: `Batch naming ${validEntries.length} contracts`, status: 'active' },
    ])
    setShowProgress(true)

    try {
      const hash = await writeContractAsync({
        address: enscribeV2Address,
        abi: EnscribeV2ABI,
        functionName: 'setNameBatch',
        args: [addresses, labels],
      })

      updateStep(0, { status: 'complete', txHash: hash, explorerUrl })

      // Log to Supabase
      if (orgId && user?.id) {
        const supabase = createClient()
        await supabase.from('naming_operations').insert({
          org_id: orgId,
          operation_type: 'batch',
          chain_id: selectedChainId,
          ens_name: `${validEntries.length} names`,
          tx_hash: hash,
          status: 'confirmed',
          performed_by: user.id,
        })
      }
    } catch (err) {
      updateStep(0, {
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Transaction failed',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Batch naming</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Name multiple contracts in a single transaction
          </p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Upload className="w-4 h-4 mr-1.5" />
                Upload CSV
              </span>
            </Button>
          </label>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Chain selector */}
        <div className="space-y-2 max-w-xs">
          <label className="text-sm font-medium text-foreground">Chain</label>
          <select
            value={selectedChainId}
            onChange={(e) => setSelectedChainId(Number(e.target.value))}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {CHAIN_OPTIONS.map((chain) => (
              <option key={chain.id} value={chain.id}>
                {chain.name}
              </option>
            ))}
          </select>
          {chain?.id !== selectedChainId && address && (
            <p className="text-xs text-warning">
              Please switch your wallet to {selectedChain?.name ?? 'the selected chain'} to proceed.
            </p>
          )}
        </div>

        {/* Entries */}
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-medium text-muted-foreground px-1">
            <span>Contract Address</span>
            <span>Label (subname)</span>
            <span className="w-9" />
          </div>
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[1fr_1fr_auto] gap-3 items-center"
            >
              <Input
                placeholder="0x..."
                value={entry.address}
                onChange={(e) => updateEntry(entry.id, 'address', e.target.value)}
              />
              <Input
                placeholder="mycontract"
                value={entry.label}
                onChange={(e) => updateEntry(entry.id, 'label', e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeEntry(entry.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addEntry}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Row
          </Button>
        </div>

        <Button
          type="submit"
          disabled={
            !address ||
            chain?.id !== selectedChainId ||
            entries.every((e) => !e.address || !e.label)
          }
        >
          <Layers className="w-4 h-4 mr-1.5" />
          Name {entries.filter((e) => e.address && e.label).length} Contracts
        </Button>
      </form>

      <TxProgress
        steps={steps}
        title="Batch Naming"
        open={showProgress}
        onClose={() => setShowProgress(false)}
      />
    </div>
  )
}
