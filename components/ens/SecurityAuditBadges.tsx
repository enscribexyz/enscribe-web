import React, { memo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { VerificationStatus } from '@/types'

interface SecurityAuditBadgesProps {
  verificationStatus: VerificationStatus
}

export const SecurityAuditBadges = memo(function SecurityAuditBadges({
  verificationStatus,
}: SecurityAuditBadgesProps) {
  if (
    !verificationStatus.diligence_audit &&
    !verificationStatus.openZepplin_audit &&
    !verificationStatus.cyfrin_audit
  ) {
    return null
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Contract Security Audits
      </h3>
      <div className="flex flex-wrap gap-2 mt-2">
        {verificationStatus.diligence_audit && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={verificationStatus.diligence_audit}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <img
                  src="/consensys.svg"
                  alt="ConsenSys Diligence"
                  className="w-4 h-4"
                />
                ConsenSys Diligence
              </Link>
            </Button>
          </div>
        )}
        {verificationStatus.openZepplin_audit && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={verificationStatus.openZepplin_audit}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <img src="/oz.svg" alt="OpenZeppelin" className="w-4 h-4" />
                OpenZeppelin
              </Link>
            </Button>
          </div>
        )}
        {verificationStatus.cyfrin_audit && (
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
            >
              <Link
                href={verificationStatus.cyfrin_audit}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
              >
                <img src="/cyfrin.svg" alt="Cyfrin" className="w-4 h-4" />
                Cyfrin
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})
