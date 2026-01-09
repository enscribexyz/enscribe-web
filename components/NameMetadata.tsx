import React, { useState, useEffect, useCallback } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { namehash, normalize } from 'viem/ens'
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from '@heroicons/react/24/outline'
import { Loader2, X } from 'lucide-react'
import { writeContract, waitForTransactionReceipt } from 'viem/actions'
import publicResolverABI from '../contracts/PublicResolver'
import { useToast } from '@/hooks/use-toast'

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
  { key: 'description', label: 'Description', placeholder: 'Bio or description' },
  { key: 'location', label: 'Location', placeholder: 'City, Country' },
  { key: 'url', label: 'URL', placeholder: 'https://...' },
  { key: 'timezone', label: 'Timezone', placeholder: 'e.g., UTC, EST' },
  { key: 'language', label: 'Language', placeholder: 'e.g., en, es, fr' },
  { key: 'primary-contact', label: 'Primary Contact', placeholder: 'Contact method' },
  { key: 'com.github', label: 'GitHub', placeholder: 'GitHub username' },
  { key: 'com.peepeth', label: 'Peepeth', placeholder: 'Peepeth username' },
  { key: 'com.linkedin', label: 'LinkedIn', placeholder: 'LinkedIn username' },
  { key: 'com.twitter', label: 'Twitter', placeholder: 'Twitter username' },
  { key: 'io.keybase', label: 'Keybase', placeholder: 'Keybase username' },
  { key: 'org.telegram', label: 'Telegram', placeholder: 'Telegram username' },
]

const CONTRACT_METADATA = [
  { key: 'category', label: 'Category', placeholder: 'e.g., defi, gaming, social, utility' },
  { key: 'license', label: 'License', placeholder: 'e.g., MIT, GPL-3.0, Apache-2.0' },
  { key: 'docs', label: 'Documentation', placeholder: 'https://...' },
  { key: 'audits', label: 'Security Audits', placeholder: 'JSON array or URLs' },
  { key: 'proxy', label: 'Proxy Info', placeholder: 'JSON: {"type":"...", "target":"..."}' },
]

interface TextRecordInput {
  key: string
  value: string
  isNew?: boolean
}

interface NameMetadataProps {
  selectedChain?: number
}

