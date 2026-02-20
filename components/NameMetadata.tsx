import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, X, Search, ExternalLink, ChevronDown, ChevronUp, Plus, ChevronRight } from 'lucide-react'
import SearchModal from './SearchModal'
import Image from 'next/image'
import {
  useNameMetadata,
  ACCOUNT_METADATA,
  CONTRACT_METADATA,
  COIN_TYPE_MAPPING,
  type ENSMetadata,
  type HierarchyNode,
  type SubnameNode,
} from '@/hooks/useNameMetadata'

interface NameMetadataProps {
  initialName?: string
}

export default function NameMetadata({ initialName }: NameMetadataProps) {
  const {
    currentName,
    loading,
    error,
    metadata,
    parentHierarchy,
    subnameHierarchy,
    isModalOpen,
    editingRecords,
    settingRecords,
    customKey,
    customValue,
    showAllMetadata,
    showAccountMetadata,
    showContractMetadata,
    isSearchModalOpen,
    recommendedKeys,
    searchName,
    setIsSearchModalOpen,
    setIsModalOpen,
    setShowAllMetadata,
    setShowAccountMetadata,
    setShowContractMetadata,
    setCustomKey,
    setCustomValue,
    setSearchName,
    toggleParentExpansion,
    navigateToName,
    handleExploreAddress,
    openMetadataModal,
    toggleSubnameExpansion,
    updateRecord,
    removeRecord,
    addMetadataKey,
    addCustomMetadata,
    handleSetTextRecords,
    getAvailableKeys,
    getAvailableMetadataByCategory,
    handleSearch,
    activeChainId,
    walletAddress,
    isOwnerOrManager,
    config,
  } = useNameMetadata({ initialName })

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      {/* Show search button when no name is provided (landing page) */}
      {!currentName && !loading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center mb-12 max-w-3xl">
            <h1 className="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
              Name Explorer
            </h1>
            <p className="text-xl text-muted-foreground">
              Explore and manage ENS name metadata
            </p>
          </div>

          {/* Info Box */}
          {!config?.SUBGRAPH_API && (
            <div className="mb-6 max-w-2xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Subgraph not configured for this network.</strong>{' '}
                Please select a supported network (Ethereum Mainnet, Sepolia,
                Base Mainnet, Base Sepolia) to view ENS metadata.
              </p>
            </div>
          )}

          {/* Search Button */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="w-full max-w-lg flex items-center justify-center gap-3 px-8 py-5 bg-card hover:bg-accent text-card-foreground rounded-2xl font-semibold text-lg border-2 border-border hover:border-ring transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Search className="w-6 h-6" />
            <span>Search ENS Name</span>
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        selectedChain={activeChainId}
      />

      {/* Show metadata content when name is loaded */}
      {(currentName || loading) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-white mb-8">
            Name Explorer
          </h2>

          {/* Info Box */}
          {!config?.SUBGRAPH_API && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>ENS subgraph not configured for this network.</strong>{' '}
                Please select a supported network (Ethereum Mainnet, Sepolia,
                Base Mainnet, Base Sepolia) to view ENS metadata.
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-6">
              <div className="flex flex-col space-y-4">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-4/5" />
              </div>
              <div className="pt-4">
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {/* Parent Hierarchy */}
          {!loading && parentHierarchy.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Parent Hierarchy
              </h3>
              <div className="space-y-2">
                {parentHierarchy.map((parent, index) => (
                  <ParentHierarchyNode
                    key={parent.name}
                    node={parent}
                    index={index}
                    onToggle={() => toggleParentExpansion(index)}
                    onNavigate={navigateToName}
                    onExplore={handleExploreAddress}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Current Name Metadata */}
          {!loading && metadata && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentName} Metadata
                  </h3>
                  <button
                    onClick={() => handleExploreAddress(currentName)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Explore address"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
                  </button>
                </div>
                {walletAddress && isOwnerOrManager && (
                  <Button
                    onClick={openMetadataModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    Edit Text Records
                  </Button>
                )}
              </div>
              <MetadataDisplay metadata={metadata} />
            </div>
          )}

          {/* Direct Subnames */}
          {!loading && subnameHierarchy.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Direct Subnames ({subnameHierarchy.length})
              </h3>
              <div className="space-y-2">
                {subnameHierarchy.map((subname, index) => (
                  <SubnameHierarchyNode
                    key={subname.name}
                    node={subname}
                    index={index}
                    onToggle={() => toggleSubnameExpansion(index)}
                    onNavigate={navigateToName}
                    onExplore={handleExploreAddress}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Text Records Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl text-gray-900 dark:text-white">
              Manage Text Records for {currentName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Current/Editing Records */}
            {editingRecords.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Text Records
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  {editingRecords.map((record, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {record.key}
                          </span>
                          {record.isNew && (
                            <span className="text-xs bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 px-2 py-0.5 rounded border border-green-200 dark:border-green-700">
                              New
                            </span>
                          )}
                        </div>
                        <Input
                          type="text"
                          value={record.value}
                          onChange={(e) =>
                            updateRecord(index, 'value', e.target.value)
                          }
                          placeholder={`Enter value for ${record.key}`}
                          className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <Button
                        onClick={() => removeRecord(index)}
                        variant="outline"
                        size="sm"
                        className="mt-6 px-2 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Metadata */}
            {recommendedKeys.length > 0 &&
              getAvailableKeys(recommendedKeys).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Recommended Metadata
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {getAvailableKeys(recommendedKeys).map((item) => (
                      <button
                        key={item.key}
                        onClick={() => addMetadataKey(item.key, item.label)}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700"
                      >
                        + {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Show All Metadata Dropdown */}
            <div>
              <button
                onClick={() => setShowAllMetadata(!showAllMetadata)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {showAllMetadata ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Show All Metadata
              </button>

              {showAllMetadata && (
                <div className="mt-4 space-y-4 pl-6">
                  {/* Account Metadata */}
                  <div>
                    <button
                      onClick={() =>
                        setShowAccountMetadata(!showAccountMetadata)
                      }
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
                    >
                      {showAccountMetadata ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      Account Metadata
                    </button>
                    {showAccountMetadata && (
                      <div className="flex flex-wrap gap-2 ml-5">
                        {getAvailableMetadataByCategory(ACCOUNT_METADATA)
                          .length > 0 ? (
                          getAvailableMetadataByCategory(ACCOUNT_METADATA).map(
                            (item) => (
                              <button
                                key={item.key}
                                onClick={() =>
                                  addMetadataKey(item.key, item.label)
                                }
                                className="px-3 py-1.5 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-700"
                              >
                                + {item.label}
                              </button>
                            ),
                          )
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            All account metadata keys are already added
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Contract Metadata */}
                  <div>
                    <button
                      onClick={() =>
                        setShowContractMetadata(!showContractMetadata)
                      }
                      className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mb-2"
                    >
                      {showContractMetadata ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                      Contract Metadata
                    </button>
                    {showContractMetadata && (
                      <div className="flex flex-wrap gap-2 ml-5">
                        {getAvailableMetadataByCategory(CONTRACT_METADATA)
                          .length > 0 ? (
                          getAvailableMetadataByCategory(CONTRACT_METADATA).map(
                            (item) => (
                              <button
                                key={item.key}
                                onClick={() =>
                                  addMetadataKey(item.key, item.label)
                                }
                                className="px-3 py-1.5 text-xs font-medium bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors border border-purple-200 dark:border-purple-700"
                              >
                                + {item.label}
                              </button>
                            ),
                          )
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            All contract metadata keys are already added
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Custom Metadata */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Metadata
                    </h4>
                    <div className="flex gap-2 ml-5">
                      <Input
                        type="text"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder="Key (e.g., discord, website)"
                        className="flex-1 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                        onKeyPress={(e) =>
                          e.key === 'Enter' && addCustomMetadata()
                        }
                      />
                      <Input
                        type="text"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        placeholder="Value"
                        className="flex-1 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                        onKeyPress={(e) =>
                          e.key === 'Enter' && addCustomMetadata()
                        }
                      />
                      <Button
                        onClick={addCustomMetadata}
                        variant="outline"
                        size="sm"
                        className="whitespace-nowrap border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            {/* <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Setting text records requires you to be the owner of this ENS name and will create on-chain transactions.
              </p>
              {metadata && walletAddress && (
                <p className="text-xs mt-2 text-blue-800 dark:text-blue-300">
                  {isOwnerOrManager ? (
                    <span className="text-green-600 dark:text-green-400">✓ You are the owner of this name</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">✗ You are not the owner of this name</span>
                  )}
                </p>
              )}
              {!walletAddress && (
                <p className="text-xs mt-2 text-orange-600 dark:text-orange-400">
                  ⚠ Please connect your wallet to set text records
                </p>
              )}
            </div> */}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                disabled={settingRecords}
                className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetTextRecords}
                disabled={settingRecords || editingRecords.length === 0}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {settingRecords ? (
                  <>
                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                    Setting Records...
                  </>
                ) : (
                  `Set ${editingRecords.length} Record${editingRecords.length !== 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Parent Hierarchy Node Component
interface ParentHierarchyNodeProps {
  node: HierarchyNode
  index: number
  onToggle: () => void
  onNavigate: (name: string) => void
  onExplore: (name: string) => void
}

function ParentHierarchyNode({
  node,
  index,
  onToggle,
  onNavigate,
  onExplore,
}: ParentHierarchyNodeProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {node.expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onNavigate(node.name)}
            className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {node.name}
          </button>
          <button
            onClick={() => onExplore(node.name)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Explore address"
          >
            <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
          </button>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Level {index + 1}
        </span>
      </div>

      {node.expanded && node.metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <MetadataDisplay metadata={node.metadata} />
        </div>
      )}

      {node.expanded && !node.metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="animate-spin w-4 h-4" />
            Loading metadata...
          </div>
        </div>
      )}
    </div>
  )
}

// Subname Hierarchy Node Component
interface SubnameHierarchyNodeProps {
  node: SubnameNode
  index: number
  onToggle: () => void
  onNavigate: (name: string) => void
  onExplore: (name: string) => void
}

function SubnameHierarchyNode({
  node,
  index,
  onToggle,
  onNavigate,
  onExplore,
}: SubnameHierarchyNodeProps) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            {node.expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <button
            onClick={() => onNavigate(node.name)}
            className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            {node.name}
          </button>
          <button
            onClick={() => onExplore(node.name)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Explore address"
          >
            <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" />
          </button>
          {node.hasSubnames && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              Has subnames
            </span>
          )}
        </div>
        {/* <span className="text-xs text-gray-500 dark:text-gray-400">
          {node.name}
        </span> */}
      </div>

      {node.expanded && node.metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <MetadataDisplay metadata={node.metadata} />
        </div>
      )}

      {node.expanded && !node.metadata && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Loader2 className="animate-spin w-4 h-4" />
            Loading metadata...
          </div>
        </div>
      )}
    </div>
  )
}

// Metadata Display Component
interface MetadataDisplayProps {
  metadata: ENSMetadata
}

function MetadataDisplay({ metadata }: MetadataDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Address Records */}
      {(metadata.ethAddress || metadata.coinAddresses.length > 0) && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Address Records
          </h4>
          <div className="space-y-2">
            {/* {metadata.ethAddress && (
              <InfoRow label="ETH Address" value={metadata.ethAddress} mono />
            )} */}
            {metadata.coinAddresses.map((coin) => {
              const chainInfo = COIN_TYPE_MAPPING[coin.coinType]
              return (
                <div
                  key={coin.coinType}
                  className="flex justify-between items-start py-2"
                >
                  <div className="flex items-center gap-2">
                    {chainInfo?.logo && (
                      <div className="flex-shrink-0 w-5 h-5 relative">
                        <Image
                          src={chainInfo.logo}
                          alt={chainInfo.name}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {chainInfo?.name || `Coin Type ${coin.coinType}`}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-gray-900 dark:text-white break-all ml-4">
                    {coin.addr}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Content Hash */}
      {metadata.contentHash && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Content Hash
          </h4>
          <p className="text-xs font-mono text-gray-900 dark:text-white break-all">
            {metadata.contentHash}
          </p>
        </div>
      )}

      {/* Text Records */}
      {metadata.textRecords.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Text Records ({metadata.textRecords.length})
          </h4>
          <div className="space-y-2">
            {metadata.textRecords.map((record) => (
              <InfoRow
                key={record.key}
                label={record.key}
                value={record.value || 'Not set'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Interfaces */}
      {metadata.interfaces.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Interfaces ({metadata.interfaces.length})
          </h4>
          <div className="space-y-3">
            {metadata.interfaces.map((iface) => (
              <div key={iface.interfaceID} className="space-y-1">
                <InfoRow label="Interface ID" value={iface.interfaceID} mono />
                <InfoRow label="Implementer" value={iface.implementer} mono />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Records Message */}
      {metadata.coinAddresses.length === 0 &&
        !metadata.contentHash &&
        metadata.textRecords.length === 0 &&
        metadata.interfaces.length === 0 && (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No records found for this name.
            </p>
          </div>
        )}

      {metadata.error && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            {metadata.error}
          </p>
        </div>
      )}
    </div>
  )
}

// Info Row Component
interface InfoRowProps {
  label: string
  value: string
  mono?: boolean
}

function InfoRow({ label, value, mono }: InfoRowProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}:
      </span>
      <span
        className={`text-xs text-gray-900 dark:text-white break-all ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}
