import React from 'react'
import { useNameContract } from '@/hooks/useNameContract'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CHAINS } from '../utils/constants'
import Link from 'next/link'
import Image from 'next/image'
import SetNameStepsModal from './SetNameStepsModal'
import { Copy, Check, Info, ChevronDown, ChevronRight } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ContractStatusPanel } from '@/components/naming/ContractStatusPanel'
import { SubmitButton } from '@/components/naming/SubmitButton'
import { L2ChainPickerDialog } from '@/components/naming/L2ChainPickerDialog'

export default function NameContract() {
  const {
    // Hook instances
    chain,
    isConnected,
    enscribeDomain,
    isSafeWallet,
    copied,
    copyToClipboard,
    resetCopied,

    // State variables
    existingContractAddress,
    setExistingContractAddress,
    label,
    setLabel,
    parentType,
    setParentType,
    showRegisterDialog,
    setShowRegisterDialog,
    parentName,
    setParentName,
    fetchingENS,
    userOwnedDomains,
    showENSModal,
    setShowENSModal,
    error,
    setError,
    loading,
    isAddressEmpty,
    isAddressInvalid,
    isContractExists,
    isOwnable,
    isContractOwner,
    isReverseClaimable,
    isPrimaryNameSet,
    isOwnableOptimism,
    isOwnableArbitrum,
    isOwnableScroll,
    isOwnableBase,
    isOwnableLinea,
    modalOpen,
    setModalOpen,
    modalSteps,
    modalTitle,
    modalSubtitle,
    selectedL2ChainNames,
    setSelectedL2ChainNames,
    skipL1Naming,
    setSkipL1Naming,
    showL2Modal,
    setShowL2Modal,
    sldAsPrimary,
    setSldAsPrimary,
    ensModalFromPicker,
    setEnsModalFromPicker,
    ensNameChosen,
    setEnsNameChosen,
    selectedAction,
    setSelectedAction,
    isAdvancedOpen,
    setIsAdvancedOpen,
    callDataList,
    setCallDataList,
    allCallData,
    setAllCallData,
    isCallDataOpen,
    setIsCallDataOpen,

    // Derived constants
    L2_CHAIN_OPTIONS,
    isUnsupportedL2Chain,
    unsupportedL2Name,

    // Functions
    populateName,
    generateCallData,
    fetchUserOwnedDomains,
    checkENSReverseResolution,
    isEmpty,
    checkIfContractExists,
    checkIfContractOwner,
    checkIfOwnable,
    checkIfOwnableOnL2Chains,
    checkIfReverseClaimable,
    recordExist,
    setPrimaryName,
    setIsPrimaryNameSet,
    setDropdownValue,
  } = useNameContract()

  return (
    <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
        Name Contract
      </h2>
      {(!isConnected || isUnsupportedL2Chain) && (
        <p className="text-red-500">
          {!isConnected
            ? 'Please connect your wallet.'
            : `To name your contract on ${unsupportedL2Name}, change to the ${chain?.id === CHAINS.OPTIMISM || chain?.id === CHAINS.ARBITRUM || chain?.id === CHAINS.SCROLL || chain?.id === CHAINS.LINEA || chain?.id === CHAINS.BASE ? 'Ethereum Mainnet' : 'Sepolia'} network and use the Naming on L2 Chain option.`}
        </p>
      )}

      <div
        className={`space-y-6 mt-6 ${!isConnected || isUnsupportedL2Chain ? 'pointer-events-none opacity-50' : ''}`}
      >
        <label className="block text-gray-700 dark:text-gray-300">
          Contract Address
        </label>
        <Input
          required={true}
          type="text"
          value={existingContractAddress}
          onChange={async (e) => {
            setExistingContractAddress(e.target.value)
            await checkIfContractExists(e.target.value)
            await checkIfContractOwner(e.target.value)
            await checkIfOwnable(e.target.value)
            await checkIfOwnableOnL2Chains(e.target.value)
            await checkIfReverseClaimable(e.target.value)
          }}
          placeholder="0xa56..."
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200}`}
        />

        {/* Contract Status Information */}
        <ContractStatusPanel
          isAddressEmpty={isAddressEmpty}
          isContractOwner={isContractOwner}
          isOwnable={isOwnable}
          isReverseClaimable={isReverseClaimable}
          isOwnableOptimism={isOwnableOptimism}
          isOwnableArbitrum={isOwnableArbitrum}
          isOwnableScroll={isOwnableScroll}
          isOwnableBase={isOwnableBase}
          isOwnableLinea={isOwnableLinea}
          chainName={chain?.name}
        />

        {/* Error message for invalid Ownable/ReverseClaimable bytecode */}
        {!isAddressEmpty &&
          !isAddressInvalid &&
          isContractExists === false &&
          (() => {
            const isOnL1 =
              chain?.id === CHAINS.MAINNET || chain?.id === CHAINS.SEPOLIA
            if (!isOnL1) return true

            const allL2ChecksComplete =
              isOwnableOptimism !== null &&
              isOwnableArbitrum !== null &&
              isOwnableScroll !== null &&
              isOwnableBase !== null &&
              isOwnableLinea !== null

            return (
              allL2ChecksComplete &&
              !isOwnableOptimism &&
              !isOwnableArbitrum &&
              !isOwnableScroll &&
              !isOwnableBase &&
              !isOwnableLinea
            )
          })() && (
            <p className="text-red-600 dark:text-red-300">
              {chain?.name}: Contract doesn&apos;t exist
            </p>
          )}

        {/* Toggle Buttons */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            type="button"
            className={`${
              selectedAction === 'subname'
                ? 'bg-green-600 text-white ring-2 ring-green-500 ring-offset-2 dark:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-green-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-green-800'
            }`}
            onClick={() => {
              if (selectedAction === 'subname') {
                setSelectedAction(null)
              } else {
                setSelectedAction('subname')
                setLabel('')
                setParentName(enscribeDomain)
                setEnsNameChosen(false)
                setSldAsPrimary(false)
                setError('')
              }
            }}
          >
            Create New Name
          </Button>
          <Button
            type="button"
            className={`${
              selectedAction === 'pick'
                ? 'bg-blue-600 text-white ring-2 ring-blue-500 ring-offset-2 dark:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-blue-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-blue-800'
            }`}
            onClick={() => {
              if (selectedAction === 'pick') {
                setSelectedAction(null)
              } else {
                setSelectedAction('pick')
                setParentName('')
                setLabel('')
                setEnsNameChosen(false)
                setSldAsPrimary(true)
                setError('')
              }
            }}
          >
            Use Existing Name
          </Button>
        </div>

        {!isAddressEmpty &&
          !isAddressInvalid &&
          isContractExists === true &&
          !isOwnable &&
          !isReverseClaimable && (
            <p className="text-yellow-600 dark:text-yellow-300">
              {chain?.name}: Contract address does not extend{' '}
              <Link
                href="https://docs.openzeppelin.com/contracts/access-control#ownership-and-ownable"
                className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                Ownable
              </Link>{' '}
              or{' '}
              <Link
                href="https://eips.ethereum.org/EIPS/eip-173"
                className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                ERC-173
              </Link>{' '}
              or{' '}
              <Link
                href="https://docs.ens.domains/web/naming-contracts#reverseclaimersol"
                className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                ReverseClaimable
              </Link>
              . You can only{' '}
              <Link
                href="https://docs.ens.domains/learn/resolution#forward-resolution"
                className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                forward resolve
              </Link>{' '}
              this name.{' '}
              <Link
                href="https://www.enscribe.xyz/docs/"
                className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                Why is this?
              </Link>
            </p>
          )}
        {selectedAction && (
          <>
            <label className="block text-gray-700 dark:text-gray-300">
              Contract Name
            </label>
            <div className={'flex items-center space-x-2'}>
              <Input
                type="text"
                required
                value={label}
                onChange={(e) => {
                  const newVal = e.target.value
                  setLabel(newVal)
                  if (ensNameChosen) {
                    setEnsNameChosen(false)
                  }
                  setError('')
                }}
                onBlur={() => {
                  if (selectedAction === 'subname') {
                    void checkENSReverseResolution()
                  }
                }}
                placeholder={
                  selectedAction === 'subname'
                    ? 'myawesomeapp'
                    : 'myawesomeapp.mydomain.eth'
                }
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              />
              {selectedAction === 'subname' ? (
                <Button
                  onClick={populateName}
                  className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:shadow-xl hover:shadow-pink-500/50 focus:ring-4 focus:ring-pink-500/50 group transition-all duration-300 hover:-translate-y-1 p-2.5 font-medium"
                >
                  <span className="relative z-10 p-2">✨Generate Name</span>
                  <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-purple-600/0 via-white/70 to-purple-600/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none blur-sm"></span>
                  <span className="absolute -inset-1 rounded-md bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 opacity-0 group-hover:opacity-70 group-hover:blur-md transition-all duration-300 pointer-events-none"></span>
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setEnsModalFromPicker(false)
                    setShowENSModal(true)
                    fetchUserOwnedDomains()
                  }}
                  className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50"
                >
                  Select Name
                </Button>
              )}
            </div>
          </>
        )}

        {selectedAction === 'subname' && (
          <>
            <label className="block text-gray-700 dark:text-gray-300">
              Parent Domain
            </label>
            {fetchingENS ? (
              <p className="text-gray-500 dark:text-gray-400">
                Fetching ENS domains...
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={parentName}
                  onChange={(e) => {
                    setParentName(e.target.value)
                    setParentType(
                      e.target.value === enscribeDomain ? 'web3labs' : 'own',
                    )
                  }}
                  onBlur={async () => {
                    await recordExist()
                  }}
                  placeholder="mydomain.eth"
                  className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
                <Button
                  onClick={() => {
                    setParentName('')
                    setEnsModalFromPicker(true)
                    setShowENSModal(true)
                    fetchUserOwnedDomains()
                  }}
                  className="bg-gray-900 text-white dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white"
                >
                  Select Domain
                </Button>
              </div>
            )}
          </>
        )}

        {/* Full Contract Name Preview */}
        {((selectedAction === 'subname' &&
          !isEmpty(label) &&
          !isEmpty(parentName)) ||
          (selectedAction === 'pick' && !isEmpty(label))) && (
          <div className="mt-4 mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-5">
              Full Contract Name
            </label>
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 flex items-center">
              <div className="flex-1 font-medium text-blue-800 dark:text-blue-300 text-sm break-all">
                {selectedAction === 'pick'
                  ? label
                  : `${label}.${parentName}`}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Options - Only show on mainnet or sepolia */}
        {(chain?.id === CHAINS.MAINNET || chain?.id === CHAINS.SEPOLIA) && (
          <div className="mt-4 mb-4">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {isAdvancedOpen ? (
                <ChevronDown className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
              <span className="text-lg font-medium">Advanced Options</span>
            </button>

            {isAdvancedOpen && (
              <div className="mt-4 space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="block text-gray-700 dark:text-gray-300">
                      Naming on L2 Chains
                    </label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Select which L2 chains to set names on. This will
                            add additional steps to switch to each selected chain
                            and set the primary name there as well.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {selectedL2ChainNames.length > 0 && (
                    <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                      <span className="text-gray-700 dark:text-gray-300">
                        Skip L1 Naming
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-gray-600 dark:text-gray-300 text-xs select-none">
                              i
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>
                              Select this if you want to name only on the
                              selected L2 chains and skip L1 naming (forward and
                              reverse resolution). The subname will still be
                              created on L1 if needed.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Checkbox
                        checked={skipL1Naming}
                        onCheckedChange={(val) =>
                          setSkipL1Naming(Boolean(val))
                        }
                        aria-label="Skip L1 Naming"
                      />
                    </div>
                  )}
                </div>

                {/* Selected L2 Chains Display */}
                {selectedL2ChainNames.length > 0 && (
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {selectedL2ChainNames.map((chainName, index) => {
                        const logoSrc =
                          chainName === 'Optimism'
                            ? '/images/optimism.svg'
                            : chainName === 'Arbitrum'
                              ? '/images/arbitrum.svg'
                              : chainName === 'Scroll'
                                ? '/images/scroll.svg'
                                : chainName === 'Base'
                                  ? '/images/base.svg'
                                  : '/images/linea.svg'
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm"
                          >
                            <Image
                              src={logoSrc}
                              alt={`${chainName} logo`}
                              width={14}
                              height={14}
                            />
                            <span>{chainName}</span>
                            <button
                              onClick={() =>
                                setSelectedL2ChainNames((prev) =>
                                  prev.filter((name) => name !== chainName),
                                )
                              }
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* L2 Chain chooser button */}
                <div>
                  <Button
                    type="button"
                    className="bg-gray-900 text-white dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white"
                    onClick={() => setShowL2Modal(true)}
                    disabled={
                      L2_CHAIN_OPTIONS.filter(
                        (c) => !selectedL2ChainNames.includes(c),
                      ).length === 0
                    }
                  >
                    Choose L2 Chains
                  </Button>
                </div>

                {/* Call data section */}
                {callDataList.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsCallDataOpen(!isCallDataOpen)}
                      className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
                    >
                      {isCallDataOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">Call data</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({callDataList.length} transaction
                        {callDataList.length !== 1 ? 's' : ''})
                      </span>
                    </button>

                    {isCallDataOpen && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {callDataList.length} transaction
                              {callDataList.length !== 1 ? 's' : ''} will be
                              executed:
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() =>
                                copyToClipboard(allCallData, 'allCallData')
                              }
                            >
                              {copied['allCallData'] ? (
                                <>
                                  <Check className="h-3 w-3 mr-1 text-green-500" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3 mr-1" />
                                  Copy All
                                </>
                              )}
                            </Button>
                          </div>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {callDataList.map((callData, index) => (
                              <div
                                key={index}
                                className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs font-mono break-all"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-gray-800 dark:text-gray-200 flex-1 min-w-0">
                                    {callData}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={() => {
                                      const parts = callData.split(': ')
                                      const hexData =
                                        parts.length > 1 ? parts[1] : callData
                                      copyToClipboard(
                                        hexData,
                                        `callData-${index}`,
                                      )
                                    }}
                                  >
                                    {copied[`callData-${index}`] ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ENS Selection Modal */}
      <Dialog open={showENSModal} onOpenChange={setShowENSModal}>
        <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 shadow-lg rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              {selectedAction === 'pick'
                ? 'Choose Your ENS Name'
                : 'Choose Domain'}
            </DialogTitle>
          </DialogHeader>

          {selectedAction === 'subname' && (
            <div className="space-y-6 mb-6">
              {/* Choose Your Own Domain */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Your Domains
                </h3>
                {userOwnedDomains.length > 0 ? (
                  <DomainList
                    domains={userOwnedDomains}
                    maxHeightClass="max-h-[30vh]"
                    onSelectDomain={(domain) => {
                      setParentName(domain)
                      setParentType(
                        domain === enscribeDomain ? 'web3labs' : 'own',
                      )
                      setEnsNameChosen(true)
                      setShowENSModal(false)
                    }}
                  />
                ) : (
                  <div className="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                    <p className="text-gray-500 dark:text-gray-400">
                      No ENS domains found for your address.
                    </p>
                  </div>
                )}
              </div>

              {/* Choose Enscribe's Domain */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                  Other Domains
                </h3>
                <div
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                  onClick={() => {
                    setParentName(enscribeDomain)
                    setParentType('web3labs')
                    setEnsNameChosen(true)
                    setShowENSModal(false)
                  }}
                >
                  <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                    {enscribeDomain}
                  </span>
                </div>

                {/* Purchase New Domain button */}
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRegisterDialog(true)
                      setShowENSModal(false)
                    }}
                    className="bg-gray-900 dark:bg-blue-700 text-white rounded-full"
                  >
                    Purchase New Domain
                  </Button>
                </div>
              </div>
            </div>
          )}

          {selectedAction !== 'subname' && (
            <>
              {fetchingENS ? (
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
              ) : (
                <div className="space-y-4 px-1">
                  {userOwnedDomains.length > 0 ? (
                    <DomainList
                      domains={userOwnedDomains}
                      maxHeightClass="max-h-[50vh]"
                      onSelectDomain={(domain) => {
                        const parts = domain.split('.')
                        if (ensModalFromPicker) {
                          setParentName(domain)
                        } else if (
                          parts.length >= 2 &&
                          parts[0] &&
                          parts[parts.length - 1]
                        ) {
                          setSldAsPrimary(true)
                          setLabel(domain)
                        } else if (sldAsPrimary) {
                          setLabel(domain)
                        } else {
                          setParentName(domain)
                        }
                        setEnsNameChosen(true)
                        setShowENSModal(false)
                      }}
                    />
                  ) : (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-md">
                      <p className="text-gray-500 dark:text-gray-400">
                        No ENS domains found for your address.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* L2 Selection Modal */}
      <L2ChainPickerDialog
        open={showL2Modal}
        onClose={() => setShowL2Modal(false)}
        chainOptions={L2_CHAIN_OPTIONS}
        selectedChains={selectedL2ChainNames}
        onToggleChain={(chainName) => {
          if (selectedL2ChainNames.includes(chainName)) {
            setSelectedL2ChainNames((prev) =>
              prev.filter((n) => n !== chainName),
            )
          } else {
            setSelectedL2ChainNames((prev) => [...prev, chainName])
          }
        }}
      />

      {/* Register New Name Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 shadow-lg rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Register New Domain
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Visit the ENS app to register a new domain. Once you are done,
              come back to Enscribe to name your contract.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-6 text-gray-900 dark:text-gray-300">
            <Button
              variant="outline"
              onClick={() => {
                setShowRegisterDialog(false)
                setParentType('web3labs')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const ensAppUrl =
                  chain?.id === CHAINS.SEPOLIA
                    ? 'https://sepolia.app.ens.domains/'
                    : 'https://app.ens.domains/'
                window.open(ensAppUrl, '_blank')
                setShowRegisterDialog(false)
                setParentType('web3labs')
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              Go to ENS App
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <SubmitButton
        loading={loading}
        disabled={
          !isConnected ||
          loading ||
          isAddressEmpty ||
          isAddressInvalid ||
          (isEmpty(label) &&
            !(selectedAction === 'pick' && ensNameChosen)) ||
          isUnsupportedL2Chain ||
          parentType === 'register'
        }
        onClick={() => setPrimaryName()}
      />

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-md p-3 break-words max-w-full overflow-hidden">
          <strong>Error:</strong> {error}
        </div>
      )}

      <SetNameStepsModal
        open={modalOpen}
        onClose={(result) => {
          setModalOpen(false)
          if (result?.startsWith('ERROR')) {
            const errorMessage = result.replace('ERROR: ', '')
            setError(errorMessage)
            return
          }

          if (result === 'INCOMPLETE') {
            setError(
              'Steps not completed. Please complete all steps before closing.',
            )
          } else {
            setExistingContractAddress('')
            setLabel('')
            setError('')
            setParentType('web3labs')
            setParentName(enscribeDomain)
            setIsPrimaryNameSet(false)
            setSelectedL2ChainNames([])
            setDropdownValue('')
            setSkipL1Naming(false)
            setIsAdvancedOpen(false)
            setCallDataList([])
            resetCopied()
            setAllCallData('')
            setIsCallDataOpen(false)
          }
        }}
        title={modalTitle}
        subtitle={modalSubtitle}
        steps={modalSteps}
        contractAddress={existingContractAddress}
        ensName={
          selectedAction === 'pick' ? label : `${label}.${parentName}`
        }
        isPrimaryNameSet={isPrimaryNameSet}
        isSafeWallet={isSafeWallet}
      />
    </div>
  )
}

/** Inline helper: groups domains by 2LD and renders as pill lists */
function DomainList({
  domains,
  maxHeightClass,
  onSelectDomain,
}: {
  domains: string[]
  maxHeightClass: string
  onSelectDomain: (domain: string) => void
}) {
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

  const sorted2LDs = Object.keys(domainGroups).sort()

  return (
    <div className={`${maxHeightClass} overflow-y-auto pr-1`}>
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
          <div className="pt-2">
            <div className="flex flex-wrap gap-2">
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
