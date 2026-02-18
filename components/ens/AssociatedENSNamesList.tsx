import React, { memo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react'
import type { ENSDomain } from '@/types'
import type { NetworkConfig } from '@/utils/constants'

interface AssociatedENSNamesListProps {
  ensNames: ENSDomain[]
  config: NetworkConfig | undefined
}

export const AssociatedENSNamesList = memo(function AssociatedENSNamesList({
  ensNames,
  config,
}: AssociatedENSNamesListProps) {
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

  if (ensNames.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          Associated ENS Names (0)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          No Associated ENS names found for this address
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
          Associated ENS Names ({ensNames.length})
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
              {ensNames.map((domain, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2 rounded ${
                    domain.isPrimary
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate px-2">
                      {domain.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(domain.name, `associated-${index}`)
                      }}
                    >
                      {copied[`associated-${index}`] ? (
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
                    {domain.isPrimary && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                        Primary
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-1 h-6 w-6 p-0 flex-shrink-0"
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
              ))}
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
