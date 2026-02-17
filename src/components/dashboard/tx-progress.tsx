'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { waitForTransactionReceipt } from 'viem/actions'
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ExternalLink,
  X,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { CONTRACTS } from '@/src/lib/blockchain/chains'

export interface TxStep {
  title: string
  description?: string
  action: () => Promise<`0x${string}` | string | void>
  chainId?: number
}

type StepStatus = 'pending' | 'executing' | 'confirmed' | 'error'

interface TxProgressProps {
  open: boolean
  onClose: (result: 'success' | 'error' | 'cancelled') => void
  title: string
  steps: TxStep[]
}

export function TxProgress({ open, onClose, title, steps }: TxProgressProps) {
  const { chain } = useAccount()
  const { data: walletClient } = useWalletClient()

  const [currentStep, setCurrentStep] = useState(0)
  const [statuses, setStatuses] = useState<StepStatus[]>(
    steps.map(() => 'pending'),
  )
  const [txHashes, setTxHashes] = useState<(string | null)[]>(
    steps.map(() => null),
  )
  const [error, setError] = useState<string | null>(null)
  const [executing, setExecuting] = useState(false)

  const allCompleted = statuses.every((s) => s === 'confirmed')

  const updateStatus = useCallback(
    (index: number, status: StepStatus) => {
      setStatuses((prev) => {
        const next = [...prev]
        next[index] = status
        return next
      })
    },
    [],
  )

  const updateTxHash = useCallback(
    (index: number, hash: string) => {
      setTxHashes((prev) => {
        const next = [...prev]
        next[index] = hash
        return next
      })
    },
    [],
  )

  const runStep = useCallback(
    async (index: number) => {
      if (!walletClient || index >= steps.length) return

      setExecuting(true)
      setError(null)
      updateStatus(index, 'executing')

      try {
        const result = await steps[index].action()

        if (result) {
          const hash = result as `0x${string}`
          updateTxHash(index, hash)

          // Wait for confirmation
          const receipt = await waitForTransactionReceipt(walletClient, {
            hash,
          })

          if (receipt.status === 'reverted') {
            throw new Error('Transaction reverted')
          }
        }

        updateStatus(index, 'confirmed')

        // Auto-advance to next step
        if (index + 1 < steps.length) {
          setCurrentStep(index + 1)
        }
      } catch (err: unknown) {
        const error = err as { code?: number | string; message?: string }
        if (error?.code === 4001 || error?.code === 'ACTION_REJECTED') {
          // User rejected — reset to pending
          updateStatus(index, 'pending')
          setError('Transaction rejected. Click to retry.')
        } else {
          updateStatus(index, 'error')
          setError(
            error?.message || 'An error occurred',
          )
        }
      } finally {
        setExecuting(false)
      }
    },
    [walletClient, steps, updateStatus, updateTxHash],
  )

  // Auto-start first step
  useEffect(() => {
    if (open && steps.length > 0 && currentStep === 0 && !executing) {
      const timer = setTimeout(() => runStep(0), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Auto-advance when previous step completes
  useEffect(() => {
    if (
      currentStep > 0 &&
      currentStep < steps.length &&
      !executing &&
      !error &&
      statuses[currentStep - 1] === 'confirmed' &&
      statuses[currentStep] === 'pending'
    ) {
      runStep(currentStep)
    }
  }, [currentStep, executing, error, statuses, runStep, steps.length])

  // Reset on open
  useEffect(() => {
    if (open) {
      setCurrentStep(0)
      setStatuses(steps.map(() => 'pending'))
      setTxHashes(steps.map(() => null))
      setError(null)
      setExecuting(false)
    }
  }, [open, steps])

  if (!open) return null

  const getExplorerUrl = (index: number) => {
    const chainId = steps[index].chainId || chain?.id || 1
    const config = CONTRACTS[chainId]
    if (!config?.ETHERSCAN_URL || !txHashes[index]) return null
    return `${config.ETHERSCAN_URL}/tx/${txHashes[index]}`
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-96 flex-col border-l border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">
            {allCompleted
              ? 'All operations completed'
              : `Step ${Math.min(currentStep + 1, steps.length)} of ${steps.length}`}
          </p>
        </div>
        <button
          onClick={() =>
            onClose(allCompleted ? 'success' : error ? 'error' : 'cancelled')
          }
          className="rounded-md p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {steps.map((step, index) => {
            const status = statuses[index]
            const explorerUrl = getExplorerUrl(index)
            const isCurrent = index === currentStep

            return (
              <div
                key={index}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  status === 'confirmed'
                    ? 'border-green-500/20 bg-green-500/5'
                    : status === 'error'
                      ? 'border-red-500/20 bg-red-500/5'
                      : status === 'executing'
                        ? 'border-primary/30 bg-primary/5'
                        : 'border-border bg-card',
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="mt-0.5">
                    {status === 'confirmed' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {status === 'executing' && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                    {status === 'pending' && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground">
                        {index + 1}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        status === 'pending'
                          ? 'text-muted-foreground'
                          : 'text-foreground',
                      )}
                    >
                      {step.title}
                    </p>
                    {step.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.description}
                      </p>
                    )}

                    {/* Tx link */}
                    {explorerUrl && (
                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        View transaction
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-red-400">{error}</p>
            {statuses[currentStep] === 'pending' && (
              <button
                onClick={() => runStep(currentStep)}
                className="mt-2 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                Retry
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {allCompleted && (
        <div className="border-t border-border p-6">
          <button
            onClick={() => onClose('success')}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Done
          </button>
        </div>
      )}
    </div>
  )
}
