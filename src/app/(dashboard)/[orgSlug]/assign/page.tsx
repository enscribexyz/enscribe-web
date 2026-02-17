'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { namehash, encodeFunctionData, type Address } from 'viem'
import { Tag, Search, Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/src/lib/utils'
import { shortenAddress } from '@/src/lib/utils'
import { useOrg } from '@/src/components/providers/org-provider'
import { ChainBadge } from '@/src/components/dashboard/chain-badge'
import { CONTRACTS, CHAINS } from '@/src/lib/blockchain/chains'
import { TxProgress, type TxStep } from '@/src/components/dashboard/tx-progress'
import enscribeContractABI from '@/src/contracts/Enscribe'
import nameWrapperABI from '@/src/contracts/NameWrapper'
import ensRegistryABI from '@/src/contracts/ENSRegistry'
import publicResolverABI from '@/src/contracts/PublicResolver'
import type { Contract } from '@/src/types/contracts'

export default function AssignNamePage() {
  const searchParams = useSearchParams()
  const { address: walletAddress, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { org, contracts, refetchContracts } = useOrg()

  // State
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null)
  const [label, setLabel] = useState('')
  const [setForward, setSetForward] = useState(true)
  const [setPrimary, setSetPrimary] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [showProgress, setShowProgress] = useState(false)
  const [txSteps, setTxSteps] = useState<TxStep[]>([])

  // Pre-select from URL params
  useEffect(() => {
    const addressParam = searchParams?.get('address')
    const chainParam = searchParams?.get('chain')
    if (addressParam) {
      const found = contracts.find(
        (c) =>
          c.address.toLowerCase() === addressParam.toLowerCase() &&
          (!chainParam || c.chain_id === Number(chainParam)),
      )
      if (found) setSelectedContract(found)
    }
  }, [searchParams, contracts])

  const parentName = org?.ens_domain || ''
  const chainId = selectedContract?.chain_id || chain?.id || CHAINS.MAINNET
  const config = CONTRACTS[chainId]
  const fullName = label && parentName ? `${label}.${parentName}` : ''

  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts.filter((c) => c.status === 'unnamed')
    const q = searchQuery.toLowerCase()
    return contracts.filter(
      (c) =>
        c.address.toLowerCase().includes(q) ||
        c.verified_name?.toLowerCase().includes(q) ||
        c.label?.toLowerCase().includes(q),
    )
  }, [contracts, searchQuery])

  const publicClient = usePublicClient({ chainId })

  // Check availability when label changes
  useEffect(() => {
    if (!label || !parentName || !publicClient || !config) {
      setAvailable(null)
      return
    }

    const timer = setTimeout(async () => {
      setChecking(true)
      try {
        const node = namehash(fullName)
        const owner = await publicClient.readContract({
          address: config.ENS_REGISTRY as Address,
          abi: ensRegistryABI,
          functionName: 'owner',
          args: [node],
        })
        setAvailable(owner === '0x0000000000000000000000000000000000000000')
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [label, parentName, fullName, publicClient, config])

  const buildSteps = useCallback((): TxStep[] => {
    if (!selectedContract || !walletClient || !config || !label || !parentName)
      return []

    const contractAddress = selectedContract.address as Address
    const parentNode = namehash(parentName)
    const steps: TxStep[] = []

    // Step 1: Create subname via Enscribe contract
    steps.push({
      title: `Create subname ${fullName}`,
      description: `Register ${label} under ${parentName}`,
      chainId,
      action: async () => {
        const hash = await walletClient.writeContract({
          address: config.ENSCRIBE_CONTRACT as Address,
          abi: enscribeContractABI,
          functionName: 'setName',
          args: [contractAddress, label, parentName, parentNode],
          chain: walletClient.chain,
          account: walletClient.account,
        })
        return hash
      },
    })

    // Step 2: Set forward resolution (if enabled)
    if (setForward) {
      steps.push({
        title: `Set forward resolution`,
        description: `${fullName} will resolve to ${shortenAddress(selectedContract.address)}`,
        chainId,
        action: async () => {
          const node = namehash(fullName)
          const hash = await walletClient.writeContract({
            address: config.PUBLIC_RESOLVER as Address,
            abi: publicResolverABI,
            functionName: 'setAddr',
            args: [node, contractAddress],
            chain: walletClient.chain,
            account: walletClient.account,
          })
          return hash
        },
      })
    }

    return steps
  }, [
    selectedContract,
    walletClient,
    config,
    label,
    parentName,
    fullName,
    chainId,
    setForward,
    setPrimary,
  ])

  const handleAssign = () => {
    const steps = buildSteps()
    if (steps.length === 0) {
      toast.error('Unable to build transaction steps')
      return
    }
    setTxSteps(steps)
    setShowProgress(true)
  }

  const handleTxComplete = async (result: 'success' | 'error' | 'cancelled') => {
    setShowProgress(false)
    if (result === 'success') {
      toast.success(`Successfully assigned ${fullName}`)
      await refetchContracts()
      setSelectedContract(null)
      setLabel('')
    }
  }

  const canAssign =
    selectedContract &&
    label &&
    parentName &&
    available !== false &&
    walletAddress &&
    config

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assign Name</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assign an ENS name to one of your contracts.
        </p>
      </div>

      {/* Step 1: Select contract */}
      <div className="space-y-3">
        <label className="text-sm font-medium">1. Select Contract</label>
        {selectedContract ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <ChainBadge chainId={selectedContract.chain_id} />
              <span className="font-mono text-sm">
                {shortenAddress(selectedContract.address, 8)}
              </span>
              {selectedContract.verified_name && (
                <span className="text-xs text-muted-foreground">
                  {selectedContract.verified_name}
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedContract(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contracts..."
                className="h-10 w-full rounded-md border border-input bg-secondary pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border">
              {filteredContracts.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No unnamed contracts found
                </p>
              ) : (
                filteredContracts.map((contract) => (
                  <button
                    key={contract.id}
                    onClick={() => setSelectedContract(contract)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                  >
                    <ChainBadge chainId={contract.chain_id} />
                    <span className="font-mono text-sm">
                      {shortenAddress(contract.address, 6)}
                    </span>
                    {contract.verified_name && (
                      <span className="text-xs text-muted-foreground">
                        {contract.verified_name}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Choose name */}
      <div className="space-y-3">
        <label className="text-sm font-medium">2. Choose Name</label>
        {!parentName ? (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-4">
            <p className="text-sm text-yellow-400">
              No ENS domain configured for this organization. Go to Settings to
              set up your namespace.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-0">
              <input
                type="text"
                value={label}
                onChange={(e) =>
                  setLabel(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                }
                placeholder="label"
                className="h-10 flex-1 rounded-l-md border border-r-0 border-input bg-secondary px-3 font-mono text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
              />
              <div className="flex h-10 items-center rounded-r-md border border-input bg-muted px-3 font-mono text-sm text-muted-foreground">
                .{parentName}
              </div>
            </div>

            {/* Availability indicator */}
            {label && (
              <div className="flex items-center gap-2">
                {checking && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Checking availability...
                    </span>
                  </>
                )}
                {!checking && available === true && (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span className="text-xs text-green-500">
                      {fullName} is available
                    </span>
                  </>
                )}
                {!checking && available === false && (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-xs text-red-400">
                      {fullName} is already taken
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Resolution options */}
      <div className="space-y-3">
        <label className="text-sm font-medium">3. Resolution</label>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
            <input
              type="checkbox"
              checked={setForward}
              onChange={(e) => setSetForward(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <p className="text-sm font-medium">Forward Resolution</p>
              <p className="text-xs text-muted-foreground">
                {fullName || 'name.domain.eth'} will resolve to the contract
                address
              </p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted/30">
            <input
              type="checkbox"
              checked={setPrimary}
              onChange={(e) => setSetPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <div>
              <p className="text-sm font-medium">Primary Name (Reverse Resolution)</p>
              <p className="text-xs text-muted-foreground">
                The contract address will display as {fullName || 'name.domain.eth'}
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Assign button */}
      <button
        onClick={handleAssign}
        disabled={!canAssign}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Tag className="h-4 w-4" />
        Assign Name
        <ArrowRight className="h-4 w-4" />
      </button>

      {/* Tx Progress Panel */}
      <TxProgress
        open={showProgress}
        onClose={handleTxComplete}
        title="Assigning Name"
        steps={txSteps}
      />
    </div>
  )
}
