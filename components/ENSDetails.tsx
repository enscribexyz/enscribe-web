import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  ShieldCheck,
  XCircle,
  TriangleAlert,
} from 'lucide-react'
import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { FullWidthProfile } from 'ethereum-identity-kit'
import { TextRecordsIdentityCard } from '@/components/ens/TextRecordsIdentityCard'
import { TechnicalDetailsAndAuditsPanel } from '@/components/ens/TechnicalDetailsAndAuditsPanel'
import { CompiledMetadataPanel } from '@/components/ens/CompiledMetadataPanel'
import { VerificationBadges } from '@/components/ens/VerificationBadges'
import { SecurityAuditBadges } from '@/components/ens/SecurityAuditBadges'
import { AttestationsPanel } from '@/components/ens/AttestationsPanel'
import { AssociatedENSNamesList } from '@/components/ens/AssociatedENSNamesList'
import { OwnedENSNamesList } from '@/components/ens/OwnedENSNamesList'
import { useENSDetails } from '@/hooks/useENSDetails'

interface ENSDetailsProps {
  address: string
  contractDeployerAddress: string | null
  contractDeployerName: string | null
  chainId?: number
  isContract: boolean
  proxyInfo?: {
    isProxy: boolean
    implementationAddress?: string
  }
  isNestedView?: boolean
  queriedENSName?: string
}

