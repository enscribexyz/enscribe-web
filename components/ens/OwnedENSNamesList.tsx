import React, { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react'
import type { ENSDomain } from '@/types'
import type { NetworkConfig } from '@/utils/constants'

interface OwnedENSNamesListProps {
  userOwnedDomains: ENSDomain[]
  config: NetworkConfig | undefined
  onNavigateToDomain: (domainName: string) => Promise<void>
}

export const OwnedENSNamesList = memo(function OwnedENSNamesList({
  userOwnedDomains,
  config,
  onNavigateToDomain,
}: OwnedENSNamesListProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState<Record<string, boolean>>({})

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied((prev) => ({ ...prev, [id]: true }))
        setTimeout(() => {
          setCopied((prev) => ({ ...prev, [id]: false }))
        }, 2000)
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err)
      })
  }

  if (userOwnedDomains.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Owned ENS Names (0)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          No Owned ENS names found for this address
        </p>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-3 mb-2 text-left bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
      >
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Owned ENS Names ({userOwnedDomains.length})
        </h3>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {expanded && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-4">
          <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            <div className="space-y-2">
              {(() => {
                let currentParent2LD = ''
                return userOwnedDomains.map((domain, index) => {
                  const isNewGroup = domain.parent2LD !== currentParent2LD
                  if (isNewGroup && domain.parent2LD) {
                    currentParent2LD = domain.parent2LD
                  }

                  const indentLevel =
                    domain.level && domain.level > 2 ? domain.level - 2 : 0
                  const indentClass = indentLevel > 0 ? `pl-${indentLevel * 4}` : ''

                  return (
                    <div
                      key={domain.name}
                      className={`flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded ${indentClass}`}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate px-2 underline cursor-pointer"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await onNavigateToDomain(domain.name)
                          }}
                        >
                          {domain.name}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(domain.name, `owned-${index}`)
                          }}
                        >
                          {copied[`owned-${index}`] ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        {domain.expiryDate && (
                          <ExpiryBadge expiryDate={domain.expiryDate} />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-2 h-6 w-6 p-0 flex-shrink-0"
                          asChild
                        >
                          <a
                            href={`${config?.ENS_APP_URL || 'https://app.ens.domains'}/${domain.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  )
})

function ExpiryBadge({ expiryDate }: { expiryDate: number }) {
  const now = new Date()
  const expiry = new Date(expiryDate * 1000)
  const threeMonthsFromNow = new Date()
  threeMonthsFromNow.setMonth(now.getMonth() + 3)

  const isExpired = expiry < now
  const isWithinThreeMonths = !isExpired && expiry < threeMonthsFromNow
  const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
  const isInGracePeriod =
    isExpired && now.getTime() - expiry.getTime() < ninetyDaysInMs

  let textColorClass = 'text-green-600 dark:text-green-400'
  if (isWithinThreeMonths) {
    textColorClass = 'text-yellow-600 dark:text-yellow-400'
  } else if (isExpired && isInGracePeriod) {
    textColorClass = 'text-red-600 dark:text-red-400'
  } else if (isExpired) {
    textColorClass = 'text-red-600 dark:text-red-400'
  }

  return (
    <span className={`text-xs whitespace-nowrap ${textColorClass}`}>
      {isExpired ? 'Expired' : 'Expires'}: {expiry.toLocaleDateString()}
    </span>
  )
}
