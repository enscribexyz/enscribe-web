import React, { memo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { SOURCIFY_URL } from '@/utils/constants'
import type { NetworkConfig } from '@/utils/constants'
import type { VerificationStatus } from '@/types'

interface VerificationBadgesProps {
  verificationStatus: VerificationStatus
  address: string
  etherscanUrl: string
  chainId: number
  config: NetworkConfig | undefined
}

export const VerificationBadges = memo(function VerificationBadges({
  verificationStatus,
  address,
  etherscanUrl,
  chainId,
  config,
}: VerificationBadgesProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Contract Verification
      </h3>
      <div className="flex flex-wrap gap-2 mt-2">
        {(verificationStatus.sourcify_verification === 'exact_match' ||
          verificationStatus.sourcify_verification === 'match') && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border border-green-800 text-green-800 hover:bg-emerald-100 dark:border-green-400 dark:text-green-400 dark:bg-black dark:hover:bg-green-900/20 text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={`${SOURCIFY_URL}${chainId}/${address.toLowerCase()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <img src="/sourcify.svg" alt="Sourcify" className="w-4 h-4" />
                Verified
              </Link>
            </Button>
          </div>
        )}
        {verificationStatus.etherscan_verification === 'verified' && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border border-green-800 text-green-800 hover:bg-emerald-100 dark:border-green-400 dark:text-green-400 dark:bg-black dark:hover:bg-green-900/20 text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={`${etherscanUrl}address/${address}#code`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/etherscan.svg" alt="Etherscan" className="w-4 h-4" />
                Verified
              </Link>
            </Button>
          </div>
        )}
        {(verificationStatus.blockscout_verification === 'exact_match' ||
          verificationStatus.blockscout_verification === 'match') && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border border-green-800 text-green-800 hover:bg-emerald-100 dark:border-green-400 dark:text-green-400 dark:bg-black dark:hover:bg-green-900/20 text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={`${config?.BLOCKSCOUT_URL}address/${address.toLowerCase()}?tab=contract`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <img src="/blockscout.svg" alt="Blockscout" className="w-4 h-4" />
                Verified
              </Link>
            </Button>
          </div>
        )}
        {verificationStatus.sourcify_verification === 'unverified' && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 dark:bg-black text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href="https://sourcify.dev/#/verifier"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/sourcify.svg" alt="Sourcify" className="w-4 h-4" />
                Verify
              </Link>
            </Button>
          </div>
        )}
        {verificationStatus.etherscan_verification === 'unverified' && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 dark:bg-black text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={`${etherscanUrl}address/${address}#code`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src="/etherscan.svg" alt="Etherscan" className="w-4 h-4" />
                Verify
              </Link>
            </Button>
          </div>
        )}
        {verificationStatus.blockscout_verification === 'unverified' && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 dark:bg-black text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={`${config?.BLOCKSCOUT_URL}address/${address.toLowerCase()}?tab=contract`}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <img src="/blockscout.svg" alt="Blockscout" className="w-4 h-4" />
                Verify
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})
