import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, Loader2, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { CONTRACTS, TOPIC0 } from '../utils/constants'
import { useChainConfig } from '@/hooks/useChainConfig'
import { useAccount, useWalletClient } from 'wagmi'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { X } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  getEnsAddress,
  getTransactionReceipt,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from 'viem/actions'
import { getDeployedAddress, isTestNet } from '@/utils/componentUtils'
import { method } from 'es-toolkit/compat'

import type { Step, BatchResult } from '@/types'

export interface SetNameStepsModalProps {
  open: boolean
  onClose: (lastTxHash?: string | null) => void
  title: string
  subtitle: string
  steps: Step[]
  contractAddress?: string
  ensName?: string
  isPrimaryNameSet?: boolean
  isSafeWallet?: boolean
  walletAddress?: string
  batchEntries?: BatchResult[]
  parentName?: string
}

export default function SetNameStepsModal({
  open,
  onClose,
  title,
  subtitle,
  steps,
  contractAddress,
  ensName,
  isPrimaryNameSet,
  isSafeWallet,
  walletAddress,
  batchEntries,
  parentName,
}: SetNameStepsModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [executing, setExecuting] = useState(false)
  const [lastTxHash, setLastTxHash] = useState<string | null>(null)
  const [allStepsCompleted, setAllStepsCompleted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [poapMintLink, setPoapMintLink] = useState<string | null>(null)
  const [stepStatuses, setStepStatuses] = useState<
    ('pending' | 'completed' | 'error')[]
  >(Array(steps?.length || 0).fill('pending'))

  const [stepTxHashes, setStepTxHashes] = useState<(string | null)[]>(
    Array(steps?.length || 0).fill(null),
  )

  // Add state to track contract address
  const [internalContractAddress, setInternalContractAddress] = useState<
    string | undefined
  >(contractAddress)

  // Add state for expandable batch entries
  const [isBatchExpanded, setIsBatchExpanded] = useState(false)

  const { chain, address } = useAccount()
  const router = useRouter()
  const config = useChainConfig()
  const { data: walletClient } = useWalletClient()

  if(!walletAddress){walletAddress = address}

  // Reset state when modal opens or closes
  useEffect(() => {

    // Reset all state when modal opens
    if (open && steps && steps.length > 0) {
      setCurrentStep(0)
      setExecuting(false)
      setStepStatuses(Array(steps.length).fill('pending'))
      setStepTxHashes(Array(steps.length).fill(null))
      setLastTxHash(null)
      setAllStepsCompleted(false)
      setErrorMessage('')
      // Initialize contract address from prop
      setInternalContractAddress(contractAddress)

      // For Safe wallets, automatically mark all steps as completed since we don't wait for receipts
      if (isSafeWallet) {
        setStepStatuses(Array(steps.length).fill('completed'))
        setAllStepsCompleted(true)
      }
    }

    // Also reset when modal closes to ensure fresh state next time
    if (!open) {
      setCurrentStep(0)
      setExecuting(false)
      setAllStepsCompleted(false)
    }
  }, [open, steps])

  // Add keyframes for glow animation
  const keyframes = `
@keyframes glow {
  0% { box-shadow: 0 0 5px #ff6b6b, 0 0 10px #ff6b6b; }
  100% { box-shadow: 0 0 20px #ff6b6b, 0 0 30px #4b6cb7; }
}
@keyframes shimmer {
  0% { transform: translateX(-100%) skewX(-15deg); }
  100% { transform: translateX(100%) skewX(-15deg); }
}
@keyframes shine {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
@keyframes pulse {
  0% { transform: scale(0.95); opacity: 0.5; }
  100% { transform: scale(1.05); opacity: 0.8; }
}
`

  // Auto-start the first step when modal opens
  useEffect(() => {

    // Only run this effect when the modal first opens
    if (open && steps && steps.length > 0 && currentStep === 0 && !executing) {
      setTimeout(() => {
        runStep(0)
      }, 100)
    }
  }, [open])

  useEffect(() => {
    if (
      open &&
      steps &&
      steps.length > 0 &&
      currentStep > 0 &&
      currentStep < steps.length &&
      !executing &&
      !errorMessage &&
      stepStatuses[currentStep - 1] === 'completed'
    ) {
      runStep(currentStep)
    }
  }, [currentStep, executing, errorMessage, stepStatuses])

  const runStep = async (index: number) => {
    if (!walletClient) return

    let tx = null
    let errorMain = null
    setExecuting(true)

    tx = await steps[index].action().catch((error) => {
      updateStepStatus(index, 'error')
      setErrorMessage(
        error?.message || error.toString() || 'Unknown error occurred.',
      )
      errorMain = error
      return
    })

    try {
      if (tx) {
        let txReceipt = null
        let txHash = null

        if (isSafeWallet) {
          // For Safe wallets, don't wait for transaction receipt
          // The transaction will be executed in the Safe app
          txHash = tx as string
        } else {
          // For regular wallets, wait for transaction receipt
          txReceipt = await waitForTransactionReceipt(walletClient, {
            hash: tx as `0x${string}`,
          })
          if (txReceipt) {
            const deployedContractAddress = await getDeployedAddress(txReceipt)
            if (deployedContractAddress) {
              setInternalContractAddress(deployedContractAddress)
            }
          }
          txHash = txReceipt?.transactionHash ?? null
        }

        setStepTxHashes((prev) => {
          const updated = [...prev]
          updated[index] = txHash
          return updated
        })

        setLastTxHash(txHash)
        updateStepStatus(index, 'completed')
      }

      if (!errorMain) {
        updateStepStatus(index, 'completed')
      }

      if (index + 1 < steps.length) {
        setCurrentStep(index + 1)
      } else {
        setCurrentStep(steps.length)
        setAllStepsCompleted(true)
        // Only get POAP link for non-Safe wallets since we don't have transaction data
        if (!isSafeWallet) {
          const link = await getPoapMintLink()
          setPoapMintLink(link)
        }
      }
    } catch (error: any) {
      console.error('Step failed:', error)
      if (error?.code === 'ACTION_REJECTED' || error?.code === 4001) {
        updateStepStatus(index, 'pending')
      } else {
        updateStepStatus(index, 'error')
        setErrorMessage(
          error?.message || error.toString() || 'Unknown error occurred.',
        )
      }
    } finally {
      setExecuting(false)
    }
  }

  const getPoapMintLink = async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/v1/mint`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        return data.link
      }
    } catch (err) {
      console.error('POAP mint link fetch failed:', err)
    }
    return null
  }

  const updateStepStatus = (
    index: number,
    status: 'pending' | 'completed' | 'error',
  ) => {
    setStepStatuses((prev) => {
      const updated = [...prev]
      updated[index] = status
      return updated
    })
  }

  const renderStepIcon = (
    index: number,
    status: 'pending' | 'completed' | 'error',
    isCurrent: boolean,
  ) => {
    if (status === 'completed')
      return <CheckCircle className="text-green-600 w-5 h-5" />
    if (status === 'error') return <XCircle className="text-red-600 w-5 h-5" />
    if (isCurrent && executing)
      return <Loader2 className="animate-spin text-blue-600 w-5 h-5" />
    return (
      <div className="w-5 h-5 rounded-full bg-gray-300 text-xs flex items-center justify-center text-gray-700 font-semibold">
        {index + 1}
      </div>
    )
  }

  const handleDialogChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (allStepsCompleted && !errorMessage) {
        // For batch naming, don't navigate to a single contract page
        if (batchEntries && batchEntries.length > 0) {
          onClose(lastTxHash)
        } else {
          // Navigate to the explore page when closing a successful modal for single contract
          const address = internalContractAddress || contractAddress
          if (address && chain?.id) {
            router.push(`/explore/${chain.id}/${address}`)
          }
          onClose(lastTxHash)
        }
      } else {
        // Return error message or INCOMPLETE status
        const result = errorMessage ? `ERROR: ${errorMessage}` : 'INCOMPLETE'
        onClose(result)
      }
    }
  }

  // Inject CSS keyframes
  useEffect(() => {
    // Create style element if it doesn't exist
    let styleEl = document.getElementById('animation-keyframes')
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = 'animation-keyframes'
      styleEl.innerHTML = keyframes
      document.head.appendChild(styleEl)
    }

    // Clean up when component unmounts
    return () => {
      const styleEl = document.getElementById('animation-keyframes')
      if (styleEl) {
        document.head.removeChild(styleEl)
      }
    }
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="bg-white dark:bg-gray-900 rounded-lg max-w-lg sm:max-w-lg">
        <button
          onClick={() => handleDialogChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-black dark:text-white" />
        </button>
        <DialogHeader>
          <DialogTitle className="text-xl text-gray-900 dark:text-white">
            {errorMessage
              ? title.includes('Deploy')
                ? 'Deployment Failed'
                : 'Contract Naming Failed'
              : allStepsCompleted
                ? title.includes('Deploy')
                  ? isSafeWallet
                    ? 'Transactions submitted'
                    : 'Deployment Successful!'
                  : isSafeWallet
                    ? 'Transactions submitted'
                    : 'Naming Contract Successful!'
                : title}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            {errorMessage
              ? title.includes('Deploy')
                ? 'There was an error deploying your contract.'
                : 'There was an error naming your contract.'
              : allStepsCompleted
                ? title.includes('Deploy')
                  ? isSafeWallet
                    ? ''
                    : 'Your contract has been successfully deployed.'
                  : isSafeWallet
                    ? ''
                    : 'Your contract has been named successfully.'
                : subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isSafeWallet ? (
            // Safe wallet view with steps list
            <>
              {/* Header for Safe wallets */}
              <div className="text-center mb-6">
                <CheckCircle className="text-green-600 w-12 h-12 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Looks like you are using a Safe Wallet
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  As you are using a Safe Wallet, a batch of transactions has
                  been submitted to your Safe wallet for approval.
                </p>
              </div>

              {/* Steps list for Safe wallets */}
              {steps?.length ? (
                steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="text-orange-500 w-5 h-5" />
                      <span className="text-sm text-gray-800 dark:text-gray-200">
                        {step.title}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No steps to display</p>
              )}

              {/* Goto Safe Wallet button */}
              {chain?.id && (
                <div className="text-center mt-6">
                  <Button
                    asChild
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold"
                  >
                    <a
                      href={`https://app.safe.global/transactions/queue?safe=${chain.id}:${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Go to Safe Wallet
                    </a>
                  </Button>
                </div>
              )}
            </>
          ) : (
            // Regular view for non-Safe wallets
            <>
              {steps?.length ? (
                steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {renderStepIcon(
                        index,
                        stepStatuses[index],
                        index === currentStep,
                      )}
                      <span
                        className={`text-sm ${stepStatuses[index] === 'error' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}
                      >
                        {step.title}
                      </span>
                    </div>

                    {stepTxHashes[index] && (
                      <Button
                        asChild
                        size="sm"
                        variant="secondary"
                        className="text-xs px-2 py-1 h-auto"
                      >
                        <a
                          href={`${CONTRACTS[steps[index].chainId || chain?.id || 1]?.ETHERSCAN_URL}tx/${stepTxHashes[index]}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View Tx
                        </a>
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No steps to display</p>
              )}
            </>
          )}
        </div>

        {/* Show success content when steps are completed - only for non-Safe wallets */}
        {allStepsCompleted && !errorMessage && !isSafeWallet && (
          <div className="mt-6 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            {/* Batch Entries (if multiple contracts) */}
            {batchEntries && batchEntries.length > 0 ? (
              <div className="space-y-3">
                {/* Parent Domain */}
                {parentName && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Parent Domain:
                    </p>
                    <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-md text-xs text-gray-900 dark:text-gray-300 break-words">
                      {parentName}
                    </div>
                  </div>
                )}
                
                {/* Expandable Contracts List */}
                <div>
                <button
                  onClick={() => setIsBatchExpanded(!isBatchExpanded)}
                  className="w-full flex items-center justify-between bg-gray-200 dark:bg-gray-800 p-3 rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Named Contracts ({batchEntries.filter(e => e.address && e.address !== '0x0000000000000000000000000000000000000000' && e.address !== '0x0').length})
                    </p>
                  </div>
                  {isBatchExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                
                {isBatchExpanded && (
                  <div className="mt-2 max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-md">
                    {batchEntries
                      .filter(e => e.address && e.address !== '0x0000000000000000000000000000000000000000' && e.address !== '0x0')
                      .map((entry, index) => (
                        <div
                          key={index}
                          className="p-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {entry.label}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono">
                            {entry.address}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
                </div>
              </div>
            ) : (
              <>
                {/* Single Contract Address */}
                {(internalContractAddress || contractAddress) && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Contract Address:
                    </p>
                    <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-md text-xs text-gray-900 dark:text-gray-300 break-words">
                      {internalContractAddress || contractAddress}
                    </div>
                  </div>
                )}

                {/* Single ENS Name */}
                {ensName && (
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      ENS Name:
                    </p>
                    <div className="bg-gray-200 dark:bg-gray-800 p-2 rounded-md text-xs text-gray-900 dark:text-gray-300 break-words">
                      {ensName}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ENS Resolution Message - only show for single contract naming, not batch naming */}
            {isPrimaryNameSet !== undefined && !isPrimaryNameSet && !batchEntries && (
              <div className="text-red-500 dark:text-white font-semibold text-sm mt-4">
                Only Forward Resolution of ENS name set for the contract address
              </div>
            )}

            {/* Share on X/Twitter and Farcaster */}
            {((batchEntries && batchEntries.length > 0 && parentName) || (ensName && (internalContractAddress || contractAddress))) && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <Button
                    asChild
                    className="text-white flex items-center justify-center gap-2 bg-black hover:bg-gray-800"
                  >
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                        batchEntries && batchEntries.length > 0 && parentName
                          ? `Named my contracts under ${parentName} using @enscribe_`
                          : `I named my contract ${ensName} with @enscribe_, check it out https://app.enscribe.xyz/explore/${chain?.id}/${internalContractAddress || contractAddress}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="flex items-center">
                        <Image
                          src="/x-white.png"
                          alt="X logo"
                          width={18}
                          height={18}
                          className="mr-2"
                        />
                        <span>Share on X</span>
                      </span>
                    </a>
                  </Button>
                  <Button
                    asChild
                    className="text-white flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-700"
                  >
                    <a
                      href={`https://warpcast.com/~/compose?text=${encodeURIComponent(
                        batchEntries && batchEntries.length > 0 && parentName
                          ? `Named my contracts under ${parentName} using @enscribe`
                          : `I named my contract ${ensName} with @enscribe, check it out https://app.enscribe.xyz/explore/${chain?.id}/${internalContractAddress || contractAddress}`,
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="flex items-center">
                        <Image
                          src="/farcaster.svg"
                          alt="Farcaster logo"
                          width={18}
                          height={18}
                          className="mr-2"
                        />
                        <span>Share on Farcaster</span>
                      </span>
                    </a>
                  </Button>
                </div>

                {/* Claim POAP Button */}
                {!errorMessage && poapMintLink != null &&
                  chain != undefined &&
                  !isTestNet(chain.id) && stepTxHashes.some(Boolean) && (
                    <div className="mt-4">
                      <Button
                        className="w-full py-6 text-lg font-medium relative overflow-hidden shadow-lg hover:shadow-indigo-500/30"
                        style={{
                          background:
                            'linear-gradient(90deg, #ff6b6b 0%, #8a2be2 50%, #4b6cb7 100%)',
                          backgroundSize: '200% 100%',
                          animation: 'glow 1.5s infinite alternate',
                        }}
                      >
                        <a
                          href={poapMintLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {/* Background animation elements */}
                          <span className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-x-12 animate-shimmer pointer-events-none"></span>
                          <span className="absolute bottom-0 right-0 w-12 h-12 bg-white/20 rounded-full blur-xl animate-pulse pointer-events-none"></span>
                          <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-indigo-500/0 via-indigo-500/40 to-indigo-500/0 animate-shine pointer-events-none"></span>
                          <div className="flex items-center justify-center relative z-10">
                            <span className="scale-105 transition-transform duration-300">
                              Claim my POAP
                            </span>
                            <span className="ml-2 inline-block">🏆</span>
                          </div>
                        </a>
                      </Button>
                    </div>
                  )}
              </>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 space-y-2">
            <Button
              onClick={() => onClose(`ERROR: ${errorMessage}`)}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
