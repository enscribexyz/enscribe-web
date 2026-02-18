import { useRouter } from 'next/router'
import { useState, useEffect, useCallback } from 'react'
import { isAddress, parseAbi } from 'viem/utils'
import { createPublicClient, http, toCoinType } from 'viem'
import { normalize } from 'viem/ens'
import Layout from '@/components/Layout'
import ENSDetails from '@/components/ENSDetails'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { CHAINS, CONTRACTS, ETHERSCAN_API } from '@/utils/constants'
import { getENS } from '@/utils/ens'
import { useAccount } from 'wagmi'
import { checkIfProxy } from '@/utils/proxy'
import Link from 'next/link'
import reverseRegistrarABI from '@/contracts/ReverseRegistrar'
import ensRegistryABI from '@/contracts/ENSRegistry'
import publicResolverABI from '@/contracts/PublicResolver'
import { namehash } from 'viem/ens'
import { readContract } from 'viem/actions'

export default function ExploreAddressPage() {
  const router = useRouter()
  const { address, chainId } = router.query
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null)
  const [isENSName, setIsENSName] = useState(false)
  const [isValidAddress, setIsValidAddress] = useState(false)
  const [isValidChain, setIsValidChain] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [client, setClient] = useState<any>(null)
  const [isContract, setIsContract] = useState(false)
  const [proxyInfo, setProxyInfo] = useState<{
    isProxy: boolean
    implementationAddress?: string
  }>({ isProxy: false })
  const [contractDeployerAddress, setContractDeployerAddress] = useState<
    string | null
  >(null)
  const [contractDeployerPrimaryName, setContractDeployerPrimaryName] =
    useState<string | null>(null)
  const { chain: walletChain } = useAccount()

  const fetchPrimaryNameForContractDeployer = async (
    contractDeployerAddress: string,
    chainId: number,
  ): Promise<string | null> => {
    try {
      const primaryENS = await getENS(contractDeployerAddress, chainId)

      if (primaryENS) {
        return primaryENS
      } else {
        return null
      }
    } catch (error) {
      console.error(
        '[address] Error fetching primary ENS name for contract deployer:',
        error,
      )
      return null
    }
  }

  const fetchContractCreator = async (
    contractAddress: string,
    chainId: number,
  ): Promise<string | null> => {
    const etherscanApi = `${ETHERSCAN_API}&chainid=${chainId}&module=contract&action=getcontractcreation&contractaddresses=${contractAddress}`
    const response = await fetch(etherscanApi)
    const data = await response.json()
    if (
      data.result !== undefined &&
      data.result !== null &&
      data.result.length > 0
    ) {
      return data.result[0].contractCreator
    } else {
      return null
    }
  }

  const resolveENSName = async (ensName: string): Promise<string | null> => {
    try {

      // Validate ENS name format
      let normalizedName: string
      try {
        normalizedName = normalize(ensName)
      } catch (normalizeError) {
        console.error('[address] Invalid ENS name format:', normalizeError)
        return null
      }

      // Get the current chainId from router query
      if (!chainId || typeof chainId !== 'string') {
        console.error('[address] No valid chainId available for ENS resolution')
        return null
      }

      const chainIdNumber = parseInt(chainId)
      if (isNaN(chainIdNumber)) {
        console.error('[address] Invalid chainId format')
        return null
      }

      // Try to resolve the ENS name on the current chain
      let resolvedAddress: string | null = null

      if (
        chainIdNumber === CHAINS.BASE ||
        chainIdNumber === CHAINS.BASE_SEPOLIA
      ) {
        const config = CONTRACTS[chainIdNumber]
        const baseClient = createPublicClient({
          transport: http(config.RPC_ENDPOINT),
          chain: {
            id: chainIdNumber,
            name: 'Base',
            network: 'base',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: { default: { http: [config.RPC_ENDPOINT] } },
          },
        })

        const publicResolverAbi = parseAbi([
          'function addr(bytes32 node, uint256 coinType) view returns (bytes)',
        ])
        const node = namehash(normalizedName)
        const address = (await readContract(baseClient, {
          address: config.PUBLIC_RESOLVER as `0x${string}`,
          abi: publicResolverAbi,
          functionName: 'addr',
          args: [node, toCoinType(chainIdNumber)],
        })) as `0x${string}`
        resolvedAddress = address
        return resolvedAddress
      }

      // For all other chains, use ethers.js with explicit RPC endpoint to avoid eth.merkle.io
      try {
        // Determine which ENS chain to use (mainnet for mainnets, sepolia for testnets)
        const isTestnet = [
          CHAINS.SEPOLIA,
          CHAINS.LINEA_SEPOLIA,
          CHAINS.OPTIMISM_SEPOLIA,
          CHAINS.ARBITRUM_SEPOLIA,
          CHAINS.SCROLL_SEPOLIA,
        ].includes(chainIdNumber)

        const ensChainId = isTestnet ? CHAINS.SEPOLIA : CHAINS.MAINNET
        const ensConfig = CONTRACTS[ensChainId]
        const { getEnsAddress: resolveEnsName } = await import('viem/actions')
        const ensClient = createPublicClient({ transport: http(ensConfig.RPC_ENDPOINT) })
        resolvedAddress = await resolveEnsName(ensClient, { name: normalizedName })
      } catch (error) {

        // Handle L2-specific errors
        if (
          chainIdNumber !== CHAINS.MAINNET &&
          chainIdNumber !== CHAINS.SEPOLIA
        ) {

          // Check if this is a "no data" error (name doesn't exist)
          if (
            error instanceof Error &&
            (error.message.includes('returned no data') ||
              error.message.includes('0x') ||
              error.message.includes('resolve'))
          ) {
          }
        }

        return null
      }

      return resolvedAddress
    } catch (err) {
      console.error('[address] Error resolving ENS name:', err)
      return null
    }
  }

  // Reset state when URL parameters change
  useEffect(() => {
    if (router.isReady) {
      setResolvedAddress(null)
      setIsENSName(false)
      setIsValidAddress(false)
      setIsContract(false)
      setProxyInfo({ isProxy: false })
      setClient(null)
      setError(null)
      setIsLoading(true)
    }
  }, [router.isReady, chainId, address])

  // Initialize viem client based on chainId
  useEffect(() => {
    if (!router.isReady || !chainId || typeof chainId !== 'string') return

    const chainIdNumber = parseInt(chainId)
    if (isNaN(chainIdNumber)) {
      setIsValidChain(false)
      setError('Invalid chain ID format')
      setIsLoading(false)
      return
    }

    const config = CONTRACTS[chainIdNumber]
    if (!config) {
      setIsValidChain(false)
      setError(`Chain ID ${chainId} is not supported`)
      setIsLoading(false)
      return
    }

    setIsValidChain(true)

    try {
      // Use the chain-specific RPC endpoint
      let rpcEndpoint = config.RPC_ENDPOINT

      // Create a new viem client
      const viemClient = createPublicClient({
        chain: {
          id: chainIdNumber,
          name: config.name,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: {
            default: { http: [rpcEndpoint] },
            public: { http: [rpcEndpoint] },
          },
        },
        transport: http(rpcEndpoint),
      })

      setClient(viemClient)
    } catch (err) {
      console.error('Error initializing viem client:', err)
      setError('Failed to initialize provider for the selected chain')
      setIsLoading(false)
    }
  }, [router.isReady, chainId])

  useEffect(() => {
    // Exit early if not ready
    if (!router.isReady) {
      return
    }

    // Exit early if no client
    if (!client) {
      return
    }

    // Exit early if no address
    if (!address || typeof address !== 'string') {
      setIsLoading(false)
      return
    }

    // Set loading state at the beginning of the effect
    setIsLoading(true)

    // Function to validate the input (address or ENS name)
    const validateInput = async () => {
      try {
        let targetAddress = address
        let isInputENSName = false

        // Check if it's a valid Ethereum address format
        const addressIsValid = isAddress(address)

        if (!addressIsValid) {
          // If it's not a valid address, try to resolve it as an ENS name

          const resolvedAddr = await resolveENSName(address)
          if (resolvedAddr) {
            targetAddress = resolvedAddr
            isInputENSName = true
            setResolvedAddress(resolvedAddr)
            setIsENSName(true)
          } else {
            setIsValidAddress(false)
            // setError('Invalid Ethereum address or ENS name')
            setIsLoading(false)
            return
          }
        } else {
          // It's a valid address
          setIsENSName(false)
          setResolvedAddress(null)
        }

        // Mark as valid address format
        setIsValidAddress(true)

        try {
          // Get bytecode to determine if it's a contract
          const bytecode = await client.getBytecode({
            address: targetAddress as `0x${string}`,
          })
          const isContractAddress = bytecode && bytecode !== '0x'


          // Update contract status
          setIsContract(isContractAddress)

          // If it's a contract, check if it's a proxy
          if (isContractAddress) {
            try {
              const creatorAddress = await fetchContractCreator(
                targetAddress,
                Number(chainId),
              )
              setContractDeployerAddress(creatorAddress)

              if (creatorAddress !== null) {
                const creatorPrimaryName =
                  await fetchPrimaryNameForContractDeployer(
                    creatorAddress,
                    Number(chainId),
                  )
                setContractDeployerPrimaryName(creatorPrimaryName)
              }

              const proxyData = await checkIfProxy(
                targetAddress as string,
                Number(chainId),
              )
              setProxyInfo(proxyData)
            } catch (proxyError) {
              console.error('Error checking if contract is proxy:', proxyError)
              // Don't set an error, just log it
            }
          }
        } catch (bytecodeError) {
          console.error('Error getting bytecode:', bytecodeError)
          setError('Failed to verify if the address is a contract')
          // Still consider address valid, but not a contract
          setIsContract(false)
        }
      } catch (err) {
        console.error('Error in input validation:', err)
        setIsValidAddress(false)
        setError('An error occurred while validating the input')
      } finally {
        // Always make sure to finish loading
        setIsLoading(false)
      }
    }

    // Run the validation
    validateInput()
  }, [router.isReady, chainId, address, client])

  return (
    <Layout>
      {!isLoading && (
        <div className="flex items-center mb-6 w-full max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isValidAddress && isValidChain
              ? isContract
                ? 'Contract Details'
                : 'Account Details'
              : 'Invalid Chain ID or Address/ENS name'}
          </h1>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      {/* Display a message if the wallet chain differs from the URL chain */}
      {!isLoading &&
        walletChain &&
        chainId &&
        parseInt(chainId as string) !== walletChain.id && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-700 dark:text-yellow-400">
              Note: You are viewing data for chain ID {chainId}, but your wallet
              is connected to {walletChain.name} (chain ID {walletChain.id}).
            </p>
          </div>
        )}

      {/* Always render ENSDetails - it will handle its own loading state */}
      {(isValidAddress && isValidChain) || isLoading ? (
        <ENSDetails
          address={resolvedAddress || (address as string)}
          contractDeployerAddress={contractDeployerAddress}
          contractDeployerName={contractDeployerPrimaryName}
          chainId={typeof chainId === 'string' ? parseInt(chainId) : undefined}
          isContract={isContract}
          proxyInfo={proxyInfo}
          queriedENSName={isENSName ? (address as string) : undefined}
        />
      ) : null}
    </Layout>
  )
}
