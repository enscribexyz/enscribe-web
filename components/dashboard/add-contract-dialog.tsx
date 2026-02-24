'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CHAIN_OPTIONS } from '@/lib/chains'
import { Plus } from 'lucide-react'
import { useOrg } from '@/components/providers/org-provider'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@clerk/nextjs'

interface AddContractDialogProps {
  onContractAdded?: () => void
}

export function AddContractDialog({ onContractAdded }: AddContractDialogProps) {
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [chainId, setChainId] = useState<number>(1)
  const [loading, setLoading] = useState(false)
  const { orgId } = useOrg()
  const { user } = useUser()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!orgId || !user?.id || !address) return

    setLoading(true)
    try {
      const supabase = createClient()
      await supabase.from('contracts').insert({
        org_id: orgId,
        address: address.toLowerCase(),
        chain_id: chainId,
        status: 'pending',
        added_by: user.id,
      })
      setOpen(false)
      setAddress('')
      onContractAdded?.()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Contract
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a contract</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Contract Address
            </label>
            <Input
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              pattern="^0x[a-fA-F0-9]{40}$"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Chain</label>
            <select
              value={chainId}
              onChange={(e) => setChainId(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CHAIN_OPTIONS.filter((c) => !c.isTestnet).map((chain) => (
                <option key={chain.id} value={chain.id}>
                  {chain.name}
                </option>
              ))}
              <optgroup label="Testnets">
                {CHAIN_OPTIONS.filter((c) => c.isTestnet).map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Contract'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