export default function ENSDetails({
  address,
  contractDeployerAddress,
  contractDeployerName,
  chainId,
  isContract,
  proxyInfo,
  isNestedView = false,
  queriedENSName,
}: ENSDetailsProps) {
  const {
    shouldShowLoading,
    error,
    primaryName,
    selectedForwardName,
    ensNames,
    userOwnedDomains,
    primaryNameExpiryDate,
    forwardNameExpiryDate,
    ensNameOwner,
    ensNameManager,
    ensNameManagerLoading,
    ensNameOwnerResolved,
    ensNameManagerResolved,
    tldOwner,
    tldManager,
    tldOwnerResolved,
    tldManagerResolved,
    deployerResolved,
    contractDeployerPrimaryName,
    implDeployerAddress,
    implDeployerName,
    verificationStatus,
    sourcifyMetadata,
    textRecords,
    hasAttestations,
    effectiveChainId,
    config,
    etherscanUrl,
    implementationExpanded,
    setImplementationExpanded,
    otherDetailsExpanded,
    setOtherDetailsExpanded,
    copied,
    copyToClipboard,
    toast,
    customProvider,
  } = useENSDetails({
    address,
    contractDeployerAddress,
    contractDeployerName,
    chainId,
    isContract,
    proxyInfo,
    queriedENSName,
  })

  // ─── JSX ───
  if (shouldShowLoading) {
    return (
      <Card className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <div className="pt-4">
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl">
        <CardContent className="p-6">
          <div className="text-red-500 dark:text-red-400">{error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Show primary name only (with blue tick) */}
          {primaryName &&
            (!queriedENSName ||
              queriedENSName.toLowerCase() === primaryName.toLowerCase()) && (
              <div className="space-y-6">
                {/* Full width profile card */}
                {!isContract && (
                  <div className="w-full scale-100 transform origin-top">
                    <FullWidthProfile addressOrName={primaryName} />
                  </div>
                )}

                {/* Details section */}
                <div className="space-y-2">
                  {/* Heading + Expiry badge in a single row */}
                  <div className="flex flex-wrap justify-between items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        {isContract &&
                          verificationStatus &&
                          primaryName &&
                          (verificationStatus.sourcify_verification ===
                            'exact_match' ||
                            verificationStatus.sourcify_verification ===
                              'match' ||
                            verificationStatus.etherscan_verification ===
                              'verified' ||
                            verificationStatus.blockscout_verification ===
                              'exact_match' ||
                            verificationStatus.blockscout_verification ===
                              'match') &&
                          (verificationStatus.diligence_audit ||
                            verificationStatus.openZepplin_audit ||
                            verificationStatus.cyfrin_audit) && (
                            <div className="relative group">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <ShieldCheck className="w-5 h-5 text-green-500 cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    Trusted - Named, Verified and Audited
                                    Contract
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                      </TooltipProvider>
                      <span className="text-xl text-gray-900 dark:text-white flex items-center gap-1.5 font-bold">
                        {primaryName}
                        {/* Always show primary name badge in this section */}
                        {primaryName && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="ml-1 inline-flex items-center justify-center h-8 w-8 cursor-default">
                                  <svg
                                    className="h-8 w-8 text-blue-500"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                    shape-rendering="geometricPrecision"
                                  >
                                    {/* Solid flower-like silhouette using overlapping petals */}
                                    <g fill="currentColor">
                                      <circle cx="12" cy="7" r="3" />
                                      <circle cx="15.5" cy="8.5" r="3" />
                                      <circle cx="17" cy="12" r="3" />
                                      <circle cx="15.5" cy="15.5" r="3" />
                                      <circle cx="12" cy="17" r="3" />
                                      <circle cx="8.5" cy="15.5" r="3" />
                                      <circle cx="7" cy="12" r="3" />
                                      <circle cx="8.5" cy="8.5" r="3" />
                                      {/* center to ensure no gaps */}
                                      <circle cx="12" cy="12" r="3.2" />
                                    </g>
                                    {/* White check mark */}
                                    <path
                                      d="M9.4 12.6l1.2 1.2 3.2-3.2"
                                      fill="none"
                                      stroke="white"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" align="center">
                                <p>Primary ENS Name is set for this contract</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-0"
                        onClick={() =>
                          copyToClipboard(primaryName || '', 'primary-name')
                        }
                      >
                        {copied['primary-name'] ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Get All Metadata Button */}
                      {isContract && primaryName && (
                        <Link
                          href={`/nameMetadata?name=${encodeURIComponent(primaryName)}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          >
                            View Metadata
                          </Button>
                        </Link>
                      )}
                      {/* Expiry badge */}
                      {primaryNameExpiryDate &&
                        primaryName &&
                        (() => {
                          const nameParts = primaryName.split('.')
                          const tld = nameParts[nameParts.length - 1]
                          const sld = nameParts[nameParts.length - 2]

                          const domainToShow = `${sld}.${tld}`
                          const now = new Date()
                          const expiryDate = new Date(
                            primaryNameExpiryDate * 1000,
                          )
                          const threeMonthsFromNow = new Date()
                          threeMonthsFromNow.setMonth(now.getMonth() + 3)

                          const isExpired = expiryDate < now
                          const isWithinThreeMonths =
                            !isExpired && expiryDate < threeMonthsFromNow
                          const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
                          const isInGracePeriod =
                            isExpired &&
                            now.getTime() - expiryDate.getTime() <
                              ninetyDaysInMs

                          let statusIcon
                          let statusText
                          let bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                          let textColorClass =
                            'text-green-600 dark:text-green-400'

                          if (isExpired && isInGracePeriod) {
                            statusIcon = (
                              <XCircle
                                className="inline-block mr-1 text-red-600 dark:text-red-400"
                                size={16}
                              />
                            )
                            statusText = `expired on ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-red-50 dark:bg-red-900/20'
                            textColorClass = 'text-red-600 dark:text-red-400'
                          } else if (isWithinThreeMonths) {
                            statusIcon = (
                              <AlertCircle
                                className="inline-block mr-1 text-yellow-600 dark:text-yellow-400"
                                size={16}
                              />
                            )
                            statusText = `expires on ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-yellow-50 dark:bg-yellow-900/20'
                            textColorClass =
                              'text-yellow-600 dark:text-yellow-400'
                          } else {
                            statusIcon = (
                              <CheckCircle
                                className="inline-block mr-1 text-green-600 dark:text-green-400"
                                size={16}
                              />
                            )
                            statusText = `valid until ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                            textColorClass =
                              'text-green-600 dark:text-green-400'
                          }

                          const showDomainSeparately =
                            domainToShow !== primaryName

                          return (
                            <div className="flex items-center">
                              {showDomainSeparately && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-gray-800 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm mr-2 cursor-pointer">
                                        {domainToShow}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-lg"
                                    >
                                      <div className="space-y-3 text-xs">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                          Organization Details
                                        </p>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Owner:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldOwnerResolved || tldOwner}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldOwnerResolved ||
                                                tldOwner ||
                                                'Loading...'}
                                            </Link>
                                            {tldOwner && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldOwner,
                                                    'tldOwner',
                                                  )
                                                }}
                                              >
                                                {copied['tldOwner'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Manager:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldManagerResolved || tldManager}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldManagerResolved ||
                                                tldManager ||
                                                'Loading...'}
                                            </Link>
                                            {tldManager && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldManager,
                                                    'tldManager',
                                                  )
                                                }}
                                              >
                                                {copied['tldManager'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${bgColorClass} ${textColorClass}`}
                              >
                                {statusIcon}
                                <span className="whitespace-nowrap">
                                  {statusText}
                                </span>
                              </span>
                            </div>
                          )
                        })()}
                    </div>
                  </div>

                  {/* ENS Name + copy + link below */}
                  {/* Removed separate row to align with expiry badge */}
                </div>
              </div>
            )}

          {/* Forward Resolution Name Display (show queried name if not primary, or selected forward name) */}
          {isContract &&
            ((queriedENSName &&
              (!primaryName ||
                queriedENSName.toLowerCase() !== primaryName.toLowerCase())) ||
              (selectedForwardName &&
                (!primaryName ||
                  selectedForwardName.toLowerCase() !==
                    primaryName?.toLowerCase()))) && (
              <div className="space-y-6">
                {/* Details section - SAME structure as primary name */}
                <div className="space-y-2">
                  {/* Heading + Expiry badge in a single row */}
                  <div className="flex flex-wrap justify-between items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xl text-gray-900 dark:text-white flex items-center gap-1.5 font-bold">
                              {queriedENSName || selectedForwardName}
                              <TriangleAlert className="h-5 w-5 text-yellow-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            <p>
                              {queriedENSName
                                ? 'This ENS name resolves to this address but is not set as the primary name'
                                : 'Warning: name only forward resolves to this address, no reverse record is set'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-0"
                        onClick={() =>
                          copyToClipboard(
                            queriedENSName || selectedForwardName || '',
                            'forward-name',
                          )
                        }
                      >
                        {copied['forward-name'] ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Get All Metadata Button */}
                      {(queriedENSName || selectedForwardName) && (
                        <Link
                          href={`/nameMetadata?name=${encodeURIComponent(queriedENSName || selectedForwardName || '')}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          >
                            View Metadata
                          </Button>
                        </Link>
                      )}
                      {/* Expiry badge */}
                      {forwardNameExpiryDate &&
                        (queriedENSName || selectedForwardName) &&
                        (() => {
                          const forwardName =
                            queriedENSName || selectedForwardName || ''
                          const nameParts = forwardName.split('.')
                          const tld = nameParts[nameParts.length - 1]
                          const sld = nameParts[nameParts.length - 2]

                          const domainToShow = `${sld}.${tld}`
                          const now = new Date()
                          const expiryDate = new Date(
                            forwardNameExpiryDate * 1000,
                          )
                          const threeMonthsFromNow = new Date()
                          threeMonthsFromNow.setMonth(now.getMonth() + 3)

                          const isExpired = expiryDate < now
                          const isWithinThreeMonths =
                            !isExpired && expiryDate < threeMonthsFromNow
                          const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
                          const isInGracePeriod =
                            isExpired &&
                            now.getTime() - expiryDate.getTime() <
                              ninetyDaysInMs

                          let statusIcon
                          let statusText
                          let bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                          let textColorClass =
                            'text-green-600 dark:text-green-400'

                          if (isExpired && isInGracePeriod) {
                            statusIcon = (
                              <XCircle
                                className="inline-block mr-1 text-red-600 dark:text-red-400"
                                size={16}
                              />
                            )
                            statusText = `expired on ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-red-50 dark:bg-red-900/20'
                            textColorClass = 'text-red-600 dark:text-red-400'
                          } else if (isWithinThreeMonths) {
                            statusIcon = (
                              <AlertCircle
                                className="inline-block mr-1 text-yellow-600 dark:text-yellow-400"
                                size={16}
                              />
                            )
                            statusText = `expires on ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-yellow-50 dark:bg-yellow-900/20'
                            textColorClass =
                              'text-yellow-600 dark:text-yellow-400'
                          } else {
                            statusIcon = (
                              <CheckCircle
                                className="inline-block mr-1 text-green-600 dark:text-green-400"
                                size={16}
                              />
                            )
                            statusText = `valid until ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                            textColorClass =
                              'text-green-600 dark:text-green-400'
                          }

                          const showDomainSeparately =
                            domainToShow !== forwardName

                          return (
                            <div className="flex items-center">
                              {showDomainSeparately && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-gray-800 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm mr-2 cursor-pointer">
                                        {domainToShow}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-lg"
                                    >
                                      <div className="space-y-3 text-xs">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                          Organization Details
                                        </p>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Owner:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldOwnerResolved || tldOwner}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldOwnerResolved ||
                                                tldOwner ||
                                                'Loading...'}
                                            </Link>
                                            {tldOwner && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldOwner,
                                                    'tldOwner',
                                                  )
                                                }}
                                              >
                                                {copied['tldOwner'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Manager:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldManagerResolved || tldManager}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldManagerResolved ||
                                                tldManager ||
                                                'Loading...'}
                                            </Link>
                                            {tldManager && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldManager,
                                                    'tldManager',
                                                  )
                                                }}
                                              >
                                                {copied['tldManager'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${bgColorClass} ${textColorClass}`}
                              >
                                {statusIcon}
                                <span className="whitespace-nowrap">
                                  {statusText}
                                </span>
                              </span>
                            </div>
                          )
                        })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* Contract Address Section - Moved here after ENS name */}
          <div>
            <div className="flex items-center">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {isContract ? 'Contract Address' : 'Account Address'}
              </h3>
              {isContract && proxyInfo?.isProxy && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300">
                  Proxy
                </span>
              )}
            </div>
            <div className="flex items-center mt-1">
              <p className="text-gray-900 dark:text-white font-mono text-sm break-all">
                {address}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2"
                onClick={() => copyToClipboard(address, 'address')}
              >
                {copied['address'] ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" className="ml-1" asChild>
                {isContract &&
                !primaryName &&
                !queriedENSName &&
                !selectedForwardName ? (
                  <Link
                    href={`/nameContract?contract=${address}`}
                    className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:shadow-xl hover:shadow-pink-500/50 focus:ring-4 focus:ring-pink-500/50 group transition-all duration-300 hover:-translate-y-1 px-2 py-2 font-medium rounded-md cursor-pointer"
                  >
                    <span className="relative z-10 px-1.5 py-1 text-sm md:text-base font-bold text-white dark:text-white">
                      ✨Name It!
                    </span>
                    <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-purple-600/0 via-white/70 to-purple-600/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none blur-sm"></span>
                    <span className="absolute -inset-1 rounded-md bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 opacity-0 group-hover:opacity-70 group-hover:blur-md transition-all duration-300 pointer-events-none"></span>
                  </Link>
                ) : (
                  <a
                    href={`${etherscanUrl}address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </Button>
            </div>
          </div>

          {/* Text Records Display for Contracts */}
          {isContract &&
            (queriedENSName || primaryName || selectedForwardName) &&
            Object.keys(textRecords).length > 0 && (
              <div className="mt-6 space-y-6">
                {/* Name/Alias, Description, URL with Avatar and Header */}
                <TextRecordsIdentityCard textRecords={textRecords} />

                {/* Technical Details and Security Audits Grid */}
                <TechnicalDetailsAndAuditsPanel textRecords={textRecords} />
              </div>
            )}

          {/* Compiled Metadata - Independent Section (Shows for Sourcify-verified contracts) */}
          {isContract && sourcifyMetadata && (
            <CompiledMetadataPanel sourcifyMetadata={sourcifyMetadata} />
          )}

                    {/* Management details - Shows for all contracts */}
          {isContract && (
            <div className="mt-6">
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Management details
              </h3> */}
              <div
                className={`grid grid-cols-1 ${queriedENSName || primaryName || selectedForwardName ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}
              >
                {/* Card 1: Contract Deployer (always shown) */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Contract Deployer
                  </h4>
                  {contractDeployerAddress ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/explore/${effectiveChainId}/${deployerResolved || contractDeployerPrimaryName || contractDeployerAddress}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs break-all"
                      >
                        {deployerResolved ||
                          contractDeployerPrimaryName ||
                          contractDeployerAddress}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(
                            contractDeployerAddress,
                            'contractDeployerAddress',
                          )
                        }}
                      >
                        {copied['contractDeployerAddress'] ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      N/A
                    </p>
                  )}
                </div>

                {/* Card 2: Manager (only show if ENS name exists) */}
                {(queriedENSName || primaryName || selectedForwardName) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      Manager
                    </h4>
                    {ensNameManagerLoading ? (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Loading...
                      </p>
                    ) : ensNameManager ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/explore/${effectiveChainId}/${ensNameManagerResolved || ensNameManager}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs break-all"
                        >
                          {ensNameManagerResolved || ensNameManager}
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(ensNameManager, 'ensNameManager')
                          }}
                        >
                          {copied['ensNameManager'] ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Not available
                      </p>
                    )}
                  </div>
                )}

                {/* Card 3: Parent (only show if ENS name exists) */}
                {(queriedENSName || primaryName || selectedForwardName) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      Parent
                    </h4>
                    {(() => {
                      const currentName =
                        queriedENSName ||
                        primaryName ||
                        selectedForwardName ||
                        ''
                      const parts = currentName.split('.')
                      if (parts.length > 2) {
                        const parentName = parts.slice(1).join('.')
                        return (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/nameMetadata?name=${encodeURIComponent(parentName)}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs break-all"
                            >
                              {parentName}
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(parentName, 'parentName')
                              }}
                            >
                              {copied['parentName'] ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )
                      }
                      return (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          No parent (top-level domain)
                        </span>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other Details - Card-based Expandable Section */}
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Card Header - Clickable */}
              <div
                className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                onClick={() => setOtherDetailsExpanded(!otherDetailsExpanded)}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Other Details
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {otherDetailsExpanded
                      ? 'Click to collapse'
                      : 'Click to expand'}
                  </span>
                  {otherDetailsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Card Content - Expandable */}
              {otherDetailsExpanded && (
                <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-6 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
                  {isContract &&
                    proxyInfo?.isProxy &&
                    proxyInfo.implementationAddress &&
                    !isNestedView && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Implementation Address
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setImplementationExpanded(!implementationExpanded)
                            }
                            className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400"
                          >
                            {implementationExpanded
                              ? 'Hide Details'
                              : 'Show Details'}
                            {implementationExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <div className="flex items-center mt-1">
                          <code className="text-sm font-mono break-all text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 cursor-pointer">
                            <Link
                              href={`/explore/${effectiveChainId}/${proxyInfo.implementationAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {proxyInfo.implementationAddress}
                            </Link>
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            onClick={() =>
                              proxyInfo.implementationAddress &&
                              copyToClipboard(
                                proxyInfo.implementationAddress,
                                'implementation',
                              )
                            }
                          >
                            {copied['implementation'] ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1"
                            asChild
                          >
                            <a
                              href={`${etherscanUrl}address/${proxyInfo.implementationAddress}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>

                        {implementationExpanded && (
                          <div className="mt-4 border-l-2 border-blue-300 dark:border-blue-700 pl-4 py-1">
                            <div className="mb-2 text-sm font-medium text-blue-600 dark:text-blue-400">
                              Implementation Contract Details
                            </div>
                            <ENSDetails
                              address={proxyInfo.implementationAddress}
                              contractDeployerAddress={implDeployerAddress}
                              contractDeployerName={implDeployerName}
                              chainId={effectiveChainId}
                              isContract={true}
                              isNestedView={true}
                            />
                          </div>
                        )}
                      </div>
                    )}

                  {/* Contract Verification Status */}
                  {isContract && verificationStatus && (
                    <VerificationBadges
                      verificationStatus={verificationStatus}
                      address={address}
                      etherscanUrl={etherscanUrl}
                      chainId={effectiveChainId!}
                      config={config}
                    />
                  )}

                  {/* Contract Security Audits */}
                  {isContract && verificationStatus && (
                    <SecurityAuditBadges verificationStatus={verificationStatus} />
                  )}

                  {isContract && (
                    <AttestationsPanel
                      hasAttestations={hasAttestations}
                      address={address}
                      chainId={effectiveChainId}
                    />
                  )}

                  <AssociatedENSNamesList
                    ensNames={ensNames}
                    config={config}
                  />

                  {/* Owned ENS Names */}
                  <OwnedENSNamesList
                    userOwnedDomains={userOwnedDomains}
                    config={config}
                    onNavigateToDomain={async (domainName) => {
                      try {
                        if (customProvider) {
                          const { getEnsAddress: resolveEnsName } = await import('viem/actions')
                          const resolvedAddress = await resolveEnsName(customProvider, { name: domainName })
                          if (resolvedAddress) {
                            window.location.href = `/explore/${effectiveChainId}/${resolvedAddress}`
                          } else {
                            toast({
                              title: "Name doesn't resolve",
                              description: `${domainName} doesn't resolve to any address`,
                              variant: 'destructive',
                            })
                          }
                        }
                      } catch (error) {
                        console.error('Error resolving name:', error)
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
