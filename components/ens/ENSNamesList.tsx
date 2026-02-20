import React, { memo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink } from 'lucide-react'
import type { ENSDomain } from '@/types'
import type { NetworkConfig } from '@/utils/constants'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { ExpiryBadge } from './ExpiryBadge'

interface ENSNamesListProps {
  domains: ENSDomain[]
  config: NetworkConfig | undefined
  /** Label shown in the header, e.g. "Owned ENS Names" */
  label: string
  /** Unique prefix for copy button IDs */
  copyIdPrefix: string
  /** Called when a domain name is clicked (makes it a navigable link) */
  onNavigateToDomain?: (domainName: string) => Promise<void>
  /** Whether to indent subdomains by level */
  indentSubdomains?: boolean
  /** Render extra badges/elements after the ExpiryBadge for each domain */
  renderExtra?: (domain: ENSDomain) => ReactNode
  /** Custom row className based on the domain */
  rowClassName?: (domain: ENSDomain) => string
}

export const ENSNamesList = memo(function ENSNamesList({
  domains,
  config,
  label,
  copyIdPrefix,
  onNavigateToDomain,
  indentSubdomains,
  renderExtra,
  rowClassName,
}: ENSNamesListProps) {
  const [expanded, setExpanded] = useState(false)
  const { copied, copyToClipboard } = useCopyToClipboard()

  if (domains.length === 0) {
    return (
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
          {label} (0)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
          No {label} found for this address
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
          {label} ({domains.length})
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
              {domains.map((domain, index) => {
                const indentLevel =
                  indentSubdomains && domain.level && domain.level > 2
                    ? domain.level - 2
                    : 0
                const indentClass =
                  indentLevel > 0 ? `pl-${indentLevel * 4}` : ''

                const baseRowClass = rowClassName
                  ? rowClassName(domain)
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'

                return (
                  <div
                    key={domain.name || index}
                    className={`flex items-center justify-between p-2 rounded ${baseRowClass} ${indentClass}`}
                  >
                    <div className="flex items-center gap-1">
                      {onNavigateToDomain ? (
                        <span
                          className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate px-2 underline cursor-pointer"
                          onClick={async (e) => {
                            e.stopPropagation()
                            await onNavigateToDomain(domain.name)
                          }}
                        >
                          {domain.name}
                        </span>
                      ) : (
                        <span className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate px-2">
                          {domain.name}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(
                            domain.name,
                            `${copyIdPrefix}-${index}`,
                          )
                        }}
                      >
                        {copied[`${copyIdPrefix}-${index}`] ? (
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
                      {renderExtra?.(domain)}
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
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
})
