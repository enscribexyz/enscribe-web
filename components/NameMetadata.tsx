import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { checkIfSafe } from '@/components/componentUtils'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { namehash, normalize } from 'viem/ens'
import {
  healENSName,
  isLabelhash,
  extractLabelhash,
  healLabelhash,
} from '../utils/labelhashMapping'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { Loader2, X, Search, ExternalLink } from 'lucide-react'
import SearchModal from './SearchModal'
import { useRouter } from 'next/router'
import { ethers } from 'ethers'
import {
  writeContract,
  waitForTransactionReceipt,
  readContract,
} from 'viem/actions'
import {
  createPublicClient,
  http,
  getAddress,
  isAddress,
  parseAbi,
  encodeFunctionData,
} from 'viem'
import {
  mainnet,
  sepolia,
  base,
  baseSepolia,
  linea,
  lineaSepolia,
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  scroll,
  scrollSepolia,
} from 'viem/chains'
import publicResolverABI from '../contracts/PublicResolver'
import { useToast } from '@/hooks/use-toast'
import Image from 'next/image'

interface TextRecord {
  key: string
  value: string | null
}

interface InterfaceRecord {
  interfaceID: string
  implementer: string
}

interface CoinAddress {
  coinType: string
  addr: string
}

interface ENSMetadata {
  name: string
  node: `0x${string}`
  owner: string | null
  resolver: string | null
  resolverAddress: string | null
  ttl: string | null
  ethAddress: string | null
  contentHash: string | null
  textRecords: TextRecord[]
  interfaces: InterfaceRecord[]
  coinAddresses: CoinAddress[]
  loading: boolean
  error?: string
  isMigrated?: boolean
  createdAt?: string
  expiryDate?: string
  wrappedOwner?: string | null
  registrant?: string | null
}

interface HierarchyNode {
  name: string
  metadata: ENSMetadata | null
  expanded: boolean
}

interface SubnameNode {
  name: string
  labelName: string
  metadata: ENSMetadata | null
  expanded: boolean
  hasSubnames: boolean
}

const ACCOUNT_METADATA = [
  { key: 'alias', label: 'Alias', placeholder: 'Your alias or nickname' },
  { key: 'theme', label: 'Theme', placeholder: 'light, dark, or custom hex' },
  { key: 'avatar', label: 'Avatar', placeholder: 'URL or IPFS hash' },
  { key: 'header', label: 'Header', placeholder: 'URL or IPFS hash' },
  { key: 'email', label: 'Email', placeholder: 'your@email.com' },
  {
    key: 'description',
    label: 'Description',
    placeholder: 'Bio or description',
  },
  { key: 'location', label: 'Location', placeholder: 'City, Country' },
  { key: 'url', label: 'URL', placeholder: 'https://...' },
  { key: 'timezone', label: 'Timezone', placeholder: 'e.g., UTC, EST' },
  { key: 'language', label: 'Language', placeholder: 'e.g., en, es, fr' },
  {
    key: 'primary-contact',
    label: 'Primary Contact',
    placeholder: 'Contact method',
  },
  { key: 'com.github', label: 'GitHub', placeholder: 'GitHub username' },
  { key: 'com.peepeth', label: 'Peepeth', placeholder: 'Peepeth username' },
  { key: 'com.linkedin', label: 'LinkedIn', placeholder: 'LinkedIn username' },
  { key: 'com.twitter', label: 'Twitter', placeholder: 'Twitter username' },
  { key: 'io.keybase', label: 'Keybase', placeholder: 'Keybase username' },
  { key: 'org.telegram', label: 'Telegram', placeholder: 'Telegram username' },
]

const CONTRACT_METADATA = [
  {
    key: 'category',
    label: 'Category',
    placeholder: 'e.g., defi, gaming, social, utility',
  },
  {
    key: 'license',
    label: 'License',
    placeholder: 'e.g., MIT, GPL-3.0, Apache-2.0',
  },
  { key: 'docs', label: 'Documentation', placeholder: 'https://...' },
  {
    key: 'audits',
    label: 'Security Audits',
    placeholder: 'JSON array or URLs',
  },
]

