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

export default function AssignNamePage() {
  const { orgId } = useOrg()
  const { user } = useUser()
  const { address, chain } = useAccount()

  const [contractAddress, setContractAddress] = useState('')
  const [ensName, setEnsName] = useState('')
  const [selectedChainId, setSelectedChainId] = useState<number>(CHAINS.MAINNET)
  const [showProgress, setShowProgress] = useState(false)
  const [steps, setSteps] = useState<TxStep[]>([])

  const { writeContractAsync } = useWriteContract()

  const chainConfig = CONTRACTS[selectedChainId as CHAINS]
  const selectedChain = getChainOption(selectedChainId)

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
    if (!address || !chainConfig || !contractAddress || !ensName) return

    // Ensure connected to the right chain
    if (chain?.id !== selectedChainId) {
      // User needs to switch chains first
      return
    }

    const label = ensName.split('.')[0]
    const enscribeV2Address = chainConfig.ENSCRIBE_V2_CONTRACT as `0x${string}`

    if (!enscribeV2Address) return

    const explorerUrl = chainConfig.ETHERSCAN_URL

    setSteps([
      { label: 'Setting ENS name on contract', status: 'active' },
    ])
    setShowProgress(true)

    try {
      const hash = await writeContractAsync({
        address: enscribeV2Address,
        abi: EnscribeV2ABI,
        functionName: 'setName',
        args: [contractAddress as `0x${string}`, label],
      })

      updateStep(0, { status: 'complete', txHash: hash, explorerUrl })

      // Log to Supabase
      if (orgId && user?.id) {
        const supabase = createClient()
        await supabase.from('naming_operations').insert({
          org_id: orgId,
          operation_type: 'assign',
          chain_id: selectedChainId,
          ens_name: ensName,
          contract_address: contractAddress,
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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Assign ENS name</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Attach an ENS name to an existing smart contract
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Chain selector */}
        <div className="space-y-2">
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

        {/* Contract address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Contract Address
          </label>
          <Input
            placeholder="0x..."
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
            pattern="^0x[a-fA-F0-9]{40}$"
            required
          />
        </div>

        {/* ENS name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">ENS Name</label>
          <Input
            placeholder="mycontract.enscribe.eth"
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            The label (first part before the dot) will be used as the subname.
          </p>
        </div>

        <Button
          type="submit"
          disabled={!address || !contractAddress || !ensName || chain?.id !== selectedChainId}
          className="w-full sm:w-auto"
        >
          Assign Name
        </Button>
      </form>

      <TxProgress
        steps={steps}
        title="Assigning ENS Name"
        open={showProgress}
        onClose={() => setShowProgress(false)}
      />
    </div>
  )
}
