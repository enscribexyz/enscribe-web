import React, { memo, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ENSDomainSelectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fetchingENS: boolean
  userOwnedDomains: string[]
  enscribeDomain: string
  onSelectDomain: (domain: string, type: 'web3labs' | 'own') => void
}

export const ENSDomainSelectionModal = memo(function ENSDomainSelectionModal({
  open,
  onOpenChange,
  fetchingENS,
  userOwnedDomains,
  enscribeDomain,
  onSelectDomain,
}: ENSDomainSelectionModalProps) {
  const { sorted2LDs, domainGroups, domainsWithLabelhash } = useMemo(() => {
    const get2LD = (domain: string): string => {
      const parts = domain.split('.')
      if (parts.length < 2) return domain
      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
    }

    const domainsWithLabelhash = userOwnedDomains.filter(
      (d) => d.includes('[') && d.includes(']'),
    )
    const regularDomains = userOwnedDomains.filter(
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
  }, [userOwnedDomains])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 shadow-lg rounded-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
            Choose Domain
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mb-6">
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
              Your Domains
            </h3>
            {fetchingENS ? (
              <div className="flex justify-center items-center p-6">
                <svg
                  className="animate-spin h-5 w-5 mr-3 text-indigo-600 dark:text-indigo-400"
                  viewBox="0 0 24 24"
                  fill="none"
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
            ) : userOwnedDomains.length > 0 ? (
              <div className="max-h-[30vh] overflow-y-auto pr-1">
                <div className="space-y-4">
                  {sorted2LDs.map((parent2LD) => (
                    <div
                      key={parent2LD}
                      className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
                    >
                      <div className="flex flex-wrap gap-2">
                        {domainGroups[parent2LD].map((domain, index) => (
                          <div
                            key={domain}
                            className={`px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center ${
                              index === 0
                                ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800'
                                : 'bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
                            }`}
                            onClick={() =>
                              onSelectDomain(
                                domain,
                                domain === enscribeDomain ? 'web3labs' : 'own',
                              )
                            }
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
                    <div className="pt-2">
                      <div className="flex flex-wrap gap-2">
                        {domainsWithLabelhash.map((domain) => (
                          <div
                            key={domain}
                            className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center"
                            onClick={() =>
                              onSelectDomain(
                                domain,
                                domain === enscribeDomain ? 'web3labs' : 'own',
                              )
                            }
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
            ) : (
              <div className="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <p className="text-gray-500 dark:text-gray-400">
                  No ENS domains found for your address.
                </p>
              </div>
            )}
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
              Other Domains
            </h3>
            <div
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              onClick={() => onSelectDomain(enscribeDomain, 'web3labs')}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                {enscribeDomain}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
})
