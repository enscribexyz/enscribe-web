import React, { memo } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const CHAIN_LOGOS: Record<string, string> = {
  Optimism: '/images/optimism.svg',
  Arbitrum: '/images/arbitrum.svg',
  Scroll: '/images/scroll.svg',
  Base: '/images/base.svg',
  Linea: '/images/linea.svg',
}

interface L2ChainPickerDialogProps {
  open: boolean
  onClose: () => void
  chainOptions: readonly string[]
  selectedChains: string[]
  onToggleChain: (chainName: string) => void
}

export const L2ChainPickerDialog = memo(function L2ChainPickerDialog({
  open,
  onClose,
  chainOptions,
  selectedChains,
  onToggleChain,
}: L2ChainPickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Choose L2 Chains
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Select one or more L2 chains.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {chainOptions.map((chainName) => {
            const isSelected = selectedChains.includes(chainName)
            const logoSrc = CHAIN_LOGOS[chainName] ?? '/images/linea.svg'
            return (
              <button
                key={chainName}
                type="button"
                onClick={() => onToggleChain(chainName)}
                className={`flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                }`}
              >
                <Image
                  src={logoSrc}
                  alt={`${chainName} logo`}
                  width={24}
                  height={24}
                />
                <span className="text-gray-800 dark:text-gray-200">
                  {chainName}
                </span>
                {isSelected && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
                    Selected
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            onClick={onClose}
            className="bg-gray-900 text-white dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
})
