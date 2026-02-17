'use client'

import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { isAddress, getAddress } from 'viem'
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { useOrg } from '@/src/components/providers/org-provider'
import { createClient } from '@/src/lib/supabase/client'
import { CHAINS, CONTRACTS } from '@/src/lib/blockchain/chains'
import { ChainBadge } from './chain-badge'

interface AddContractDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const chainOptions = [
  { id: CHAINS.MAINNET, label: 'Ethereum' },
  { id: CHAINS.SEPOLIA, label: 'Sepolia' },
  { id: CHAINS.BASE, label: 'Base' },
  { id: CHAINS.BASE_SEPOLIA, label: 'Base Sepolia' },
  { id: CHAINS.OPTIMISM, label: 'Optimism' },
  { id: CHAINS.OPTIMISM_SEPOLIA, label: 'OP Sepolia' },
  { id: CHAINS.ARBITRUM, label: 'Arbitrum' },
  { id: CHAINS.ARBITRUM_SEPOLIA, label: 'Arb Sepolia' },
  { id: CHAINS.LINEA, label: 'Linea' },
  { id: CHAINS.LINEA_SEPOLIA, label: 'Linea Sepolia' },
  { id: CHAINS.SCROLL, label: 'Scroll' },
  { id: CHAINS.SCROLL_SEPOLIA, label: 'Scroll Sepolia' },
]

export function AddContractDialog({
  open,
  onOpenChange,
}: AddContractDialogProps) {
  const { org, refetchContracts } = useOrg()
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState<number>(CHAINS.MAINNET)
  const [verifying, setVerifying] = useState(false)
  const [isContract, setIsContract] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const publicClient = usePublicClient({ chainId })

  const verifyAddress = useCallback(async () => {
    if (!address || !isAddress(address)) {
      setIsContract(null)
      return
    }

    setVerifying(true)
    try {
      const bytecode = await publicClient?.getBytecode({
        address: getAddress(address),
      })
      setIsContract(!!bytecode && bytecode !== '0x')
    } catch {
      setIsContract(false)
    } finally {
      setVerifying(false)
    }
  }, [address, publicClient])

  const handleAddressChange = (value: string) => {
    setAddress(value)
    setIsContract(null)
  }

  const handleSubmit = async () => {
    if (!org || !isAddress(address)) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('contracts').insert({
        org_id: org.id,
        address: getAddress(address),
        chain_id: chainId,
        status: 'unnamed',
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('This contract has already been added')
        } else {
          toast.error('Failed to add contract')
        }
        return
      }

      toast.success('Contract added')
      await refetchContracts()
      onOpenChange(false)
      setAddress('')
      setIsContract(null)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-xl border border-border bg-card shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold">Add Contract</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-6">
            {/* Chain selector */}
            <div>
              <label className="mb-2 block text-sm font-medium">Chain</label>
              <div className="flex flex-wrap gap-2">
                {chainOptions.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      setChainId(chain.id)
                      setIsContract(null)
                    }}
                    className={cn(
                      'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                      chainId === chain.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-border hover:bg-accent',
                    )}
                  >
                    {chain.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Address input */}
            <div>
              <label className="mb-2 block text-sm font-medium">
                Contract Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onBlur={verifyAddress}
                  placeholder="0x..."
                  className="h-10 w-full rounded-md border border-input bg-secondary px-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {verifying && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {isContract === true && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {isContract === false && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              </div>
              {isContract === false && (
                <p className="mt-1 text-xs text-red-400">
                  No contract found at this address on{' '}
                  <ChainBadge chainId={chainId} />
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isAddress(address) || saving}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Add Contract
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