// Coin type to chain mapping (ENSIP-11 for L2s, SLIP-44 for L1)
const COIN_TYPE_MAPPING: Record<string, { name: string; logo: string }> = {
  '60': { name: 'Ethereum', logo: '/images/ethereum.svg' },
  '2147492101': { name: 'Base', logo: '/images/base.svg' },
  '2147568180': { name: 'Base Sepolia', logo: '/images/base.svg' },
  '2147483658': { name: 'Optimism', logo: '/images/optimism.svg' },
  '2158639068': { name: 'Optimism Sepolia', logo: '/images/optimism.svg' },
  '2147525809': { name: 'Arbitrum', logo: '/images/arbitrum.svg' },
  '2147905262': { name: 'Arbitrum Sepolia', logo: '/images/arbitrum.svg' },
  '2147542792': { name: 'Linea', logo: '/images/linea.svg' },
  '2147542789': { name: 'Linea Sepolia', logo: '/images/linea.svg' },
  '2148018000': { name: 'Scroll', logo: '/images/scroll.svg' },
  '2148017999': { name: 'Scroll Sepolia', logo: '/images/scroll.svg' },
}

interface TextRecordInput {
  key: string
  value: string
  isNew?: boolean
}

interface NameMetadataProps {
  selectedChain?: number
  initialName?: string // Accept initial name as prop
}

