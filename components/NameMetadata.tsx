import React, { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { namehash, normalize } from 'viem/ens'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { Loader2 } from 'lucide-react'

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

export default function NameMetadata() {
  const { chain } = useAccount()
  const [searchName, setSearchName] = useState('')
  const [currentName, setCurrentName] = useState('')
  const [metadata, setMetadata] = useState<ENSMetadata | null>(null)
  const [parentHierarchy, setParentHierarchy] = useState<HierarchyNode[]>([])
  const [subnameHierarchy, setSubnameHierarchy] = useState<SubnameNode[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const config = chain?.id ? CONTRACTS[chain.id] : undefined

  // Supported chains for ENS
  const isMainnet = chain?.id === CHAINS.MAINNET || chain?.id === CHAINS.SEPOLIA

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
    
    return hierarchy
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

  if (!isMainnet) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
            Name Metadata
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This feature is only available on Ethereum Mainnet and Sepolia testnet.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            Please switch to {chain?.id ? 'Ethereum Mainnet or Sepolia' : 'a supported network'} to use this feature.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Name Metadata
        </h2>

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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {currentName} Metadata
            </h3>
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
