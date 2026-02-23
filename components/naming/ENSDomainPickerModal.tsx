import React, { memo, useMemo, type ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ENSDomainPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fetchingENS: boolean
  userOwnedDomains: string[]
  onSelectDomain: (domain: string) => void
  /** Modal title */
  title?: string
  /** Optional description below the title */
  description?: string
  /** Show an "Enter manually" + "Cancel" footer */
  onEnterManually?: () => void
  /** Extra section rendered after the user's domain list (e.g. "Other Domains") */
  extraSection?: ReactNode
  /** Max height CSS class for the domain list scroll area */
  maxHeightClass?: string
}

function DomainSpinner() {
  return (
    <div className="flex justify-center items-center p-6">
      <svg
        className="animate-spin h-5 w-5 mr-3 text-indigo-600 dark:text-indigo-400"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        ></path>
      </svg>
      <p className="text-gray-700 dark:text-gray-300">
        Fetching your ENS domains...
      </p>
    </div>
  )
}

/** Shared domain grouping logic */
function useDomainGroups(domains: string[]) {
  return useMemo(() => {
    const get2LD = (domain: string): string => {
      const parts = domain.split('.')
      if (parts.length < 2) return domain
      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
    }

    const domainsWithLabelhash = domains.filter(
      (d) => d.includes('[') && d.includes(']'),
    )
    const regularDomains = domains.filter(
      (d) => !(d.includes('[') && d.includes(']')),
    )

    const domainGroups: Record<string, string[]> = {}
    regularDomains.forEach((domain) => {
      const parent2LD = get2LD(domain)
      if (!domainGroups[parent2LD]) domainGroups[parent2LD] = []
      domainGroups[parent2LD].push(domain)
    })

    return {
      sorted2LDs: Object.keys(domainGroups).sort(),
      domainGroups,
      domainsWithLabelhash,
    }
  }, [domains])
}

function DomainPillList({
  sorted2LDs,
  domainGroups,
  domainsWithLabelhash,
  onSelectDomain,
  maxHeightClass = 'max-h-[50vh]',
}: {
  sorted2LDs: string[]
  domainGroups: Record<string, string[]>
  domainsWithLabelhash: string[]
  onSelectDomain: (domain: string) => void
  maxHeightClass?: string
}) {
  return (
    <div className={`${maxHeightClass} overflow-y-auto overflow-x-hidden min-w-0 pr-2`}>
      <div className="space-y-4">
        {sorted2LDs.map((parent2LD) => (
          <div
            key={parent2LD}
            className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 min-w-0"
          >
            <div className="flex flex-wrap gap-2 min-w-0">
              {domainGroups[parent2LD].map((domain, index) => (
                <div
                  key={domain}
                  className={`px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center ${
                    index === 0
                      ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800'
                      : 'bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => onSelectDomain(domain)}
                >
                  <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                    {domain}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {domainsWithLabelhash.length > 0 && (
          <div className="pt-2 min-w-0">
            <div className="flex flex-wrap gap-2 min-w-0">
              {domainsWithLabelhash.map((domain) => (
                <div
                  key={domain}
                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center"
                  onClick={() => onSelectDomain(domain)}
                >
                  <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                    {domain}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const ENSDomainPickerModal = memo(function ENSDomainPickerModal({
  open,
  onOpenChange,
  fetchingENS,
  userOwnedDomains,
  onSelectDomain,
  title = 'Choose Your ENS Parent',
  description,
  onEnterManually,
  extraSection,
  maxHeightClass,
}: ENSDomainPickerModalProps) {
  const { sorted2LDs, domainGroups, domainsWithLabelhash } =
    useDomainGroups(userOwnedDomains)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {fetchingENS ? (
          <DomainSpinner />
        ) : (
          <>
            <div className="space-y-4 px-2 min-h-0 overflow-y-auto overflow-x-hidden flex-1">
              {extraSection ? (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-0">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Your Domains
                </h3>
                {userOwnedDomains.length > 0 ? (
                  <DomainPillList
                    sorted2LDs={sorted2LDs}
                    domainGroups={domainGroups}
                    domainsWithLabelhash={domainsWithLabelhash}
                    onSelectDomain={onSelectDomain}
                    maxHeightClass={maxHeightClass || 'max-h-[30vh]'}
                  />
                ) : (
                  <div className="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <p className="text-gray-500 dark:text-gray-400">
                      No ENS domains found for your address.
                    </p>
                  </div>
                )}
              </div>
            ) : userOwnedDomains.length > 0 ? (
              <DomainPillList
                sorted2LDs={sorted2LDs}
                domainGroups={domainGroups}
                domainsWithLabelhash={domainsWithLabelhash}
                onSelectDomain={onSelectDomain}
                maxHeightClass={maxHeightClass}
              />
            ) : (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-gray-500 dark:text-gray-400">
                  No ENS domains found for your address.
                </p>
              </div>
            )}

              {extraSection && <div className="min-w-0">{extraSection}</div>}
            </div>

            {onEnterManually && (
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
                <Button
                  variant="outline"
                  onClick={onEnterManually}
                  className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-200"
                >
                  Enter manually
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-200"
                >
                  Cancel
                </Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
})
