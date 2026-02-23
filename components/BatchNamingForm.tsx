import React from 'react'
import { useBatchNaming, L2_CHAIN_OPTIONS } from '@/hooks/useBatchNaming'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { CHAINS } from '../utils/constants'
import { Info, ChevronDown, ChevronRight } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Image from 'next/image'
import SetNameStepsModal from './SetNameStepsModal'
import { ENSDomainPickerModal } from '@/components/naming/ENSDomainPickerModal'
import { L2ChainPickerDialog } from '@/components/naming/L2ChainPickerDialog'
import { CallDataPanel } from '@/components/naming/CallDataPanel'
import { BatchEntryRow } from '@/components/naming/BatchEntryRow'

export default function BatchNamingForm() {
  const {
    isConnected,
    chain,
    enscribeDomain,
    isSafeWallet,
    batchEntries,
    setBatchEntries,
    parentName,
    setParentName,
    parentType,
    setParentType,
    error,
    setError,
    loading,
    showL2Modal,
    setShowL2Modal,
    selectedL2ChainNames,
    setSelectedL2ChainNames,
    skipL1Naming,
    setSkipL1Naming,
    modalOpen,
    setModalOpen,
    modalSteps,
    modalTitle,
    modalSubtitle,
    showENSModal,
    setShowENSModal,
    fetchingENS,
    userOwnedDomains,
    isAdvancedOpen,
    setIsAdvancedOpen,
    callDataList,
    allCallData,
    isCallDataOpen,
    setIsCallDataOpen,
    copied,
    copyToClipboard,
    focusedInputId,
    setFocusedInputId,
    shouldTruncateAddress,
    truncatedAddresses,
    isUnsupportedL2Chain,
    unsupportedL2Name,
    operatorAccess,
    accessLoading,
    handleGrantAccess,
    handleRevokeAccess,
    fileInputRef,
    addressInputRefs,
    addEntry,
    updateEntry,
    removeEntry,
    fetchUserOwnedDomains,
    downloadTemplate,
    hasValidationErrors,
    handleCsvUpload,
    handleBatchNaming,
    checkIfAddressNeedsTruncation,
    resetCopied,
  } = useBatchNaming()

  return (
    <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
        Batch Naming
      </h2>
      {(!isConnected || isUnsupportedL2Chain) && (
        <p className="text-red-500 mt-4">
          {!isConnected
            ? 'Please connect your wallet.'
            : `To batch name contracts on ${unsupportedL2Name}, change to the ${chain?.id === CHAINS.OPTIMISM || chain?.id === CHAINS.ARBITRUM || chain?.id === CHAINS.SCROLL || chain?.id === CHAINS.LINEA || chain?.id === CHAINS.BASE ? 'Ethereum Mainnet' : 'Sepolia'} network and use the Naming on L2 Chains option.`}
        </p>
      )}

    <div
        className={`space-y-6 mt-6 ${!isConnected || isUnsupportedL2Chain ? 'pointer-events-none opacity-50' : ''}`}
      >
      {/* Parent Name */}

        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span>Parent Domain</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Batch Naming requires operator access of ENS name to create subnames and set forward resolutions. It can be revoked after naming completes.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={parentName}
            onChange={(e) => {
              setParentName(e.target.value)
              setParentType(e.target.value === enscribeDomain ? 'web3labs' : 'own')
            }}
            placeholder="mydomain.eth"
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <Button
            onClick={() => {
              setShowENSModal(true)
              fetchUserOwnedDomains()
            }}
            className="bg-gray-900 text-white dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white"
                >
            Select Domain
          </Button>
          {operatorAccess && parentName && parentType !== 'web3labs' && (
            <Button
              variant="destructive"
              disabled={accessLoading}
              onClick={handleRevokeAccess}
            >
              {accessLoading ? 'Revoking...' : 'Revoke Access'}
            </Button>
          )}
          {!operatorAccess && parentName && parentType !== 'web3labs' && (
            <Button
              disabled={accessLoading}
              onClick={handleGrantAccess}
            >
              {accessLoading ? 'Granting...' : 'Grant Access'}
            </Button>
          )}
        </div>
        {parentName && parentType !== 'web3labs' && (
          <p className="text-sm text-yellow-600 mt-2">
            {operatorAccess
              ? 'Note: You can revoke Operator role from Enscribe V2 here.'
              : 'Note: You can grant Operator role to Enscribe V2 here, otherwise it will be requested during batch naming.'}
          </p>
        )}


      {/* Contracts Table */}

        <label className="block text-gray-700 dark:text-gray-300">
          Contracts
        </label>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
          {batchEntries.map((entry, index) => {
            // Pre-compute batch separator metadata
            let showBatchSeparator = false
            let batchLabel = ''
            if (parentName && index > 0) {
              const prevEntry = batchEntries[index - 1]
              let currFullName = entry.label
              if (entry.label && !entry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
                currFullName = `${entry.label}.${parentName}`
              }
              const currParts = currFullName.split('.')
              const parentParts = parentName.split('.')
              const currLevel = currParts.length - parentParts.length
              const currImmediateParent = currLevel === 1 ? parentName : currParts.slice(1).join('.')
              let prevFullName = prevEntry.label
              if (prevEntry.label && !prevEntry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
                prevFullName = `${prevEntry.label}.${parentName}`
              }
              const prevParts = prevFullName.split('.')
              const prevLevel = prevParts.length - parentParts.length
              const prevImmediateParent = prevLevel === 1 ? parentName : prevParts.slice(1).join('.')
              if (currLevel !== prevLevel || currImmediateParent !== prevImmediateParent) {
                showBatchSeparator = true
                batchLabel = `names under "${currImmediateParent}"`
              }
            } else if (parentName && index === 0 && entry.label) {
              let currFullName = entry.label
              if (entry.label && !entry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
                currFullName = `${entry.label}.${parentName}`
              }
              const currParts = currFullName.split('.')
              const parentParts = parentName.split('.')
              const currLevel = currParts.length - parentParts.length
              const currImmediateParent = currLevel === 1 ? parentName : currParts.slice(1).join('.')
              batchLabel = `names under "${currImmediateParent}"`
              showBatchSeparator = true
            }
            const isAutoGenerated = entry.id.startsWith('zero-') &&
              entry.address === '0x0000000000000000000000000000000000000000'
            return (
              <BatchEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                parentName={parentName}
                showBatchSeparator={showBatchSeparator}
                batchLabel={batchLabel}
                isAutoGenerated={isAutoGenerated}
                canRemove={batchEntries.length > 1 && !isAutoGenerated}
                focusedInputId={focusedInputId}
                shouldTruncateAddress={shouldTruncateAddress}
                truncatedAddresses={truncatedAddresses}
                onUpdate={updateEntry}
                onRemove={removeEntry}
                onFocus={(id) => setFocusedInputId(id)}
                onBlur={(id, address) => {
                  setFocusedInputId(null)
                  if (address) checkIfAddressNeedsTruncation(id, address)
                }}
                addressInputRef={(el) => {
                  addressInputRefs.current[entry.id] = el
                  if (el && entry.address) {
                    setTimeout(() => checkIfAddressNeedsTruncation(entry.id, entry.address), 0)
                  }
                }}
              />
            )
          })}

          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={addEntry}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              Add contract
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              Upload CSV
            </button>
            <button
              onClick={downloadTemplate}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
            >
              Download Template
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </div>
        </div>


      {/* Advanced Options */}
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
                        Select which L2 chains to set coin types for. This will add the corresponding coin types for all contracts and add
                            additional steps to switch to each selected chain and set the primary name there as well.
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
                          Select this if you want to name only on the selected L2 chains and skip L1 naming (cointype 60).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Checkbox
                    checked={skipL1Naming}
                    onCheckedChange={(val) => setSkipL1Naming(Boolean(val))}
                    aria-label="Skip L1 Naming"
                  />
                </div>
              )}
            </div>

            {/* Selected L2 Chains Display */}
            {selectedL2ChainNames.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {selectedL2ChainNames.map((chainName) => {
                    const logoSrc =
                      chainName === 'Optimism' ? '/images/optimism.svg' :
                      chainName === 'Arbitrum' ? '/images/arbitrum.svg' :
                      chainName === 'Scroll' ? '/images/scroll.svg' :
                      chainName === 'Base' ? '/images/base.svg' :
                      '/images/linea.svg'

                    return (
                      <div key={chainName} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                        <Image src={logoSrc} alt={chainName} width={14} height={14} />
                        <span>{chainName}</span>
                        <button
                          onClick={() => setSelectedL2ChainNames(selectedL2ChainNames.filter(c => c !== chainName))}
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
                disabled={L2_CHAIN_OPTIONS.filter(c => !selectedL2ChainNames.includes(c)).length === 0}
              >
                Choose L2 Chains
              </Button>
            </div>


            {/* Call data section */}
            <CallDataPanel
              callDataList={callDataList}
              allCallData={allCallData}
              isCallDataOpen={isCallDataOpen}
              onToggle={() => setIsCallDataOpen(!isCallDataOpen)}
              copied={copied}
              onCopy={copyToClipboard}
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleBatchNaming}
        disabled={loading || !isConnected || !parentName || hasValidationErrors()}
        className="relative overflow-hidden w-full py-6 text-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus:ring-4 focus:ring-blue-500/30 group disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundSize: '200% 100%' }}
      >
        <span className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-x-12 group-hover:animate-shimmer pointer-events-none"></span>
        <span className="absolute bottom-0 right-0 w-12 h-12 bg-white/20 rounded-full blur-xl group-hover:animate-pulse pointer-events-none"></span>

        {loading ? (
          <div className="flex items-center justify-center relative z-10">
            <svg
              className="animate-spin h-6 w-6 mr-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="animate-pulse">Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center relative z-10">
            <span className="group-hover:scale-105 transition-transform duration-300 dark:text-white">
              Name Your Contracts
            </span>
            <span className="ml-2 inline-block animate-rocket">🚀</span>
          </div>
        )}

        <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none"></span>
      </Button>

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-md p-3 break-words max-w-full overflow-hidden">
          <strong>Error:</strong> {error}
        </div>
      )}


      {/* ENS Domain Selection Modal */}
      <ENSDomainPickerModal
        open={showENSModal}
        onOpenChange={setShowENSModal}
        fetchingENS={fetchingENS}
        userOwnedDomains={userOwnedDomains}
        title="Choose Domain"
        onSelectDomain={(domain) => {
          setParentName(domain)
          setParentType(domain === enscribeDomain ? 'web3labs' : 'own')
          setShowENSModal(false)
        }}
        extraSection={
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
              Other Domains
            </h3>
            <div
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              onClick={() => {
                setParentName(enscribeDomain)
                setParentType('web3labs')
                setShowENSModal(false)
              }}
            >
              <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                {enscribeDomain}
              </span>
            </div>
          </div>
        }
      />


      {/* L2 Chain Selection Modal */}
      <L2ChainPickerDialog
        open={showL2Modal}
        onClose={() => setShowL2Modal(false)}
        chainOptions={L2_CHAIN_OPTIONS}
        selectedChains={selectedL2ChainNames}
        onToggleChain={(chainName) => {
          if (selectedL2ChainNames.includes(chainName)) {
            setSelectedL2ChainNames(selectedL2ChainNames.filter(c => c !== chainName))
          } else {
            setSelectedL2ChainNames([...selectedL2ChainNames, chainName])
          }
        }}
      />

      {/* Steps Modal */}
      <SetNameStepsModal
        open={modalOpen}
        onClose={(result) => {
          setModalOpen(false)

          if (result?.startsWith('ERROR')) {
            // Extract the actual error message (remove 'ERROR: ' prefix)
            const errorMessage = result.replace('ERROR: ', '')
            setError(errorMessage)
            return
          }

          if (result === 'INCOMPLETE') {
            setError(
              'Steps not completed. Please complete all steps before closing.'
            )
          } else {
            // Reset form after successful batch naming
            setBatchEntries([{ id: '1', address: '', label: '' }])
            setParentType('web3labs')
            setParentName(enscribeDomain)
            setSelectedL2ChainNames([])
            setSkipL1Naming(false)
            setError('')
            setIsAdvancedOpen(false)
            resetCopied()
          }
        }}
        steps={modalSteps}
        title={modalTitle}
        subtitle={modalSubtitle}
        contractAddress={batchEntries.find(e => e.address && e.address !== '0x0000000000000000000000000000000000000000')?.address}
        ensName={batchEntries.find(e => e.label)?.label}
        isPrimaryNameSet={false}
        batchEntries={batchEntries.filter(e => e.address && e.address !== '0x0000000000000000000000000000000000000000' && e.address !== '0x0' && e.address !== '').map(e => ({ address: e.address, label: e.label }))}
        parentName={parentName}
        isSafeWallet={isSafeWallet}
      />
    </div>
    </div>
  )
}
