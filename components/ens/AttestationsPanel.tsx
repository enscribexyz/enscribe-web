import React, { memo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OLI_ATTESTATION_URL, OLI_SEARCH_URL } from '@/utils/constants'

interface AttestationsPanelProps {
  hasAttestations: boolean
  address: string
  chainId?: number
}

export const AttestationsPanel = memo(function AttestationsPanel({
  hasAttestations,
  address,
  chainId,
}: AttestationsPanelProps) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Contract Attestations
      </h3>
      <div className="flex flex-wrap gap-2 mt-2">
        {hasAttestations ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                  asChild
                >
                  <Link
                    href={`${OLI_ATTESTATION_URL}?contract=${address}&chainId=${chainId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <img src="/oli_logo.jpg" alt="oli" className="w-4 h-4" />
                    Label on OLI
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>Create label on Open Labels Initiative</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                  asChild
                >
                  <Link
                    href={`${OLI_SEARCH_URL}?address=${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer"
                  >
                    <img src="/oli_logo.jpg" alt="oli" className="w-4 h-4" />
                    Labelled on OLI
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>View label on Open Labels Initiative</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
})
