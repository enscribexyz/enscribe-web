import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { usePublicClient, useAccount } from 'wagmi'
import { createPublicClient, http, parseAbi, toCoinType, isAddress } from 'viem'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'
import { CHAINS, CONTRACTS } from '@/utils/constants'
import { useAccount as useWagmiAccount } from 'wagmi'
import { readContract } from 'viem/actions'
import { namehash } from 'viem/ens'

interface AddressSearchProps {
  selectedChain?: number
  setManuallyChanged?: React.Dispatch<React.SetStateAction<boolean>>
}

export default function AddressSearch({
  selectedChain: propSelectedChain,
  setManuallyChanged: propSetManuallyChanged,
}: AddressSearchProps = {}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedChain, setSelectedChain] = useState<number>(
    propSelectedChain || 1,
  )
  const [manuallyChanged, setManuallyChanged] = useState(false)

  const router = useRouter()
  const { chain } = useWagmiAccount()

  // Update local state when prop changes
  useEffect(() => {
    if (propSelectedChain !== undefined) {
      setSelectedChain(propSelectedChain)
    }
  }, [propSelectedChain])

  // Sync with wallet chain if connected and not manually changed
  useEffect(() => {
    if (chain?.id && !manuallyChanged) {
      setSelectedChain(chain.id)
    }
  }, [chain?.id, manuallyChanged])

  const getEnsClient = (chainId: number) => {
    const config = CONTRACTS[chainId as keyof typeof CONTRACTS]
    if (!config) {
      throw new Error(`Unsupported chain ID: ${chainId}`)
    }
    return createPublicClient({ transport: http(config.RPC_ENDPOINT) })
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an address')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Get the cleaned search query and ensure it's treated as a string
      const cleanedQuery: string = searchQuery.trim()
      const isValidAddress = isAddress(cleanedQuery)
      const containsDot = cleanedQuery.includes('.')


      // Make sure Layout knows this chain selection is intentional
      if (propSetManuallyChanged) {
        propSetManuallyChanged(true)
      }
      setManuallyChanged(true)

      if (isValidAddress) {
        // It's a valid Ethereum address, redirect to explore page
        // Always use window.location for a full refresh to ensure contract status is re-checked
        // Add a timestamp parameter to prevent caching issues
        window.location.href = `/explore/${selectedChain}/${cleanedQuery}`
      } else if (containsDot) {
        // Not a valid address but contains a dot - try ENS resolution
        try {

          // Determine if we're on a testnet
          const isTestnet = [
            CHAINS.SEPOLIA,
            CHAINS.LINEA_SEPOLIA,
            CHAINS.BASE_SEPOLIA,
          ].includes(selectedChain)

          // Use mainnet for mainnets, sepolia for testnets
          const ensChainId = isTestnet ? CHAINS.SEPOLIA : CHAINS.MAINNET


          let resolvedAddress: string | null = null

          if (selectedChain === CHAINS.BASE || selectedChain === CHAINS.BASE_SEPOLIA) {
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
              'function addr(bytes32 node, uint256 coinType) view returns (address)',
            ]);
            const address = await readContract(baseClient, {
              address: config.PUBLIC_RESOLVER as `0x${string}`,
              abi: publicResolverAbi,
              functionName: 'addr',
              args: [namehash(cleanedQuery), toCoinType(selectedChain)],
            }) as `0x${string}`
            resolvedAddress = address
          } else {
            const { getEnsAddress } = await import('viem/actions')
            const ensClient = getEnsClient(ensChainId)
            resolvedAddress = await getEnsAddress(ensClient, { name: cleanedQuery })
          }

          if (resolvedAddress) {
            // Always use window.location for a full refresh to ensure contract status is re-checked
            window.location.href = `/explore/${selectedChain}/${cleanedQuery}`
          } else {
            setError("ENS name doesn't resolve to any address")
          }
        } catch (ensError) {
          console.error('Error resolving ENS name:', ensError)
          setError("ENS name doesn't resolve to any address")
        }
      } else {
        // Not a valid address and doesn't contain a dot
        setError('Invalid Address')
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex w-full items-center space-x-2">
      <div className="flex-1">
        <Input
          type="text"
          placeholder="Search address or ENS name"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className={`pr-3 ${error ? 'border-red-500' : ''} bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200`}
        />
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 absolute">
            {error}
          </p>
        )}
      </div>
      <Button
        onClick={handleSearch}
        disabled={isLoading}
        className="ml-2"
        size="icon"
      >
        <Search className="h-4 w-4" />
      </Button>
    </div>
  )
}
