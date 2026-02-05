import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/router'
import { usePublicClient, useAccount } from 'wagmi'
import { ethers, isAddress } from 'ethers'
import { createPublicClient, http, parseAbi, toCoinType } from 'viem'
import { Input } from '@/components/ui/input'
import { CHAINS, CONTRACTS } from '@/utils/constants'
import { useAccount as useWagmiAccount } from 'wagmi'
import { readContract } from 'viem/actions'
import { namehash } from 'viem/ens'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  selectedChain?: number
  setManuallyChanged?: React.Dispatch<React.SetStateAction<boolean>>
}

export default function SearchModal({
  isOpen,
  onClose,
  selectedChain: propSelectedChain,
  setManuallyChanged: propSetManuallyChanged,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedChain, setSelectedChain] = useState<number>(
    propSelectedChain || 1,
  )
  const [manuallyChanged, setManuallyChanged] = useState(false)
  const [searchResults, setSearchResults] = useState<
    Array<{
      name: string
      address: string
      avatar?: string
      type: 'explore' | 'nameMetadata'
      title?: string
    }>
  >([])
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const { chain } = useWagmiAccount()

  // Update local state when prop changes
  useEffect(() => {
    if (propSelectedChain !== undefined) {
      console.log('Using chain from Layout:', propSelectedChain)
      setSelectedChain(propSelectedChain)
    }
  }, [propSelectedChain])

  // Sync with wallet chain if connected and not manually changed
  useEffect(() => {
    if (chain?.id && !manuallyChanged) {
      console.log('Wallet connected to chain:', chain.id, chain.name)
      setSelectedChain(chain.id)
    }
  }, [chain?.id, manuallyChanged])

  // Also sync selectedChain when wallet connects/disconnects
  useEffect(() => {
    if (chain?.id) {
      console.log('SearchModal: Using wallet chain:', chain.id)
      setSelectedChain(chain.id)
    } else if (propSelectedChain) {
      console.log(
        'SearchModal: Using selected chain from props:',
        propSelectedChain,
      )
      setSelectedChain(propSelectedChain)
    }
  }, [chain?.id, propSelectedChain])

  // Close modal on escape key and reset state when modal closes
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    } else {
      // Reset state when modal closes
      setSearchQuery('')
      setSearchResults([])
      setError('')
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const getProvider = useCallback((chainId: number) => {
    const config = CONTRACTS[chainId as keyof typeof CONTRACTS]
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }

    console.log(`Using RPC endpoint for chain ${chainId}:`, config.RPC_ENDPOINT)

    return new ethers.JsonRpcProvider(config.RPC_ENDPOINT)
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('')
      setSearchResults([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Get the cleaned search query and ensure it's treated as a string
      const cleanedQuery: string = searchQuery.trim()
      const isValidAddress = isAddress(cleanedQuery)
      const containsDot = cleanedQuery.includes('.')

      console.log('Search query:', cleanedQuery)
      console.log('Is valid address:', isValidAddress)
      console.log('Contains dot (possible ENS):', containsDot)
      console.log('Using chain for search:', selectedChain)

      // Make sure Layout knows this chain selection is intentional
      if (propSetManuallyChanged) {
        propSetManuallyChanged(true)
      }
      setManuallyChanged(true)

      if (isValidAddress) {
        // It's a valid Ethereum address, show as search result
        setSearchResults([
          {
            name: cleanedQuery,
            address: cleanedQuery,
            type: 'explore',
            title: 'View Address',
          },
        ])
      } else if (containsDot) {
        // Not a valid address but contains a dot - try ENS resolution
        try {
          const ensName = cleanedQuery as string
          console.log(
            'Input contains a dot, trying to resolve as ENS name:',
            ensName,
          )
          console.log('Using chain for exploration:', selectedChain)

          // Validate ENS name format before attempting resolution
          // Check for common invalid patterns
          if (
            ensName.startsWith('.') ||
            ensName.endsWith('.') ||
            ensName.includes('..') ||
            ensName.split('.').some((label: string) => label.trim() === '')
          ) {
            setError('Invalid ENS name format')
            setSearchResults([])
            setIsLoading(false)
            return
          }

          // Determine if we're on a testnet
          const isTestnet = [
            CHAINS.SEPOLIA,
            CHAINS.LINEA_SEPOLIA,
            CHAINS.BASE_SEPOLIA,
            CHAINS.OPTIMISM_SEPOLIA,
            CHAINS.ARBITRUM_SEPOLIA,
            CHAINS.SCROLL_SEPOLIA,
          ].includes(selectedChain)

          // Use mainnet for mainnets, sepolia for testnets for ENS resolution
          const ensChainId = isTestnet ? CHAINS.SEPOLIA : CHAINS.MAINNET

          console.log(
            'Using chain for ENS resolution:',
            ensChainId,
            isTestnet ? '(testnet)' : '(mainnet)',
          )

          let resolvedAddress: string | null = null

          // For Base chains, use their public resolver with coinType
          if (
            selectedChain === CHAINS.BASE ||
            selectedChain === CHAINS.BASE_SEPOLIA
          ) {
            const config = CONTRACTS[selectedChain]
            const baseClient = createPublicClient({
              transport: http(config.RPC_ENDPOINT),
              chain: {
                id: selectedChain,
                name: 'Base',
                network: 'base',
                nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: { default: { http: [config.RPC_ENDPOINT] } },
              },
            })

            const publicResolverAbi = parseAbi([
              'function addr(bytes32 node) view returns (address)',
            ])
            try {
              const address = (await readContract(baseClient, {
                address: config.PUBLIC_RESOLVER as `0x${string}`,
                abi: publicResolverAbi,
                functionName: 'addr',
                args: [namehash(ensName)],
              })) as `0x${string}`
              console.log('Base resolver address:', address)
              // Check if address is not zero address
              if (
                address &&
                address !== '0x0000000000000000000000000000000000000000'
              ) {
                resolvedAddress = address
              }
            } catch (baseError) {
              console.error('Error resolving on Base:', baseError)
              // Fall through to try mainnet/sepolia resolution
            }
          }

          // If Base resolution failed or not on Base, try mainnet/sepolia ENS
          if (!resolvedAddress) {
            try {
              const mainnetProvider = getProvider(ensChainId)
              resolvedAddress = await mainnetProvider.resolveName(ensName)
            } catch (resolveError: any) {
              console.error(
                'Error resolving ENS name on mainnet/sepolia:',
                resolveError,
              )
              // Check for specific error types
              if (resolveError?.code === 'INVALID_ARGUMENT') {
                setError('Invalid ENS name format')
              } else {
                setError("ENS name doesn't resolve to any address")
              }
              setSearchResults([])
              setIsLoading(false)
              return
            }
          }

          if (
            resolvedAddress &&
            resolvedAddress !== '0x0000000000000000000000000000000000000000' &&
            resolvedAddress !== '0x0000000000000000000000000000000000000020'
          ) {
            // ENS name resolves to an address - show both options
            setSearchResults([
              {
                name: ensName,
                address: resolvedAddress,
                type: 'explore',
                title: 'View Address',
              },
              {
                name: ensName,
                address: ensName,
                type: 'nameMetadata',
                title: 'Explore Name',
              },
            ])
          } else {
            // ENS name doesn't resolve - show only Name Metadata option
            setSearchResults([
              {
                name: ensName,
                address: ensName,
                type: 'nameMetadata',
                title: 'Explore Name',
              },
            ])
            setError('')
          }
        } catch (ensError: any) {
          console.error('Error resolving ENS name:', ensError)
          // Provide more specific error messages
          if (ensError?.code === 'INVALID_ARGUMENT') {
            setError('Invalid ENS name format')
            setSearchResults([])
          } else if (ensError?.message?.includes('invalid ENS name')) {
            setError('Invalid ENS name format')
            setSearchResults([])
          } else {
            // ENS name doesn't resolve - show only Name Metadata option
            const ensName = cleanedQuery as string
            setSearchResults([
              {
                name: ensName,
                address: ensName,
                type: 'nameMetadata',
                title: 'Name Metadata',
              },
            ])
            setError('')
          }
        }
      } else {
        // Not a valid address and doesn't contain a dot
        setError('Invalid Address')
        setSearchResults([])
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, selectedChain, propSetManuallyChanged, getProvider])

  // Auto-search with debounce when user stops typing
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setSearchResults([])
      setError('')
      return
    }

    // Check if it's a potentially valid input before triggering search
    const trimmed = searchQuery.trim()
    const containsDot = trimmed.includes('.')
    const isAddr = isAddress(trimmed)

    // Skip auto-search for obviously invalid ENS names
    if (
      containsDot &&
      (trimmed.startsWith('.') ||
        trimmed.endsWith('.') ||
        trimmed.includes('..') ||
        trimmed.split('.').some((label) => label.trim() === ''))
    ) {
      // Don't auto-search invalid ENS names, but don't show error yet
      return
    }

    // Set new timer for auto-search after 500ms of no typing
    const timer = setTimeout(() => {
      handleSearch()
    }, 500)

    debounceTimerRef.current = timer

    // Cleanup
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [searchQuery, handleSearch])

  const handleResultClick = (result: {
    name: string
    address: string
    type: 'explore' | 'nameMetadata'
  }) => {
    if (result.type === 'nameMetadata') {
      console.log('Navigating to Name Metadata page')
      window.location.href = `/nameMetadata?name=${encodeURIComponent(result.name)}`
    } else {
      console.log('Using hard redirect to ensure proper contract detection')
      window.location.href = `/explore/${selectedChain}/${result.name}`
    }
    onClose()
  }

  // Handle paste event for immediate search
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText.trim()) {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      // Search will be triggered by the useEffect when searchQuery updates
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        {/* <div className="flex items-center justify-between p-6 border-b border-border"> */}
        {/* <h2 className="text-2xl font-bold text-card-foreground">
            Select Address To View
          </h2> */}
        {/* <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button> */}
        {/* </div> */}

        {/* Content */}
        <div className="p-6">
          {/* Search Input */}
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex-1 dark:text-white text-black">
              <Input
                type="text"
                placeholder="Search Address or ENS name"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setError('')
                }}
                onPaste={handlePaste}
                className={`h-14 text-lg ${
                  error
                    ? 'border-destructive focus:ring-destructive'
                    : 'border-input focus:ring-ring'
                } bg-background text-foreground`}
                autoFocus
              />
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-card-foreground mb-3">
                Search Results
              </h3>
              <div className="space-y-4">
                {searchResults.map((result, index) => (
                  <div key={index}>
                    {/* Result Title */}
                    {result.title && (
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 px-1">
                        {result.title}
                      </div>
                    )}
                    {/* Result Button */}
                    <button
                      onClick={() => handleResultClick(result)}
                      className="w-full flex items-center space-x-4 p-4 bg-accent hover:bg-muted rounded-xl transition-colors cursor-pointer border-2 border-transparent hover:border-ring"
                    >
                      {/* Avatar/Icon */}
                      <div
                        className={`w-12 h-12 rounded-full ${result.type === 'nameMetadata' ? 'bg-gradient-to-br from-green-400 to-cyan-500' : 'bg-gradient-to-br from-blue-400 to-purple-500'} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-bold text-lg">
                          {result.name.substring(0, 2).toUpperCase()}
                        </span>
                      </div>

                      {/* Name and Address */}
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-card-foreground">
                          {result.name}
                        </div>
                        {result.name !== result.address &&
                          result.type === 'explore' && (
                            <div className="text-sm text-muted-foreground truncate">
                              {result.address}
                            </div>
                          )}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
