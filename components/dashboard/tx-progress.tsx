'use client'

import React from 'react'
import { Check, Loader2, X as XIcon, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface TxStep {
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
  txHash?: string
  explorerUrl?: string
  errorMessage?: string
}

interface TxProgressProps {
  steps: TxStep[]
  title?: string
  open: boolean
  onClose: () => void
}

export function TxProgress({
  steps,
  title = 'Transaction Progress',
  open,
  onClose,
}: TxProgressProps) {
  if (!open) return null

  const allComplete = steps.every((s) => s.status === 'complete')
  const hasError = steps.some((s) => s.status === 'error')

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-card border-l border-border shadow-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Steps */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              {/* Step indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    step.status === 'complete' && 'bg-success text-success-foreground',
                    step.status === 'active' && 'bg-primary text-primary-foreground',
                    step.status === 'error' && 'bg-destructive text-destructive-foreground',
                    step.status === 'pending' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.status === 'complete' && <Check className="w-4 h-4" />}
                  {step.status === 'active' && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {step.status === 'error' && <XIcon className="w-4 h-4" />}
                  {step.status === 'pending' && (
                    <span className="text-xs font-medium">{i + 1}</span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-px flex-1 min-h-[16px] my-1',
                      step.status === 'complete' ? 'bg-success' : 'bg-border',
                    )}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.status === 'active' && 'text-foreground',
                    step.status === 'complete' && 'text-muted-foreground',
                    step.status === 'error' && 'text-destructive',
                    step.status === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                {step.txHash && step.explorerUrl && (
                  <a
                    href={`${step.explorerUrl}/tx/${step.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-0.5"
                  >
                    View transaction
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {step.errorMessage && (
                  <p className="text-xs text-destructive mt-0.5">
                    {step.errorMessage}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border shrink-0">
        {allComplete && (
          <Button onClick={onClose} className="w-full">
            Done
          </Button>
        )}
        {hasError && (
          <p className="text-xs text-muted-foreground text-center">
            An error occurred. You can close this panel and retry.
          </p>
        )}
      </div>
    </div>
  )
}
