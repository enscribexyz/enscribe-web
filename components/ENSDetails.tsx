import React, { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { useAccount, usePublicClient } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Copy,
  ExternalLink,
  ShieldCheck,
  XCircle,
  TriangleAlert,
} from 'lucide-react'
import {
  CHAINS,
  CONTRACTS,
  OLI_ATTESTATION_URL,
  OLI_GQL_URL,
  OLI_SEARCH_URL,
} from '@/utils/constants'
import reverseRegistrarABI from '@/contracts/ReverseRegistrar'
import publicResolverABI from '@/contracts/PublicResolver'
import Link from 'next/link'
import ensRegistryABI from '@/contracts/ENSRegistry'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { ProfileCard } from 'ethereum-identity-kit'
import { FullWidthProfile } from 'ethereum-identity-kit'
import { checkIfProxy } from '@/utils/proxy'
import { useToast } from '@/hooks/use-toast'
// import { EnsRainbowApiClient } from '@ensnode/ensrainbow-sdk'

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

interface ImplementationDetailsProps {
  implementationAddress: string
  chainId: number
}

interface ENSDomain {
  name: string
  isPrimary?: boolean
  expiryDate?: number
  hasLabelhash?: boolean
  level?: number
  parent2LD?: string
}

interface TextRecords {
  name?: string
  alias?: string
  description?: string
  url?: string
  avatar?: string
  category?: string
  license?: string
  docs?: string
  audits?: string
}

interface VerificationStatus {
  sourcify_verification: string
  etherscan_verification: string
  blockscout_verification: string
  audit_status: string
  attestation_tx_hash: string
  ens_name: string
  diligence_audit: string
  openZepplin_audit: string
  cyfrin_audit: string
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
  // State for copy feedback
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  // State for implementation details expansion
  const [implementationExpanded, setImplementationExpanded] = useState(false)
  // State for ENS names sections expansion
  const [associatedNamesExpanded, setAssociatedNamesExpanded] = useState(false)
  const [ownedNamesExpanded, setOwnedNamesExpanded] = useState(false)
  
  // State for text records
  const [textRecords, setTextRecords] = useState<TextRecords>({})