export default function NameMetadata({
  selectedChain,
  initialName,
}: NameMetadataProps) {
  const { chain, address: walletAddress, connector } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { toast } = useToast()
  const router = useRouter()

  const [searchName, setSearchName] = useState(initialName || '')
  const [currentName, setCurrentName] = useState('')
  const [metadata, setMetadata] = useState<ENSMetadata | null>(null)
  const [parentHierarchy, setParentHierarchy] = useState<HierarchyNode[]>([])
  const [subnameHierarchy, setSubnameHierarchy] = useState<SubnameNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecords, setEditingRecords] = useState<TextRecordInput[]>([])
  const [settingRecords, setSettingRecords] = useState(false)
  const [customKey, setCustomKey] = useState('')
  const [customValue, setCustomValue] = useState('')
  const [showAllMetadata, setShowAllMetadata] = useState(false)
  const [showAccountMetadata, setShowAccountMetadata] = useState(false)
  const [showContractMetadata, setShowContractMetadata] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [isSafeWallet, setIsSafeWallet] = useState(false)

  // Use wallet chain if connected, otherwise use selected chain from ChainSelector
  const activeChainId = chain?.id || selectedChain || CHAINS.MAINNET
  const config = CONTRACTS[activeChainId]

  // Get viem chain object
  const getViemChain = (chainId: number) => {
    switch (chainId) {
      case CHAINS.MAINNET:
        return mainnet
      case CHAINS.SEPOLIA:
        return sepolia
      case CHAINS.BASE:
        return base
      case CHAINS.BASE_SEPOLIA:
        return baseSepolia
      case CHAINS.LINEA:
        return linea
      case CHAINS.LINEA_SEPOLIA:
        return lineaSepolia
      case CHAINS.OPTIMISM:
        return optimism
      case CHAINS.OPTIMISM_SEPOLIA:
        return optimismSepolia
      case CHAINS.ARBITRUM:
        return arbitrum
      case CHAINS.ARBITRUM_SEPOLIA:
        return arbitrumSepolia
      case CHAINS.SCROLL:
        return scroll
      case CHAINS.SCROLL_SEPOLIA:
        return scrollSepolia
      default:
        return mainnet
    }
  }

  // Reset form function
  const resetForm = useCallback(() => {
    setSearchName('')
    setCurrentName('')
    setMetadata(null)
    setParentHierarchy([])
    setSubnameHierarchy([])
    setError('')
    setIsModalOpen(false)
    setEditingRecords([])
    setCustomKey('')
    setCustomValue('')
  }, [])

  // Reset form on chain change (wallet chain or selected chain)
  useEffect(() => {
    resetForm()
  }, [activeChainId, resetForm])

  // Reset form on wallet connect/disconnect
  useEffect(() => {
    resetForm()
  }, [walletAddress, resetForm])

  // Handle URL changes - for browser back/forward and sidebar clicks
  useEffect(() => {
    const urlName = typeof router.query.name === 'string' ? router.query.name : ''
    
    // If URL has no name and we have current name, reset to home
    if (!urlName && currentName) {
      setCurrentName('')
      setSearchName('')
      setMetadata(null)
      setParentHierarchy([])
      setSubnameHierarchy([])
      setError('')
      return
    }
    
    // If URL has a name and it's different from current name, fetch it (for browser back/forward)
    if (urlName && urlName !== currentName && config?.SUBGRAPH_API && !loading) {
      console.log(`[NameMetadata] URL changed to: ${urlName}, fetching metadata`)
      setSearchName(urlName)
      handleSearchForName(urlName)
    }
  }, [router.query.name, currentName, config?.SUBGRAPH_API, loading])

  // Auto-fetch metadata if initialName is provided
  useEffect(() => {
    const autoFetch = async () => {
      if (initialName && !currentName && !loading && config?.SUBGRAPH_API) {
        setLoading(true)
        setError('')
        setMetadata(null)
        setParentHierarchy([])

        try {
          const normalizedName = normalize(initialName.trim())

          const parts = normalizedName.split('.')
          if (parts.length === 1) {
            setError(
              'TLDs (like .eth) are not supported. Please enter a full ENS name (e.g., vitalik.eth)',
            )
            setLoading(false)
            return
          }

          setCurrentName(normalizedName)

          const fetchedMetadata =
            await fetchENSMetadataFromSubgraph(normalizedName)
          setMetadata(fetchedMetadata)

          if (fetchedMetadata.error) {
            setError(fetchedMetadata.error)
          }

          const parents = getParentHierarchy(normalizedName)
          const hierarchyNodes: HierarchyNode[] = []

          for (const parentName of parents) {
            if (parentName.split('.').length > 1) {
              // Heal the parent name if it contains labelhashes
              const healedParentName = healENSName(parentName)
              hierarchyNodes.push({
                name: healedParentName,
                metadata: null,
                expanded: false,
              })
            }
          }

          setParentHierarchy(hierarchyNodes)

          if (hierarchyNodes.length > 0) {
            await loadParentMetadata(0)
          }

          const subnames = await fetchDirectSubnames(normalizedName)
          setSubnameHierarchy(subnames)
        } catch (err: any) {
          setError(err.message || 'Failed to fetch metadata')
        } finally {
          setLoading(false)
        }
      }
    }

    autoFetch()
  }, [initialName])

  const fetchENSMetadataFromSubgraph = async (
    name: string,
  ): Promise<ENSMetadata> => {
    const node = namehash(name)
    const metadata: ENSMetadata = {
      name,
      node,
      owner: null,
      resolver: null,
      resolverAddress: null,
      ttl: null,
      ethAddress: null,
      contentHash: null,
      textRecords: [],
      interfaces: [],
      coinAddresses: [],
      loading: false,
    }

    if (!config?.SUBGRAPH_API) {
      metadata.error = 'No subgraph API configured for this chain'
      return metadata
    }

    try {
      const response = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
        },
        body: JSON.stringify({
          query: `
            query getDomainMetadata($id: ID!) {
              domain(id: $id) {
                id
                name
                labelName
                labelhash
                owner {
                  id
                }
                registrant {
                  id
                }
                wrappedOwner {
                  id
                }
                resolver {
                  id
                  address
                  addr {
                    id
                  }
                  contentHash
                  texts
                  coinTypes
                }
                ttl
                isMigrated
                createdAt
                expiryDate
              }
              
              # Get resolver with all its events
              resolvers(where: { domain: $id }) {
                id
                events(first: 1000, orderBy: blockNumber, orderDirection: desc) {
                  __typename
                  ... on TextChanged {
                    id
                    key
                    value
                    blockNumber
                  }
                  ... on MulticoinAddrChanged {
                    id
                    coinType
                    addr
                    blockNumber
                  }
                  ... on InterfaceChanged {
                    id
                    interfaceID
                    implementer
                    blockNumber
                  }
                }
              }
            }
          `,
          variables: {
            id: node,
          },
        }),
      })

      const data = await response.json()

      if (data.errors) {
        throw new Error(
          data.errors[0]?.message || 'Failed to fetch from subgraph',
        )
      }

      const domain = data.data?.domain

      if (!domain) {
        metadata.error = 'Domain not found in subgraph'
        return metadata
      }

      // Basic info
      metadata.owner = domain.owner?.id || null
      metadata.registrant = domain.registrant?.id || null
      metadata.wrappedOwner = domain.wrappedOwner?.id || null
      metadata.ttl = domain.ttl || null
      metadata.isMigrated = domain.isMigrated
      metadata.createdAt = domain.createdAt
      metadata.expiryDate = domain.expiryDate

      // Process all metadata events across all resolvers
      const textRecordsMap = new Map<string, string>()
      const interfacesMap = new Map<string, string>()
      const coinAddressesMap = new Map<string, string>()

      // Collect all events from all resolvers for this domain
      const allEvents: any[] = []
      if (data.data.resolvers) {
        data.data.resolvers.forEach((resolver: any) => {
          if (resolver.events) {
            allEvents.push(...resolver.events)
          }
        })
      }

      // Sort all events by block number descending (most recent first)
      const sortedEvents = allEvents.sort(
        (a, b) => b.blockNumber - a.blockNumber,
      )

      // Process events
      sortedEvents.forEach((event: any) => {
        if (event.__typename === 'TextChanged' && event.key) {
          if (!textRecordsMap.has(event.key)) {
            // Only add if value is not null and not empty string
            if (event.value !== null && event.value !== '') {
              textRecordsMap.set(event.key, event.value)
            }
          }
        } else if (event.__typename === 'MulticoinAddrChanged') {
          const coinType = event.coinType.toString()
          if (!coinAddressesMap.has(coinType)) {
            // Only add if addr is not null and not empty
            if (event.addr && event.addr !== '0x') {
              coinAddressesMap.set(coinType, event.addr)
            }
          }
        } else if (event.__typename === 'InterfaceChanged') {
          if (!interfacesMap.has(event.interfaceID)) {
            interfacesMap.set(event.interfaceID, event.implementer)
          }
        }
      })

      // Resolver info
      if (domain.resolver) {
        metadata.resolver = domain.resolver.id
        metadata.resolverAddress = domain.resolver.address
        metadata.ethAddress = domain.resolver.addr?.id || null
        metadata.contentHash = domain.resolver.contentHash || null

        // Also check the texts array from current resolver for additional keys
        if (domain.resolver.texts && Array.isArray(domain.resolver.texts)) {
          for (const textKey of domain.resolver.texts) {
            if (!textRecordsMap.has(textKey)) {
              // Find the most recent TextChanged event for this key from all events
              const textEvent = sortedEvents.find(
                (e: any) => e.__typename === 'TextChanged' && e.key === textKey,
              )
              if (
                textEvent &&
                textEvent.value !== null &&
                textEvent.value !== ''
              ) {
                textRecordsMap.set(textKey, textEvent.value)
              }
            }
          }
        }

        // Check coinTypes array from current resolver
        if (
          domain.resolver.coinTypes &&
          Array.isArray(domain.resolver.coinTypes)
        ) {
          for (const coinType of domain.resolver.coinTypes) {
            const coinTypeStr = coinType.toString()
            if (!coinAddressesMap.has(coinTypeStr)) {
              const coinEvent = sortedEvents.find(
                (e: any) =>
                  e.__typename === 'MulticoinAddrChanged' &&
                  e.coinType.toString() === coinTypeStr,
              )
              if (coinEvent && coinEvent.addr && coinEvent.addr !== '0x') {
                coinAddressesMap.set(coinTypeStr, coinEvent.addr)
              }
            }
          }
        }

        // Fetch coin addresses directly from the current resolver contract as final truth
        // This ensures we have the most up-to-date data
        if (metadata.resolverAddress && config?.RPC_ENDPOINT) {
          try {
            const viemChain = getViemChain(activeChainId)
            const publicClient = createPublicClient({
              chain: viemChain,
              transport: http(config.RPC_ENDPOINT),
            })

            const nameNode = namehash(name)

            // Query all known coin types
            const knownCoinTypes = Object.keys(COIN_TYPE_MAPPING)

            for (const coinType of knownCoinTypes) {
              try {
                // The addr function returns bytes, not address
                const addressBytes = (await readContract(publicClient, {
                  address: metadata.resolverAddress as `0x${string}`,
                  abi: publicResolverABI,
                  functionName: 'addr',
                  args: [nameNode, BigInt(coinType)],
                })) as `0x${string}`

                // Decode bytes to address for EVM chains
                // For EVM-compatible chains, the bytes should be 20 bytes (40 hex chars + 0x)
                if (
                  addressBytes &&
                  addressBytes !== '0x' &&
                  addressBytes.length >= 42
                ) {
                  // Extract address from bytes (take last 20 bytes / 40 hex chars)
                  const addressHex = ('0x' +
                    addressBytes.slice(-40)) as `0x${string}`

                  // Validate it's a valid address
                  if (
                    isAddress(addressHex) &&
                    addressHex !== '0x0000000000000000000000000000000000000000'
                  ) {
                    coinAddressesMap.set(coinType, getAddress(addressHex))
                  }
                }
              } catch (err) {
                // Coin type not set or error reading, skip
                console.debug(`Coin type ${coinType} not set or error:`, err)
              }
            }
          } catch (err) {
            console.error('Error fetching coin addresses from resolver:', err)
            // Fall back to subgraph data if direct contract call fails
          }
        }
      }

      // Convert maps to arrays
      metadata.textRecords = Array.from(textRecordsMap.entries()).map(
        ([key, value]) => ({
          key,
          value,
        }),
      )

      metadata.interfaces = Array.from(interfacesMap.entries()).map(
        ([interfaceID, implementer]) => ({
          interfaceID,
          implementer,
        }),
      )

      // If ethAddress exists but coinType 60 is not in the map, add it
      if (metadata.ethAddress && !coinAddressesMap.has('60')) {
        coinAddressesMap.set('60', metadata.ethAddress)
      }

      metadata.coinAddresses = Array.from(coinAddressesMap.entries()).map(
        ([coinType, addr]) => ({
          coinType,
          addr,
        }),
      )
    } catch (err: any) {
      console.error('Error fetching ENS metadata from subgraph:', err)
      metadata.error = err.message || 'Failed to fetch metadata'
    }

    return metadata
  }

  const fetchDirectSubnames = async (
    parentName: string,
  ): Promise<SubnameNode[]> => {
    if (!config?.SUBGRAPH_API) {
      return []
    }

    try {
      const parentNode = namehash(parentName)

      const response = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
        },
        body: JSON.stringify({
          query: `
            query getSubnames($parentId: ID!) {
              domains(
                where: { parent: $parentId }
                first: 100
                orderBy: createdAt
                orderDirection: desc
              ) {
                id
                name
                labelName
                subdomainCount
              }
            }
          `,
          variables: {
            parentId: parentNode,
          },
        }),
      })

      const data = await response.json()

      if (data.errors) {
        console.error('Subgraph error:', data.errors)
        return []
      }

      const domains = data.data?.domains || []

      return domains.map((domain: any) => {
        const rawName = domain.name || 'Unknown'
        const rawLabelName =
          domain.labelName || domain.name?.split('.')[0] || 'Unknown'

        // Heal the name and label if they contain labelhashes
        const healedName = healENSName(rawName)
        let healedLabelName = rawLabelName

        // If the labelName is in labelhash format [0x...], try to heal it
        if (isLabelhash(rawLabelName)) {
          const hash = extractLabelhash(rawLabelName)
          if (hash) {
            const healed = healLabelhash(hash)
            // Only use the healed version if it's different from the hash
            if (healed !== hash) {
              healedLabelName = healed
            }
          }
        } else if (
          rawLabelName &&
          rawLabelName.startsWith('0x') &&
          rawLabelName.length === 66
        ) {
          // Handle case where labelName is just a hash without brackets
          const healed = healLabelhash(rawLabelName)
          if (healed !== rawLabelName) {
            healedLabelName = healed
          }
        }

        return {
          name: healedName,
          labelName: healedLabelName,
          metadata: null,
          expanded: false,
          hasSubnames: domain.subdomainCount > 0,
        }
      })
    } catch (err) {
      console.error('Error fetching subnames:', err)
      return []
    }
  }

  const getParentHierarchy = (name: string): string[] => {
    const parts = name.split('.')
    const hierarchy: string[] = []

    for (let i = 1; i < parts.length; i++) {
      hierarchy.push(parts.slice(i).join('.'))
    }

    // Reverse to show from root to leaf (e.g., ens.eth, then l2.ens.eth)
    return hierarchy.reverse()
  }

  const handleSearch = async () => {
    if (!searchName.trim()) {
      setError('Please enter an ENS name')
      return
    }

    setLoading(true)
    setError('')
    setMetadata(null)
    setParentHierarchy([])

    try {
      const normalizedName = normalize(searchName.trim())

      // Check if it's a TLD (no dots in the name)
      const parts = normalizedName.split('.')
      if (parts.length === 1) {
        setError(
          'TLDs (like .eth) are not supported. Please enter a full ENS name (e.g., vitalik.eth)',
        )
        setLoading(false)
        return
      }

      setCurrentName(normalizedName)

      // Fetch current name metadata
      const fetchedMetadata = await fetchENSMetadataFromSubgraph(normalizedName)
      setMetadata(fetchedMetadata)

      if (fetchedMetadata.error) {
        setError(fetchedMetadata.error)
      }

      // Fetch parent hierarchy (exclude TLDs)
      const parents = getParentHierarchy(normalizedName)
      const hierarchyNodes: HierarchyNode[] = []

      for (const parentName of parents) {
        // Skip TLDs
        if (parentName.split('.').length > 1) {
          // Heal the parent name if it contains labelhashes
          const healedParentName = healENSName(parentName)
          hierarchyNodes.push({
            name: healedParentName,
            metadata: null,
            expanded: false,
          })
        }
      }

      setParentHierarchy(hierarchyNodes)

      // Load first parent metadata automatically
      if (hierarchyNodes.length > 0) {
        await loadParentMetadata(0)
      }

      // Load direct subnames
      const subnames = await fetchDirectSubnames(normalizedName)
      setSubnameHierarchy(subnames)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch metadata')
    } finally {
      setLoading(false)
    }
  }

  const loadParentMetadata = async (index: number) => {
    const parent = parentHierarchy[index]
    if (!parent || parent.metadata) return

    try {
      const fetchedMetadata = await fetchENSMetadataFromSubgraph(parent.name)

      setParentHierarchy((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          metadata: fetchedMetadata,
        }
        return updated
      })
    } catch (err) {
      console.error('Error loading parent metadata:', err)
    }
  }

  const toggleParentExpansion = async (index: number) => {
    setParentHierarchy((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        expanded: !updated[index].expanded,
      }
      return updated
    })

    // Load metadata if not already loaded
    if (!parentHierarchy[index].metadata && !parentHierarchy[index].expanded) {
      await loadParentMetadata(index)
    }
  }

  const navigateToName = (name: string) => {
    setSearchName(name)
    handleSearchForName(name)
    // Update URL to reflect the current name
    router.push(`/nameMetadata?name=${encodeURIComponent(name)}`, undefined, { shallow: true })
  }

  const handleExploreAddress = async (name: string) => {
    try {
      // Show loading toast
      toast({
        title: 'Resolving ENS name...',
        description: `Looking up address for ${name}`,
      })

      let resolvedAddress: string | null = null

      // Determine if we're on a testnet
      const isTestnet = [
        CHAINS.SEPOLIA,
        CHAINS.LINEA_SEPOLIA,
        CHAINS.BASE_SEPOLIA,
        CHAINS.OPTIMISM_SEPOLIA,
        CHAINS.ARBITRUM_SEPOLIA,
        CHAINS.SCROLL_SEPOLIA,
      ].includes(activeChainId)

      // Use mainnet for mainnets, sepolia for testnets
      const ensChainId = isTestnet ? CHAINS.SEPOLIA : CHAINS.MAINNET

      console.log(
        'Using chain for ENS resolution:',
        ensChainId,
        isTestnet ? '(testnet)' : '(mainnet)',
      )

      // For Base chains, use their public resolver
      if (
        activeChainId === CHAINS.BASE ||
        activeChainId === CHAINS.BASE_SEPOLIA
      ) {
        try {
          const baseConfig = CONTRACTS[activeChainId]
          const baseClient = createPublicClient({
            transport: http(baseConfig.RPC_ENDPOINT),
            chain: {
              id: activeChainId,
              name: 'Base',
              network: 'base',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: { default: { http: [baseConfig.RPC_ENDPOINT] } },
            },
          })

          const publicResolverAbi = parseAbi([
            'function addr(bytes32 node) view returns (address)',
          ])

          const address = (await readContract(baseClient, {
            address: baseConfig.PUBLIC_RESOLVER as `0x${string}`,
            abi: publicResolverAbi,
            functionName: 'addr',
            args: [namehash(name)],
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
          const ensConfig = CONTRACTS[ensChainId]
          const provider = new ethers.JsonRpcProvider(ensConfig.RPC_ENDPOINT)
          resolvedAddress = await provider.resolveName(name)
        } catch (resolveError: any) {
          console.error(
            'Error resolving ENS name on mainnet/sepolia:',
            resolveError,
          )
        }
      }

      if (
        resolvedAddress &&
        resolvedAddress !== '0x0000000000000000000000000000000000000000' &&
        resolvedAddress !== '0x0000000000000000000000000000000000000020'
      ) {
        // Name resolves to a valid address, navigate to explore page
        toast({
          title: 'Success',
          description: `Resolved ${name} to ${resolvedAddress.slice(0, 10)}...`,
        })

        // Open in new tab
        window.open(`/explore/${activeChainId}/${name}`, '_blank')
      } else {
        // Name doesn't resolve to an address
        toast({
          title: 'Name does not resolve',
          description: `${name} does not resolve to any address on this network`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error exploring address:', error)
      toast({
        title: 'Error',
        description: 'Failed to resolve ENS name. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSearchForName = async (name: string) => {
    setLoading(true)
    setError('')
    setMetadata(null)
    setParentHierarchy([])

    // Check if it's a TLD (no dots in the name)
    const parts = name.split('.')
    if (parts.length === 1) {
      setError(
        'TLDs (like .eth) are not supported. Please enter a full ENS name (e.g., vitalik.eth)',
      )
      setLoading(false)
      return
    }

    setCurrentName(name)

    try {
      const fetchedMetadata = await fetchENSMetadataFromSubgraph(name)
      setMetadata(fetchedMetadata)

      if (fetchedMetadata.error) {
        setError(fetchedMetadata.error)
      }

      // Fetch parent hierarchy (exclude TLDs)
      const parents = getParentHierarchy(name)
      const hierarchyNodes: HierarchyNode[] = []

      for (const parentName of parents) {
        // Skip TLDs
        if (parentName.split('.').length > 1) {
          // Heal the parent name if it contains labelhashes
          const healedParentName = healENSName(parentName)
          hierarchyNodes.push({
            name: healedParentName,
            metadata: null,
            expanded: false,
          })
        }
      }

      setParentHierarchy(hierarchyNodes)

      if (hierarchyNodes.length > 0) {
        await loadParentMetadata(0)
      }

      // Load direct subnames
      const subnames = await fetchDirectSubnames(name)
      setSubnameHierarchy(subnames)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch metadata')
    } finally {
      setLoading(false)
    }
  }

  const toggleSubnameExpansion = async (index: number) => {
    setSubnameHierarchy((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        expanded: !updated[index].expanded,
      }
      return updated
    })

    // Load metadata if not already loaded
    const subname = subnameHierarchy[index]
    if (!subname.metadata && !subname.expanded) {
      await loadSubnameMetadata(index)
    }
  }

  const loadSubnameMetadata = async (index: number) => {
    const subname = subnameHierarchy[index]
    if (!subname || subname.metadata) return

    try {
      const fetchedMetadata = await fetchENSMetadataFromSubgraph(subname.name)

      setSubnameHierarchy((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          metadata: fetchedMetadata,
        }
        return updated
      })
    } catch (err) {
      console.error('Error loading subname metadata:', err)
    }
  }

  const openMetadataModal = () => {
    // Load all existing text records
    const existing =
      metadata?.textRecords
        .filter((r) => r.value !== null && r.value !== '')
        .map((r) => ({ key: r.key, value: r.value || '', isNew: false })) || []

    setEditingRecords(existing)
    setCustomKey('')
    setCustomValue('')
    setShowAllMetadata(false)
    setShowAccountMetadata(false)
    setShowContractMetadata(false)
    setIsModalOpen(true)
  }

  // Check if address is a contract
  const checkIsContract = async (address: string): Promise<boolean> => {
    if (!address || !config?.SUBGRAPH_API) return false

    try {
      // Simple heuristic: if the address has code, it's a contract
      // We can use the public client for this
      const response = await fetch(`${config.RPC_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getCode',
          params: [address, 'latest'],
          id: 1,
        }),
      })
      const data = await response.json()
      return data.result && data.result !== '0x' && data.result !== '0x0'
    } catch (err) {
      console.error('Error checking if contract:', err)
      return false
    }
  }

  // Check if any subname resolves to a contract
  const hasContractSubnames = async (): Promise<boolean> => {
    for (const subname of subnameHierarchy) {
      if (subname.metadata?.ethAddress) {
        const isContract = await checkIsContract(subname.metadata.ethAddress)
        if (isContract) return true
      }
    }
    return false
  }

  // Get recommended metadata keys based on address type
  const getRecommendedMetadata = async () => {
    const ethAddress = metadata?.ethAddress

    if (!ethAddress) {
      // No address resolution
      const hasContracts = await hasContractSubnames()
      if (hasContracts) {
        // Has contract subnames
        return [
          'alias',
          'theme',
          'header',
          'description',
          'url',
          'category',
          'license',
          'docs',
          'audits',
        ]
      }
      // No address and no contract subnames
      return ['alias', 'theme', 'header', 'description', 'url']
    }

    // Check if it's a contract
    const isContract = await checkIsContract(ethAddress)

    if (isContract) {
      // Contract address
      return ['category', 'license', 'docs', 'audits', 'url']
    } else {
      // EOA (Externally Owned Account)
      return [
        'alias',
        'theme',
        'avatar',
        'header',
        'description',
        'location',
        'url',
      ]
    }
  }

  const [recommendedKeys, setRecommendedKeys] = useState<string[]>([])

  // Update recommended keys when modal opens
  useEffect(() => {
    if (isModalOpen && metadata) {
      getRecommendedMetadata().then((keys) => setRecommendedKeys(keys))
    }
  }, [isModalOpen, metadata])

  const addMetadataKey = (key: string, label: string) => {
    // Don't add if already exists
    if (editingRecords.some((r) => r.key === key)) {
      return
    }

    setEditingRecords([...editingRecords, { key, value: '', isNew: true }])
  }

  const removeRecord = (index: number) => {
    setEditingRecords(editingRecords.filter((_, i) => i !== index))
  }

  const updateRecord = (
    index: number,
    field: 'key' | 'value',
    value: string,
  ) => {
    const updated = [...editingRecords]
    updated[index] = { ...updated[index], [field]: value }
    setEditingRecords(updated)
  }

  const addCustomMetadata = () => {
    if (!customKey.trim() || !customValue.trim()) {
      toast({
        title: 'Invalid Input',
        description: 'Both key and value are required',
        variant: 'destructive',
      })
      return
    }

    // Check if key already exists
    if (editingRecords.some((r) => r.key === customKey.trim())) {
      toast({
        title: 'Duplicate Key',
        description: 'This key is already in use',
        variant: 'destructive',
      })
      return
    }

    setEditingRecords([
      ...editingRecords,
      { key: customKey.trim(), value: customValue.trim(), isNew: true },
    ])
    setCustomKey('')
    setCustomValue('')
  }

  // Get available keys (not already in editing records)
  const getAvailableKeys = (keys: string[]) => {
    const existingKeys = new Set(editingRecords.map((r) => r.key))
    const allMetadata = [...ACCOUNT_METADATA, ...CONTRACT_METADATA]
    return keys
      .filter((key) => !existingKeys.has(key))
      .map((key) => allMetadata.find((m) => m.key === key))
      .filter(Boolean) as typeof ACCOUNT_METADATA
  }

  const getAvailableMetadataByCategory = (
    metadataList: typeof ACCOUNT_METADATA,
  ) => {
    const existingKeys = new Set(editingRecords.map((r) => r.key))
    return metadataList.filter((item) => !existingKeys.has(item.key))
  }

  const checkIfSafeWallet = async (): Promise<boolean> => {
    return await checkIfSafe(connector)
  }

  const handleSetTextRecords = async () => {
    if (!walletClient || !walletAddress) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to set text records',
        variant: 'destructive',
      })
      return
    }

    if (!metadata?.resolverAddress || !currentName) {
      toast({
        title: 'Error',
        description: 'No resolver found for this ENS name',
        variant: 'destructive',
      })
      return
    }

    // Check if user is the owner (check both wrappedOwner and owner)
    const isOwner =
      (metadata.wrappedOwner &&
        metadata.wrappedOwner.toLowerCase() === walletAddress.toLowerCase()) ||
      (metadata.owner &&
        metadata.owner.toLowerCase() === walletAddress.toLowerCase())

    if (!isOwner) {
      toast({
        title: 'Not Authorized',
        description:
          'You must be the owner of this ENS name to set text records',
        variant: 'destructive',
      })
      return
    }

    setSettingRecords(true)

    try {
      // Check if using Safe wallet
      const safeCheck = await checkIfSafeWallet()
      
      const node = namehash(currentName)

      // Filter out empty values
      const recordsToSet = editingRecords.filter(
        (r) => r.key.trim() !== '' && r.value.trim() !== '',
      )

      if (recordsToSet.length === 0) {
        toast({
          title: 'No Records',
          description: 'Please add at least one text record with a value',
          variant: 'destructive',
        })
        setSettingRecords(false)
        return
      }

      // Encode each setText call
      const encodedCalls = recordsToSet.map((record) =>
        encodeFunctionData({
          abi: publicResolverABI,
          functionName: 'setText',
          args: [node, record.key, record.value],
        }),
      )

      // Call multicall with all encoded setText calls in a single transaction
      if (safeCheck) {
        // For Safe wallets, just trigger the transaction without waiting
        await writeContract(walletClient, {
          chain: chain,
          address: metadata.resolverAddress as `0x${string}`,
          abi: publicResolverABI,
          functionName: 'multicall',
          args: [encodedCalls],
        })

        toast({
          title: 'Safe Transaction Created',
          description: `Transaction sent to Safe wallet. Please confirm in Safe app to set ${recordsToSet.length} text record(s).`,
        })
      } else {
        // For regular wallets, wait for transaction confirmation
        const hash = await writeContract(walletClient, {
          chain: chain,
          address: metadata.resolverAddress as `0x${string}`,
          abi: publicResolverABI,
          functionName: 'multicall',
          args: [encodedCalls],
        })

        await waitForTransactionReceipt(walletClient, { hash })

        toast({
          title: 'Success',
          description: `Successfully set ${recordsToSet.length} text record(s) in a single transaction`,
        })
      }

      setIsModalOpen(false)

      // Refresh metadata (with longer delay for Safe wallets)
      setTimeout(() => {
        handleSearchForName(currentName)
      }, safeCheck ? 5000 : 2000)
    } catch (err: any) {
      console.error('Error setting text records:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to set text records',
        variant: 'destructive',
      })
    } finally {
      setSettingRecords(false)
    }
  }

  // Check if user is owner or manager of the ENS name
  // For wrapped names, check wrappedOwner; for regular names, check owner
  const isOwnerOrManager =
    walletAddress &&
    metadata &&
    ((metadata.wrappedOwner &&
      metadata.wrappedOwner.toLowerCase() === walletAddress.toLowerCase()) ||
      (metadata.owner &&
        metadata.owner.toLowerCase() === walletAddress.toLowerCase()))

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
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
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
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRightIcon className="w-3.5 h-3.5" />
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
                        <ChevronDownIcon className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRightIcon className="w-3.5 h-3.5" />
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
                        <PlusIcon className="w-4 h-4 mr-1" />
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
              <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
              <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