export default function NameMetadata({ selectedChain }: NameMetadataProps) {
  const { chain, address: walletAddress } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { toast } = useToast()
  
  const [searchName, setSearchName] = useState('')
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

  // Use wallet chain if connected, otherwise use selected chain from ChainSelector
  const activeChainId = chain?.id || selectedChain || CHAINS.MAINNET
  const config = CONTRACTS[activeChainId]

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

  const fetchENSMetadataFromSubgraph = async (name: string): Promise<ENSMetadata> => {
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
                  events(orderBy: blockNumber, orderDirection: desc) {
                    __typename
                    ... on TextChanged {
                      id
                      key
                      value
                      blockNumber
                    }
                    ... on InterfaceChanged {
                      id
                      interfaceID
                      implementer
                      blockNumber
                    }
                    ... on MulticoinAddrChanged {
                      id
                      coinType
                      addr
                      blockNumber
                    }
                  }
                }
                ttl
                isMigrated
                createdAt
                expiryDate
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
        throw new Error(data.errors[0]?.message || 'Failed to fetch from subgraph')
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

      // Resolver info
      if (domain.resolver) {
        metadata.resolver = domain.resolver.id
        metadata.resolverAddress = domain.resolver.address
        metadata.ethAddress = domain.resolver.addr?.id || null
        metadata.contentHash = domain.resolver.contentHash || null

        // Process text records from events
        const textRecordsMap = new Map<string, string>()
        const interfacesMap = new Map<string, string>()
        const coinAddressesMap = new Map<string, string>()

        if (domain.resolver.events) {
          // Sort events by block number descending to get latest values
          const sortedEvents = [...domain.resolver.events].sort(
            (a, b) => b.blockNumber - a.blockNumber
          )

          sortedEvents.forEach((event: any) => {
            if (event.__typename === 'TextChanged' && event.key) {
              if (!textRecordsMap.has(event.key)) {
                // Only add if value is not null and not empty string
                if (event.value !== null && event.value !== '') {
                  textRecordsMap.set(event.key, event.value)
                }
              }
            } else if (event.__typename === 'InterfaceChanged') {
              if (!interfacesMap.has(event.interfaceID)) {
                interfacesMap.set(event.interfaceID, event.implementer)
              }
            } else if (event.__typename === 'MulticoinAddrChanged') {
              const coinType = event.coinType.toString()
              if (!coinAddressesMap.has(coinType)) {
                coinAddressesMap.set(coinType, event.addr)
              }
            }
          })
        }

        // Also check the texts array from resolver for additional keys
        if (domain.resolver.texts && Array.isArray(domain.resolver.texts)) {
          // The texts array contains keys that have been set
          // We should query for their values if not already in the map
          for (const textKey of domain.resolver.texts) {
            if (!textRecordsMap.has(textKey)) {
              // Find the most recent TextChanged event for this key
              const textEvent = domain.resolver.events?.find(
                (e: any) => e.__typename === 'TextChanged' && e.key === textKey
              )
              if (textEvent?.value !== null && textEvent?.value !== '') {
                textRecordsMap.set(textKey, textEvent.value)
              }
            }
          }
        }

        // Convert maps to arrays
        metadata.textRecords = Array.from(textRecordsMap.entries()).map(([key, value]) => ({
          key,
          value,
        }))

        metadata.interfaces = Array.from(interfacesMap.entries()).map(
          ([interfaceID, implementer]) => ({
            interfaceID,
            implementer,
          })
        )

        metadata.coinAddresses = Array.from(coinAddressesMap.entries()).map(
          ([coinType, addr]) => ({
            coinType,
            addr,
          })
        )
      }
    } catch (err: any) {
      console.error('Error fetching ENS metadata from subgraph:', err)
      metadata.error = err.message || 'Failed to fetch metadata'
    }

    return metadata
  }

  const fetchDirectSubnames = async (parentName: string): Promise<SubnameNode[]> => {
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
      
      return domains.map((domain: any) => ({
        name: domain.name || 'Unknown',
        labelName: domain.labelName || domain.name?.split('.')[0] || 'Unknown',
        metadata: null,
        expanded: false,
        hasSubnames: domain.subdomainCount > 0,
      }))
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
        setError('TLDs (like .eth) are not supported. Please enter a full ENS name (e.g., vitalik.eth)')
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
          hierarchyNodes.push({
            name: parentName,
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
  }

  const handleSearchForName = async (name: string) => {
    setLoading(true)
    setError('')
    setMetadata(null)
    setParentHierarchy([])
    
    // Check if it's a TLD (no dots in the name)
    const parts = name.split('.')
    if (parts.length === 1) {
      setError('TLDs (like .eth) are not supported. Please enter a full ENS name (e.g., vitalik.eth)')
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
          hierarchyNodes.push({
            name: parentName,
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
    const existing = metadata?.textRecords
      .filter(r => r.value !== null && r.value !== '')
      .map(r => ({ key: r.key, value: r.value || '', isNew: false })) || []
    
    setEditingRecords(existing)
    setCustomKey('')
    setCustomValue('')
    setIsModalOpen(true)
  }

  const addMetadataKey = (key: string, label: string) => {
    // Don't add if already exists
    if (editingRecords.some(r => r.key === key)) {
      return
    }
    
    setEditingRecords([...editingRecords, { key, value: '', isNew: true }])
  }

  const removeRecord = (index: number) => {
    setEditingRecords(editingRecords.filter((_, i) => i !== index))
  }

  const updateRecord = (index: number, field: 'key' | 'value', value: string) => {
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
    if (editingRecords.some(r => r.key === customKey.trim())) {
      toast({
        title: 'Duplicate Key',
        description: 'This key is already in use',
        variant: 'destructive',
      })
      return
    }

    setEditingRecords([...editingRecords, { key: customKey.trim(), value: customValue.trim(), isNew: true }])
    setCustomKey('')
    setCustomValue('')
  }

  // Get available pills (not already in editing records)
  const getAvailableKeys = (metadataList: typeof ACCOUNT_METADATA) => {
    const existingKeys = new Set(editingRecords.map(r => r.key))
    return metadataList.filter(item => !existingKeys.has(item.key))
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

    // Check if user is the owner
    if (metadata.owner && metadata.owner.toLowerCase() !== walletAddress.toLowerCase()) {
      toast({
        title: 'Not Authorized',
        description: 'You must be the owner of this ENS name to set text records',
        variant: 'destructive',
      })
      return
    }

    setSettingRecords(true)

    try {
      const node = namehash(currentName)
      
      // Filter out empty values
      const recordsToSet = editingRecords.filter(r => r.key.trim() !== '' && r.value.trim() !== '')

      if (recordsToSet.length === 0) {
        toast({
          title: 'No Records',
          description: 'Please add at least one text record with a value',
          variant: 'destructive',
        })
        setSettingRecords(false)
        return
      }

      // Set each text record
      for (const record of recordsToSet) {
        const hash = await writeContract(walletClient, {
          chain: chain,
          address: metadata.resolverAddress as `0x${string}`,
          abi: publicResolverABI,
          functionName: 'setText',
          args: [node, record.key, record.value],
        })

        await waitForTransactionReceipt(walletClient, { hash })
      }

      toast({
        title: 'Success',
        description: `Successfully set ${recordsToSet.length} text record(s)`,
      })

      setIsModalOpen(false)
      
      // Refresh metadata
      setTimeout(() => {
        handleSearchForName(currentName)
      }, 2000)
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
  const isOwnerOrManager = metadata?.owner && walletAddress && 
    metadata.owner.toLowerCase() === walletAddress.toLowerCase()

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Name Metadata
        </h2>

        {/* Info Box */}
        {!config?.SUBGRAPH_API && (
          <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Subgraph not configured for this network.</strong> Please select a supported network (Ethereum Mainnet, Sepolia, Base Mainnet, Base Sepolia) to view ENS metadata.
            </p>
          </div>
        )}

        {/* Search Section */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            ENS Name
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="vitalik.eth"
              className="flex-1 bg-white dark:bg-gray-700 text-black dark:text-white border-gray-300 dark:border-gray-600"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  Loading...
                </>
              ) : (
                'Search'
              )}
            </Button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>

        {/* Current Name Display */}
        {/* {currentName && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Current Name
            </h3>
            <p className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
              {currentName}
            </p>
          </div>
        )} */}

        {/* Parent Hierarchy */}
        {parentHierarchy.length > 0 && (
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
                />
              ))}
            </div>
          </div>
        )}

        {/* Current Name Metadata */}
        {metadata && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentName} Metadata
              </h3>
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
        {subnameHierarchy.length > 0 && (
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
                />
              ))}
            </div>
          </div>
        )}
      </div>

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
                            <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                              New
                            </span>
                          )}
                        </div>
                        <Input
                          type="text"
                          value={record.value}
                          onChange={(e) => updateRecord(index, 'value', e.target.value)}
                          placeholder={`Enter value for ${record.key}`}
                          className="bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                        />
                      </div>
                      <Button
                        onClick={() => removeRecord(index)}
                        variant="outline"
                        size="sm"
                        className="mt-6 px-2 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Account Metadata Pills */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Account Metadata
              </h4>
              <div className="flex flex-wrap gap-2">
                {getAvailableKeys(ACCOUNT_METADATA).length > 0 ? (
                  getAvailableKeys(ACCOUNT_METADATA).map((item) => (
                    <button
                      key={item.key}
                      onClick={() => addMetadataKey(item.key, item.label)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors border border-blue-300 dark:border-blue-700"
                    >
                      + {item.label}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">All account metadata keys are already added</p>
                )}
              </div>
            </div>

            {/* Contract Metadata Pills */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Contract Metadata
              </h4>
              <div className="flex flex-wrap gap-2">
                {getAvailableKeys(CONTRACT_METADATA).length > 0 ? (
                  getAvailableKeys(CONTRACT_METADATA).map((item) => (
                    <button
                      key={item.key}
                      onClick={() => addMetadataKey(item.key, item.label)}
                      className="px-3 py-1.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors border border-purple-300 dark:border-purple-700"
                    >
                      + {item.label}
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">All contract metadata keys are already added</p>
                )}
              </div>
            </div>

            {/* Custom Key-Value */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Custom Metadata
              </h4>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="Key (e.g., discord, website)"
                  className="flex-1 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomMetadata()}
                />
                <Input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder="Value"
                  className="flex-1 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-300 dark:border-gray-600"
                  onKeyPress={(e) => e.key === 'Enter' && addCustomMetadata()}
                />
                <Button
                  onClick={addCustomMetadata}
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Note:</strong> Setting text records requires you to be the owner of this ENS name and will create on-chain transactions.
              </p>
              {metadata?.owner && walletAddress && (
                <p className="text-xs mt-2 text-blue-800 dark:text-blue-300">
                  {metadata.owner.toLowerCase() === walletAddress.toLowerCase() ? (
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
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="outline"
                disabled={settingRecords}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSetTextRecords}
                disabled={settingRecords || editingRecords.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
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
}

function ParentHierarchyNode({ node, index, onToggle, onNavigate }: ParentHierarchyNodeProps) {
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
}

function SubnameHierarchyNode({ node, index, onToggle, onNavigate }: SubnameHierarchyNodeProps) {
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
            {metadata.ethAddress && (
              <InfoRow label="ETH Address" value={metadata.ethAddress} mono />
            )}
            {metadata.coinAddresses.map((coin) => (
              <InfoRow
                key={coin.coinType}
                label={`Coin Type ${coin.coinType}`}
                value={coin.addr}
                mono
              />
            ))}
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
      {!metadata.ethAddress &&
        metadata.coinAddresses.length === 0 &&
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
          <p className="text-sm text-red-600 dark:text-red-400">{metadata.error}</p>
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