  // Function to copy text to clipboard
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied({ ...copied, [id]: true })
        setTimeout(() => {
          setCopied({ ...copied, [id]: false })
        }, 2000)
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err)
      })
  }
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ensNames, setEnsNames] = useState<ENSDomain[]>([])
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [contractDeployerPrimaryName, setContractDeployerPrimaryName] =
    useState<string | null>(null)
  const [primaryNameExpiryDate, setPrimaryNameExpiryDate] = useState<
    number | null
  >(null)
  const [selectedForwardName, setSelectedForwardName] = useState<string | null>(
    null,
  )
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null)
  const [hasAttestations, setHasAttestations] = useState<boolean>(false)
  const [userOwnedDomains, setUserOwnedDomains] = useState<ENSDomain[]>([])
  const { chain, isConnected } = useAccount()
  const walletPublicClient = usePublicClient()
  const [customProvider, setCustomProvider] =
    useState<ethers.JsonRpcProvider | null>(null)
  const { toast } = useToast()

  // Use provided chainId if available, otherwise use connected wallet's chain
  const effectiveChainId = chainId || chain?.id
  const config = effectiveChainId ? CONTRACTS[effectiveChainId] : undefined
  const etherscanUrl = config?.ETHERSCAN_URL || 'https://etherscan.io/'
  const SOURCIFY_URL = 'https://sourcify.dev/#/lookup/'

  // Determine if we should use the wallet client or a custom provider
  const shouldUseWalletClient = isConnected && chainId === chain?.id

  console.log('[ENSDetails] Wallet connection status:', {
    isConnected,
    walletChainId: chain?.id,
    providedChainId: chainId,
    shouldUseWalletClient,
  })

  const fetchUserOwnedDomains = useCallback(async () => {
    if (!address || !config?.SUBGRAPH_API) {
      console.warn('Address or subgraph API is not configured')
      return
    }

    try {
      // Fetch domains where user is the owner, registrant, or wrapped owner
      const [ownerResponse, registrantResponse, wrappedResponse] =
        await Promise.all([
          fetch(config.SUBGRAPH_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
            },
            body: JSON.stringify({
              query: `
                                query getDomainsForAccount($address: String!) { 
                                    domains(where: { owner: $address }) { 
                                        name 
                                        registration {
                                            expiryDate
                                            registrationDate
                                        }
                                    } 
                                }
                            `,
              variables: { address: address.toLowerCase() },
            }),
          }),
          fetch(config.SUBGRAPH_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
            },
            body: JSON.stringify({
              query: `
                                query getDomainsForAccount($address: String!) { 
                                    domains(where: { registrant: $address }) { 
                                        name 
                                        registration {
                                            expiryDate
                                            registrationDate
                                        }
                                    } 
                                }
                            `,
              variables: { address: address.toLowerCase() },
            }),
          }),
          fetch(config.SUBGRAPH_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
            },
            body: JSON.stringify({
              query: `
                                query getDomainsForAccount($address: String!) { 
                                    domains(where: { wrappedOwner: $address }) { 
                                        name 
                                        registration {
                                            expiryDate
                                            registrationDate
                                        }
                                    } 
                                }
                            `,
              variables: { address: address.toLowerCase() },
            }),
          }),
        ])

      const [ownerData, registrantData, wrappedData] = await Promise.all([
        ownerResponse.json(),
        registrantResponse.json(),
        wrappedResponse.json(),
      ])

      // Combine all domains and remove duplicates by name
      const ownedDomainsMap = new Map()

      // Process each set of domains
      ;[
        ownerData?.data?.domains || [],
        registrantData?.data?.domains || [],
        wrappedData?.data?.domains || [],
      ].forEach((domains) => {
        domains.forEach(
          (domain: {
            name: string
            registration: { expiryDate: string } | null
          }) => {
            if (
              !domain.name.endsWith('.addr.reverse') &&
              !ownedDomainsMap.has(domain.name)
            ) {
              ownedDomainsMap.set(domain.name, {
                name: domain.name,
                expiryDate: domain.registration?.expiryDate
                  ? Number(domain.registration.expiryDate)
                  : undefined,
              })
            }
          },
        )
      })

      // Convert to array and enhance with additional properties
      const domainsArray = Array.from(ownedDomainsMap.values()).map(
        (domain: ENSDomain) => {
          const nameParts = domain.name.split('.')
          const tld = nameParts[nameParts.length - 1]
          const sld = nameParts[nameParts.length - 2] || ''
          const parent2LD = `${sld}.${tld}`
          const level = nameParts.length
          const hasLabelhash = nameParts.some(
            (part) => part.startsWith('[') && part.endsWith(']'),
          )

          return {
            ...domain,
            parent2LD,
            level,
            hasLabelhash,
          }
        },
      )

      // Organize domains by their properties
      const organizedDomains = domainsArray.sort((a, b) => {
        // First, separate domains with labelhash (they go at the end)
        if (a.hasLabelhash && !b.hasLabelhash) return 1
        if (!a.hasLabelhash && b.hasLabelhash) return -1

        // Then sort by parent 2LD
        if (a.parent2LD !== b.parent2LD) {
          return a.parent2LD.localeCompare(b.parent2LD)
        }

        // For domains with the same parent 2LD, sort by level (3LD, 4LD, etc.)
        if (a.level !== b.level) {
          return a.level - b.level
        }

        // Finally, sort alphabetically for domains with the same level
        return a.name.localeCompare(b.name)
      })

      setUserOwnedDomains(organizedDomains)
      console.log('Fetched and organized user owned domains:', organizedDomains)
    } catch (error) {
      console.error("Error fetching user's owned ENS domains:", error)
    }
  }, [address, config])

  // Initialize custom provider when chainId changes
  useEffect(() => {
    if (effectiveChainId && config?.RPC_ENDPOINT) {
      try {
        // Initialize ethers provider
        const provider = new ethers.JsonRpcProvider(config.RPC_ENDPOINT)
        setCustomProvider(provider)
        console.log(
          `[ENSDetails] Initialized custom provider for chain ${effectiveChainId}`,
        )
      } catch (err) {
        console.error('[ENSDetails] Error initializing provider:', err)
        setError('Failed to initialize provider for the selected chain')
      }
    }
  }, [effectiveChainId, config])

  // Function to get contract verification status
  const getContractStatus = async (
    chainId: number | undefined,
    address: string,
  ) => {
    const defaultStatus = {
      sourcify_verification: 'unverified',
      etherscan_verification: 'unverified',
      audit_status: 'unaudited',
      attestation_tx_hash: '0xabc123',
      blockscout_verification: 'unverified',
      ens_name: '',
    }

    try {
      if (!chainId) return defaultStatus

      console.log(
        `[ENSDetails] Fetching verification status for ${address} on chain ${chainId}`,
      )
      const res = await fetch(
        `/api/v1/verification/${chainId}/${address.toLowerCase()}`,
      )
      if (!res.ok) return defaultStatus

      const data = await res.json()
      console.log(`[ENSDetails] Verification status:`, data)

      if (data) return data
      return defaultStatus
    } catch (error) {
      console.error('[ENSDetails] Error fetching verification status:', error)
      return defaultStatus
    }
  }

  const fetchAttestationData = useCallback(async () => {
    const response = await fetch(OLI_GQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        operationName: 'Attestations',
        variables: {
          where: {
            schemaId: {
              equals:
                '0xb763e62d940bed6f527dd82418e146a904e62a297b8fa765c9b3e1f0bc6fdd68',
            },
            recipient: {
              equals: address,
            },
          },
          take: 50,
          orderBy: [
            {
              timeCreated: 'desc',
            },
          ],
        },
        query: `query Attestations($where: AttestationWhereInput, $take: Int, $orderBy: [AttestationOrderByWithRelationInput!]) {\n  attestations(where: $where, take: $take, orderBy: $orderBy) {\n    attester\n    decodedDataJson\n    timeCreated\n    txid\n    revoked\n    revocationTime\n    isOffchain\n    __typename\n  }\n}`,
      }),
    })

    try {
      const attestations = await response.json()
      setHasAttestations(attestations.data.attestations.length === 0)
    } catch (err) {
      setHasAttestations(false)
    }
  }, [address])

  // Function to fetch primary ENS name for an address
  const fetchPrimaryName = useCallback(async () => {
    if (!address || !customProvider) return

    try {
      console.log(`[ENSDetails] Fetching primary ENS name for ${address}`)
      const primaryENS = await getENS(address, customProvider)

      if (primaryENS) {
        setPrimaryName(primaryENS)
        console.log(`[ENSDetails] Primary ENS name found: ${primaryENS}`)

        // Fetch expiry date for the primary name's 2LD
        await fetchPrimaryNameExpiryDate(primaryENS)
      } else {
        console.log(`[ENSDetails] No primary ENS name found for ${address}`)
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching primary ENS name:', error)
      setPrimaryName(null)
    }
  }, [address, customProvider])

  // Function to fetch expiry date for a primary name's 2LD
  const fetchPrimaryNameExpiryDate = async (primaryENS: string) => {
    if (!config?.SUBGRAPH_API) return

    try {
      // Extract domain parts from the primary name
      const nameParts = primaryENS.split('.')
      if (nameParts.length < 2) return

      // For other networks or 2LD names, query the 2LD
      const tld = nameParts[nameParts.length - 1]
      const sld = nameParts[nameParts.length - 2]
      const domainToQuery = `${sld}.${tld}`
      console.log(
        `[ENSDetails] Fetching expiry date for 2LD: ${domainToQuery}`,
      )

      // Query the subgraph for the domain with its registration data
      const domainResponse = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
        },
        body: JSON.stringify({
          query: `
                            query GetDomainWithRegistration($name: String!) {
                                domains(where: { name: $name }) {
                                    name
                                    registration {
                                        expiryDate
                                        registrationDate
                                    }
                                }
                            }
                        `,
          variables: {
            name: domainToQuery,
          },
        }),
      })

      const domainData = await domainResponse.json()
      console.log(`[ENSDetails] Domain data for ${domainToQuery}:`, domainData)

      const expiryDate =
        domainData?.data?.domains?.[0]?.registration?.expiryDate

      if (expiryDate) {
        setPrimaryNameExpiryDate(Number(expiryDate))
        console.log(
          `[ENSDetails] Expiry date for ${domainToQuery}: ${new Date(Number(expiryDate) * 1000).toLocaleDateString()}`,
        )
      } else {
        console.log(`[ENSDetails] No expiry date found for ${domainToQuery}`)
        setPrimaryNameExpiryDate(null)
      }
    } catch (error) {
      console.error(
        '[ENSDetails] Error fetching primary name expiry date:',
        error,
      )
      setPrimaryNameExpiryDate(null)
    }
  }

  // Function to fetch all ENS names resolving to this address
  const fetchAssociatedNames = useCallback(async () => {
    if (!address || !config?.SUBGRAPH_API) return

    try {
      console.log(`[ENSDetails] Fetching associated ENS names for ${address}`)

      // Fetch domains with their registration data in a single query
      const domainsResponse = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
        },
        body: JSON.stringify({
          query: `
                            query GetENSNamesWithExpiry($address: String!) {
                                domains(where: { resolvedAddress: $address }) { 
                                    name
                                    registration {
                                        expiryDate
                                        registrationDate
                                    }
                                }
                            }
                        `,
          variables: {
            address: address.toLowerCase(),
          },
        }),
      })

      const domainsData = await domainsResponse.json()
      console.log('[ENSDetails] Associated domains data:', domainsData)

      if (domainsData.data && domainsData.data.domains) {
        // Filter domains based on chain
        let filteredDomains = domainsData.data.domains

        // Apply chain-specific filtering
        if (effectiveChainId === CHAINS.BASE) {
          // For Base chain, only keep .base.eth names
          console.log(
            '[ENSDetails] Filtering for Base chain - only keeping .base.eth names',
          )
          filteredDomains = filteredDomains.filter((domain: { name: string }) =>
            domain.name.endsWith('.base.eth'),
          )
        } else if (effectiveChainId === CHAINS.BASE_SEPOLIA) {
          // For Base Sepolia, don't show any names
          console.log(
            '[ENSDetails] Base Sepolia detected - not showing any ENS names',
          )
          filteredDomains = []
        }

        // Create domains array with expiry dates already included
        const filterDomains = async () => {
          // const client = new EnsRainbowApiClient();
          return await Promise.all(
            filteredDomains.map(
              async (domain: {
                name: string
                registration: { expiryDate: string } | null
              }) => {
                // if (domain.name.startsWith('[')) {
                //   const match = domain.name.match(/\[([^\]]+)\]/);
                //   if (match) {
                //     const response = await client.heal(`0x${match[1]}`)
                //     if (response.status == "success") {
                //       console.log(`domain name: ${domain.name}, healed: ${response.label}`)
                //       domain.name = response.label!
                //     }
                //   }
                // }

                return {
                  name: domain.name,
                  isPrimary: domain.name === primaryName,
                  expiryDate: domain.registration?.expiryDate
                    ? Number(domain.registration.expiryDate)
                    : undefined,
                }
              },
            ),
          )
        }

        const domains = await filterDomains()

        // Sort domains: primary first, then by name length
        const sortedDomains = domains.sort(
          (
            a: { isPrimary: any; name: string | any[] },
            b: { isPrimary: any; name: string | any[] },
          ) => {
            if (a.isPrimary) return -1
            if (b.isPrimary) return 1
            return a.name.length - b.name.length
          },
        )

        // Set domains with expiry dates already included
        setEnsNames(sortedDomains)
        console.log(
          '[ENSDetails] Set associated ENS names with expiry dates:',
          sortedDomains,
        )

        // Also set forward resolution names for contracts without primary names
        if (isContract && !primaryName && sortedDomains.length > 0) {
          // Sort domains: deployer's names first, then by expiry date (newest first)
          const forwardSortedDomains = sortedDomains.sort((a: any, b: any) => {
            // First priority: names owned by the contract deployer
            const aIsDeployer =
              a.owner?.id?.toLowerCase() ===
              contractDeployerAddress?.toLowerCase()
            const bIsDeployer =
              b.owner?.id?.toLowerCase() ===
              contractDeployerAddress?.toLowerCase()

            if (aIsDeployer && !bIsDeployer) return -1
            if (!aIsDeployer && bIsDeployer) return 1

            // Second priority: by expiry date (newest first)
            const aExpiry = a.expiryDate || 0
            const bExpiry = b.expiryDate || 0
            return bExpiry - aExpiry
          })

          const names = forwardSortedDomains.map((domain: any) => domain.name)

          // Select the first name (either deployer's or highest priority)
          setSelectedForwardName(names[0])

          console.log(`[ENSDetails] Set forward resolution names:`, names)
          console.log(`[ENSDetails] Selected forward name: ${names[0]}`)
        }
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching associated ENS names:', error)
    }
  }, [address, config, effectiveChainId, primaryName])

  // Function to fetch verification status for a contract
  const fetchVerificationStatus = useCallback(async () => {
    if (!address || !effectiveChainId || !isContract) return

    try {
      console.log(
        `[ENSDetails] Fetching verification status for contract ${address}`,
      )
      const status = await getContractStatus(effectiveChainId, address)
      setVerificationStatus(status)
      console.log('[ENSDetails] Verification status:', status)
    } catch (error) {
      console.error('[ENSDetails] Error fetching verification status:', error)
      setVerificationStatus(null)
    }
  }, [address, effectiveChainId, isContract])

  // Main useEffect to trigger data fetching when dependencies change
  useEffect(() => {
    // Always clear error on dependency change
    setError(null)

    // Only fetch when a provider is available
    if (!address) return
    if (!config) {
      setError('Chain ID is not supported.')
      setIsLoading(false)
      return
    }
    if (!customProvider) {
      console.log('[ENSDetails] Waiting for provider to be ready')
      return
    }

    const fetchAllData = async () => {
      setIsLoading(true)
      setError(null)
      setContractDeployerPrimaryName(contractDeployerName)

      try {
        // Fetch data in parallel
        await Promise.all([
          fetchPrimaryName(),
          fetchAssociatedNames(),
          isContract ? fetchVerificationStatus() : Promise.resolve(),
          fetchUserOwnedDomains(),
          fetchAttestationData(),
        ])
      } catch (err) {
        console.error('[ENSDetails] Error fetching data:', err)
        setError('Failed to fetch data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllData()
  }, [
    address,
    customProvider,
    config,
    effectiveChainId,
    isContract,
    fetchPrimaryName,
    fetchAssociatedNames,
    fetchVerificationStatus,
    fetchUserOwnedDomains,
  ])

  const getENS = async (
    addr: string,
    provider: ethers.JsonRpcProvider,
  ): Promise<string> => {
    // Use the effectiveChainId instead of chain?.id to ensure we're using the correct chain
    // for ENS lookups even when the wallet is not connected
    if (
      effectiveChainId === CHAINS.MAINNET ||
      effectiveChainId === CHAINS.SEPOLIA
    ) {
      try {
        console.log(
          `[ENSDetails] Looking up ENS name for ${addr} on chain ${effectiveChainId}`,
        )
        return (await provider.lookupAddress(addr)) || ''
      } catch (error) {
        console.error('[ENSDetails] Error looking up ENS name:', error)
        return ''
      }
    } else if (
      [
        CHAINS.OPTIMISM,
        CHAINS.OPTIMISM_SEPOLIA,
        CHAINS.ARBITRUM,
        CHAINS.ARBITRUM_SEPOLIA,
        CHAINS.SCROLL,
        CHAINS.SCROLL_SEPOLIA,
        CHAINS.BASE,
        CHAINS.BASE_SEPOLIA,
        CHAINS.LINEA,
        CHAINS.LINEA_SEPOLIA,
      ].includes((effectiveChainId ?? -1) as CHAINS)
    ) {
      try {
        console.log(
          `[ENSDetails] Looking up ENS name via nameForAddr for ${addr} on chain ${effectiveChainId}`,
        )

        if (!config?.L2_REVERSE_REGISTRAR) {
          console.error(
            `[ENSDetails] Missing L2 reverse registrar for chain ${effectiveChainId}`,
          )
          return ''
        }

        const nameForAddrABI = [
          {
            inputs: [
              { internalType: 'address', name: 'addr', type: 'address' },
            ],
            name: 'nameForAddr',
            outputs: [{ internalType: 'string', name: 'name', type: 'string' }],
            stateMutability: 'view',
            type: 'function',
          },
        ]

        const rr = new ethers.Contract(
          config.L2_REVERSE_REGISTRAR,
          nameForAddrABI,
          provider,
        )
        const name = (await rr.nameForAddr(addr)) as string
        console.log(`[ENSDetails] nameForAddr result for ${addr}: ${name}`)
        if (name && name.length > 0) return name
      } catch (err) {
        console.error('[ENSDetails] nameForAddr failed:', err)
      }
    }

    // Default fallback
    return ''
  }

  // Function to fetch text records from API
  const fetchTextRecordsFromAPI = useCallback(
    async (ensName: string) => {
      if (!ensName || !isContract || !effectiveChainId) return

      try {
        const response = await fetch(
          `/api/v1/contractMetadata/${effectiveChainId}/${encodeURIComponent(ensName)}`
        )
        
        if (!response.ok) {
          console.error('[ENSDetails] API error:', response.status)
          setTextRecords({})
          return
        }

        const records: TextRecords = await response.json()
        setTextRecords(records)
      } catch (error) {
        console.error('[ENSDetails] Error fetching text records from API:', error)
        setTextRecords({})
      }
    },
    [effectiveChainId, isContract]
  )

  // Fetch text records based on queried name or primary name
  useEffect(() => {
    // Determine which ENS name to use for text records
    let ensNameToFetch: string | null = null
    
    if (queriedENSName) {
      // If user queried by ENS name, use that name immediately
      ensNameToFetch = queriedENSName
    } else {
      // If user queried by address, use primary name or forward name
      ensNameToFetch = primaryName || selectedForwardName
    }
    
    // Fetch from API if we have an ENS name and it's a contract
    if (ensNameToFetch && isContract) {
      fetchTextRecordsFromAPI(ensNameToFetch)
    } else {
      setTextRecords({})
    }
  }, [queriedENSName, primaryName, selectedForwardName, isContract, fetchTextRecordsFromAPI])

  if (isLoading) {
    return (
      <Card className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl">
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
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
          {/* Show queried ENS name if available, otherwise show primary name */}
          {(queriedENSName || primaryName) && (
            <div className="space-y-6">
              {/* Full width profile card */}
              {!isContract && (
                <div className="w-full scale-100 transform origin-top">
                  <FullWidthProfile addressOrName={queriedENSName || primaryName || ''} />
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
                        (!queriedENSName || queriedENSName.toLowerCase() === primaryName.toLowerCase()) &&
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
                                  Trusted - Named, Verified and Audited Contract
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                    </TooltipProvider>
                    <span className="text-xl text-gray-900 dark:text-white flex items-center gap-1.5 font-bold">
                      {queriedENSName || primaryName}
                      {/* Show primary name badge if displaying the primary name (either queried or resolved) */}
                      {primaryName && (!queriedENSName || queriedENSName.toLowerCase() === primaryName.toLowerCase()) && (
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
                        copyToClipboard(queriedENSName || primaryName || '', 'primary-name')
                      }
                    >
                      {copied['primary-name'] ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {/* Expiry badge always at end of row - show if displaying primary name */}
                  {primaryNameExpiryDate && primaryName && (!queriedENSName || queriedENSName.toLowerCase() === primaryName.toLowerCase()) &&
                    (() => {
                      const nameParts = primaryName.split('.')
                      const tld = nameParts[nameParts.length - 1]
                      const sld = nameParts[nameParts.length - 2]

                      const domainToShow = `${sld}.${tld}`
                      const now = new Date()
                      const expiryDate = new Date(primaryNameExpiryDate * 1000)
                      const threeMonthsFromNow = new Date()
                      threeMonthsFromNow.setMonth(now.getMonth() + 3)

                      const isExpired = expiryDate < now
                      const isWithinThreeMonths =
                        !isExpired && expiryDate < threeMonthsFromNow
                      const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
                      const isInGracePeriod =
                        isExpired &&
                        now.getTime() - expiryDate.getTime() < ninetyDaysInMs

                      let statusIcon
                      let statusText
                      let bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                      let textColorClass = 'text-green-600 dark:text-green-400'

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
                        textColorClass = 'text-yellow-600 dark:text-yellow-400'
                      } else {
                        statusIcon = (
                          <CheckCircle
                            className="inline-block mr-1 text-green-600 dark:text-green-400"
                            size={16}
                          />
                        )
                        statusText = `valid until ${expiryDate.toLocaleDateString()}`
                        bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                        textColorClass = 'text-green-600 dark:text-green-400'
                      }

                      const showDomainSeparately = domainToShow !== primaryName

                      return (
                        <div className="flex items-center">
                          {showDomainSeparately && (
                            <span className="text-gray-800 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm mr-2">
                              {domainToShow}
                            </span>
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

                {/* ENS Name + copy + link below */}
                {/* Removed separate row to align with expiry badge */}
              </div>
            </div>
          )}

          {/* Forward Resolution Name Display (when no primary name but has queried name or forward name) */}
          {!primaryName && isContract && (queriedENSName || selectedForwardName) && (
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-lg text-gray-900 dark:text-white font-bold flex items-center gap-2">
                        {queriedENSName || selectedForwardName}
                        {!queriedENSName && <TriangleAlert className="h-5 w-5 text-yellow-500" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>
                        {queriedENSName 
                          ? 'Viewing metadata for this ENS name'
                          : 'Warning, name only forward resolves to this address, no reverse record is set'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-0"
                  onClick={() =>
                    copyToClipboard(queriedENSName || selectedForwardName || '', 'forward-name')
                  }
                >
                  {copied['forward-name'] ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Text Records Display for Contracts */}
          {isContract && (queriedENSName || primaryName || selectedForwardName) && Object.keys(textRecords).length > 0 && (
            <div className="mt-6 space-y-6">
              {/* Name/Alias, Description, URL with Avatar */}
              {(textRecords.name || textRecords.alias || textRecords.description || textRecords.url) && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex gap-6">
                    {/* Avatar Section (Left) */}
                    {textRecords.avatar && (
                      <div className="flex-shrink-0">
                        <img
                          src={textRecords.avatar}
                          alt="Avatar"
                          className="w-24 h-24 rounded-lg object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Text Content (Right) */}
                    <div className="flex-1 space-y-3">
                      {/* Display Name/Alias */}
                      {(textRecords.name || textRecords.alias) && (
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {textRecords.name || textRecords.alias}
                        </h3>
                      )}

                      {/* Description */}
                      {textRecords.description && (
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                          {textRecords.description}
                        </p>
                      )}

                      {/* URL */}
                      {textRecords.url && (
                        <a
                          href={textRecords.url.startsWith('http') ? textRecords.url : `https://${textRecords.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {textRecords.url}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Details and Security Audits Grid */}
              {(textRecords.category || textRecords.license || textRecords.docs || textRecords.audits) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Technical Details (Left) */}
                  {(textRecords.category || textRecords.license || textRecords.docs) && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        Technical Details
                      </h4>
                      <div className="space-y-4">
                        {textRecords.category && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              Category
                            </p>
                            <span className="inline-block px-3 py-1 text-sm rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              {textRecords.category}
                            </span>
                          </div>
                        )}

                        {textRecords.license && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                              License
                            </p>
                            <span className="inline-block px-3 py-1 text-sm rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                              {textRecords.license}
                            </span>
                          </div>
                        )}

                        {textRecords.docs && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                              Docs
                            </p>
                            <a
                              href={textRecords.docs.startsWith('http') ? textRecords.docs : `https://${textRecords.docs}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              {textRecords.docs}
                              <ExternalLink className="ml-1 h-3 w-3 flex-shrink-0" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Security Audits (Right) */}
                  {textRecords.audits && (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                        Security Audits
                      </h4>
                      <div className="space-y-3">
                        {(() => {
                          try {
                            // Try to parse as JSON array
                            const audits = JSON.parse(textRecords.audits)
                            if (Array.isArray(audits)) {
                              return audits.map((audit: any, index: number) => {
                                // Handle string URLs
                                if (typeof audit === 'string') {
                                  return (
                                    <div key={index} className="flex items-start gap-2">
                                      <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                      <a
                                        href={audit.startsWith('http') ? audit : `https://${audit}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                      >
                                        {audit.split('/').pop() || `Audit ${index + 1}`}
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  )
                                }
                                
                                // Handle object with auditor property
                                if (audit.auditor) {
                                  return (
                                    <div key={index} className="flex items-start gap-2">
                                      <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                          {audit.auditor}
                                        </p>
                                        {audit.url && (
                                          <a
                                            href={audit.url.startsWith('http') ? audit.url : `https://${audit.url}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                          >
                                            View Report
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )
                                }
                                
                                // Handle object with key-value pairs (e.g., {"Cantina": "url"})
                                const entries = Object.entries(audit)
                                return entries.map(([auditorName, url]: [string, any], entryIndex) => (
                                  <div key={`${index}-${entryIndex}`} className="flex items-start gap-2">
                                    <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {auditorName}
                                      </p>
                                      <a
                                        href={typeof url === 'string' && url.startsWith('http') ? url : `https://${url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                      >
                                        View Report
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </div>
                                  </div>
                                ))
                              }).flat()
                            }
                          } catch (e) {
                            // Not JSON, treat as comma-separated or single URL
                            const auditUrls = textRecords.audits.split(',').map(url => url.trim())
                            return auditUrls.map((url, index) => (
                              <div key={index} className="flex items-start gap-2">
                                <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <a
                                  href={url.startsWith('http') ? url : `https://${url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                >
                                  {url.split('/').pop() || `Audit ${index + 1}`}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ))
                          }
                          return null
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
                {isContract && !primaryName ? (
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

            {isContract && contractDeployerAddress && (
              <div>
                <div className="flex items-center mt-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Contract Deployer
                  </h3>
                </div>
                <div className="flex items-center mt-1">
                  <Link
                    href={`${window.location.protocol}//${window.location.host}/explore/${chainId}/${contractDeployerAddress}`}
                    className={
                      'text-blue-600 underline font-mono text-sm break-all'
                    }
                  >
                    {contractDeployerPrimaryName !== null &&
                      contractDeployerPrimaryName}
                    {contractDeployerPrimaryName === null &&
                      contractDeployerAddress}
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2"
                    onClick={() =>
                      copyToClipboard(
                        contractDeployerAddress,
                        'contractDeployerAddress',
                      )
                    }
                  >
                    {copied['contractDeployerAddress'] ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

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
                      {implementationExpanded ? 'Hide Details' : 'Show Details'}
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
                    <Button variant="ghost" size="sm" className="ml-1" asChild>
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
                        contractDeployerAddress={null}
                        contractDeployerName={null}
                        chainId={effectiveChainId}
                        isContract={true}
                        isNestedView={true}
                      />
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Contract Verification Status */}
          {isContract && verificationStatus && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Contract Verification
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {(verificationStatus.sourcify_verification === 'exact_match' ||
                  verificationStatus.sourcify_verification === 'match') && (
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border border-green-800 text-green-800 hover:bg-emerald-100 dark:border-green-400 dark:text-green-400 dark:bg-black dark:hover:bg-green-900/20 text-xs px-2 py-1 h-auto flex items-center gap-1"
                    >
                      <Link
                        href={`${SOURCIFY_URL}${effectiveChainId}/${address.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        <img
                          src="/sourcify.svg"
                          alt="Sourcify"
                          className="w-4 h-4"
                        />
                        Verified
                      </Link>
                    </Button>
                  </div>
                )}
                {verificationStatus.etherscan_verification === 'verified' && (
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border border-green-800 text-green-800 hover:bg-emerald-100 dark:border-green-400 dark:text-green-400 dark:bg-black dark:hover:bg-green-900/20 text-xs px-2 py-1 h-auto flex items-center gap-1"
                    >
                      <Link
                        href={`${etherscanUrl}address/${address}#code`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="/etherscan.svg"
                          alt="Etherscan"
                          className="w-4 h-4"
                        />
                        Verified
                      </Link>
                    </Button>
                  </div>
                )}
                {(verificationStatus.blockscout_verification ===
                  'exact_match' ||
                  verificationStatus.blockscout_verification === 'match') && (
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="border border-green-800 text-green-800 hover:bg-emerald-100 dark:border-green-400 dark:text-green-400 dark:bg-black dark:hover:bg-green-900/20 text-xs px-2 py-1 h-auto flex items-center gap-1"
                    >
                      <Link
                        href={`${config?.BLOCKSCOUT_URL}address/${address.toLowerCase()}?tab=contract`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        <img
                          src="/blockscout.svg"
                          alt="Blockscout"
                          className="w-4 h-4"
                        />
                        Verified
                      </Link>
                    </Button>
                  </div>
                )}
                {verificationStatus.sourcify_verification === 'unverified' && (
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 dark:bg-black text-xs px-2 py-1 h-auto flex items-center gap-1"
                    >
                      <Link
                        href={`https://sourcify.dev/#/verifier`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="/sourcify.svg"
                          alt="Sourcify"
                          className="w-4 h-4"
                        />
                        Verify
                      </Link>
                    </Button>
                  </div>
                )}
                {verificationStatus.etherscan_verification === 'unverified' && (
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 dark:bg-black text-xs px-2 py-1 h-auto flex items-center gap-1"
                    >
                      <Link
                        href={`${etherscanUrl}address/${address}#code`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src="/etherscan.svg"
                          alt="Etherscan"
                          className="w-4 h-4"
                        />
                        Verify
                      </Link>
                    </Button>
                  </div>
                )}
                {verificationStatus.blockscout_verification ===
                  'unverified' && (
                  <div className="flex items-center gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-gray-300 dark:bg-black text-xs px-2 py-1 h-auto flex items-center gap-1"
                    >
                      <Link
                        href={`${config?.BLOCKSCOUT_URL}address/${address.toLowerCase()}?tab=contract`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer"
                      >
                        <img
                          src="/blockscout.svg"
                          alt="Blockscout"
                          className="w-4 h-4"
                        />
                        Verify
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contract Security Audits */}
          {isContract &&
            verificationStatus &&
            (verificationStatus.diligence_audit ||
              verificationStatus.openZepplin_audit ||
              verificationStatus.cyfrin_audit) && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Contract Security Audits
                </h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {verificationStatus.diligence_audit && (
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                      >
                        <Link
                          href={verificationStatus.diligence_audit}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <img
                            src="/consensys.svg"
                            alt="ConsenSys Diligence"
                            className="w-4 h-4"
                          />
                          ConsenSys Diligence
                        </Link>
                      </Button>
                    </div>
                  )}
                  {verificationStatus.openZepplin_audit && (
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                      >
                        <Link
                          href={verificationStatus.openZepplin_audit}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <img
                            src="/oz.svg"
                            alt="OpenZeppelin"
                            className="w-4 h-4"
                          />
                          OpenZeppelin
                        </Link>
                      </Button>
                    </div>
                  )}
                  {verificationStatus.cyfrin_audit && (
                    <div className="flex items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                      >
                        <Link
                          href={verificationStatus.cyfrin_audit}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cursor-pointer"
                        >
                          <img
                            src="/cyfrin.svg"
                            alt="Cyfrin"
                            className="w-4 h-4"
                          />
                          Cyfrin
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

          {isContract && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Contract Attestations
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {hasAttestations ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                          asChild
                        >
                          <Link
                            href={`${OLI_ATTESTATION_URL}?contract=${address}&chainId=${chainId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            <img
                              src="/oli_logo.jpg"
                              alt="oli"
                              className="w-4 h-4"
                            />
                            Label on OLI
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center">
                        <p>Create label on Open Labels Initiative</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border border-blue-800 text-black hover:bg-blue-100 dark:border-gray-600 dark:text-white dark:bg-black dark:hover:bg-gray-800 text-xs px-2 py-1 h-auto flex items-center gap-1"
                          asChild
                        >
                          <Link
                            href={`${OLI_SEARCH_URL}?address=${address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cursor-pointer"
                          >
                            <img
                              src="/oli_logo.jpg"
                              alt="oli"
                              className="w-4 h-4"
                            />
                            Labelled on OLI
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center">
                        <p>View label on Open Labels Initiative</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          )}

          <div>
            {ensNames.length > 0 ? (
              <>
                <button
                  onClick={() =>
                    setAssociatedNamesExpanded(!associatedNamesExpanded)
                  }
                  className="flex items-center justify-between w-full p-3 mb-2 text-left bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Associated ENS Names ({ensNames.length})
                  </h3>
                  {associatedNamesExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
                {associatedNamesExpanded && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-4">
                    <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      <div className="space-y-2">
                        {ensNames.map((domain, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 rounded ${
                              domain.isPrimary
                                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-sm text-gray-900 dark:text-gray-100 truncate px-2">
                                {domain.name}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 flex-shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(
                                    domain.name,
                                    `associated-${index}`,
                                  )
                                }}
                              >
                                {copied[`associated-${index}`] ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>

                            <div className="flex items-center gap-2">
                              {domain.expiryDate && (
                                <span className="text-xs whitespace-nowrap">
                                  {(() => {
                                    const now = new Date()
                                    const expiryDate = new Date(
                                      domain.expiryDate * 1000,
                                    )
                                    const threeMonthsFromNow = new Date()
                                    threeMonthsFromNow.setMonth(
                                      now.getMonth() + 3,
                                    )

                                    const isExpired = expiryDate < now
                                    const isWithinThreeMonths =
                                      !isExpired &&
                                      expiryDate < threeMonthsFromNow
                                    const ninetyDaysInMs =
                                      90 * 24 * 60 * 60 * 1000
                                    const isInGracePeriod =
                                      isExpired &&
                                      now.getTime() - expiryDate.getTime() <
                                        ninetyDaysInMs

                                    let textColorClass =
                                      'text-green-600 dark:text-green-400'
                                    if (isWithinThreeMonths) {
                                      textColorClass =
                                        'text-yellow-600 dark:text-yellow-400'
                                    } else if (isExpired && isInGracePeriod) {
                                      textColorClass =
                                        'text-red-600 dark:text-red-400'
                                    } else if (isExpired) {
                                      textColorClass =
                                        'text-red-600 dark:text-red-400'
                                    }

                                    return (
                                      <span className={textColorClass}>
                                        {isExpired ? 'Expired' : 'Expires'}:{' '}
                                        {expiryDate.toLocaleDateString()}
                                      </span>
                                    )
                                  })()}
                                </span>
                              )}
                              {domain.isPrimary && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                  Primary
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-1 h-6 w-6 p-0 flex-shrink-0"
                                asChild
                              >
                                <a
                                  href={`${config?.ENS_APP_URL || 'https://app.ens.domains'}/${domain.name}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Associated ENS Names (0)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  No Associated ENS names found for this address
                </p>
              </div>
            )}
          </div>

          {/* Owned ENS Names */}
          <div>
            {userOwnedDomains.length > 0 ? (
              <>
                <button
                  onClick={() => setOwnedNamesExpanded(!ownedNamesExpanded)}
                  className="flex items-center justify-between w-full p-3 mb-2 text-left bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Owned ENS Names ({userOwnedDomains.length})
                  </h3>
                  {ownedNamesExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  )}
                </button>
                {ownedNamesExpanded && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden mb-4">
                    <div className="max-h-60 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
                      <div className="space-y-2">
                        {(() => {
                          let currentParent2LD = ''
                          return userOwnedDomains.map((domain, index) => {
                            // Check if we're starting a new 2LD group
                            const isNewGroup =
                              domain.parent2LD !== currentParent2LD
                            if (isNewGroup && domain.parent2LD) {
                              currentParent2LD = domain.parent2LD
                            }

                            // Calculate indentation for subdomains
                            const indentLevel =
                              domain.level && domain.level > 2
                                ? domain.level - 2
                                : 0
                            const indentClass =
                              indentLevel > 0 ? `pl-${indentLevel * 4}` : ''

                            return (
                              <div
                                key={domain.name}
                                className={`flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded ${indentClass}`}
                              >
                                <div className="flex items-center gap-1">
                                  <span
                                    className="font-mono text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 truncate px-2 underline cursor-pointer"
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      try {
                                        if (customProvider) {
                                          const resolvedAddress =
                                            await customProvider.resolveName(
                                              domain.name,
                                            )
                                          if (resolvedAddress) {
                                            window.location.href = `/explore/${effectiveChainId}/${resolvedAddress}`
                                          } else {
                                            // Show toast message that name doesn't resolve
                                            toast({
                                              title: "Name doesn't resolve",
                                              description: `${domain.name} doesn't resolve to any address`,
                                              variant: 'destructive',
                                            })
                                          }
                                        }
                                      } catch (error) {
                                        console.error(
                                          'Error resolving name:',
                                          error,
                                        )
                                      }
                                    }}
                                  >
                                    {domain.name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      copyToClipboard(
                                        domain.name,
                                        `owned-${index}`,
                                      )
                                    }}
                                  >
                                    {copied[`owned-${index}`] ? (
                                      <Check className="h-3 w-3 text-green-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>

                                <div className="flex items-center gap-2">
                                  {domain.expiryDate && (
                                    <span className="text-xs whitespace-nowrap">
                                      {(() => {
                                        const now = new Date()
                                        const expiryDate = new Date(
                                          domain.expiryDate * 1000,
                                        )
                                        const threeMonthsFromNow = new Date()
                                        threeMonthsFromNow.setMonth(
                                          now.getMonth() + 3,
                                        )

                                        const isExpired = expiryDate < now
                                        const isWithinThreeMonths =
                                          !isExpired &&
                                          expiryDate < threeMonthsFromNow
                                        const ninetyDaysInMs =
                                          90 * 24 * 60 * 60 * 1000
                                        const isInGracePeriod =
                                          isExpired &&
                                          now.getTime() - expiryDate.getTime() <
                                            ninetyDaysInMs

                                        let textColorClass =
                                          'text-green-600 dark:text-green-400'
                                        if (isWithinThreeMonths) {
                                          textColorClass =
                                            'text-yellow-600 dark:text-yellow-400'
                                        } else if (
                                          isExpired &&
                                          isInGracePeriod
                                        ) {
                                          textColorClass =
                                            'text-red-600 dark:text-red-400'
                                        } else if (isExpired) {
                                          textColorClass =
                                            'text-red-600 dark:text-red-400'
                                        }

                                        return (
                                          <span className={textColorClass}>
                                            {isExpired ? 'Expired' : 'Expires'}:{' '}
                                            {expiryDate.toLocaleDateString()}
                                          </span>
                                        )
                                      })()}
                                    </span>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-2 h-6 w-6 p-0 flex-shrink-0"
                                    asChild
                                  >
                                    <a
                                      href={`${config?.ENS_APP_URL || 'https://app.ens.domains'}/${domain.name}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            )
                          })
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Owned ENS Names (0)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">
                  No Owned ENS names found for this address
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
