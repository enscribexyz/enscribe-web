import React, { useCallback, useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { readContract } from 'viem/actions'
import { useAccount } from 'wagmi'
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
  ETHERSCAN_API,
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
import { getENS } from '@/utils/ens'
import { useToast } from '@/hooks/use-toast'
import type { ENSDomain, TextRecords, VerificationStatus } from '@/types'
// import { EnsRainbowApiClient } from '@ensnode/ensrainbow-sdk'
import { TextRecordsIdentityCard } from '@/components/ens/TextRecordsIdentityCard'
import { TechnicalDetailsAndAuditsPanel } from '@/components/ens/TechnicalDetailsAndAuditsPanel'
import { CompiledMetadataPanel } from '@/components/ens/CompiledMetadataPanel'
import { VerificationBadges } from '@/components/ens/VerificationBadges'
import { SecurityAuditBadges } from '@/components/ens/SecurityAuditBadges'
import { AttestationsPanel } from '@/components/ens/AttestationsPanel'
import { AssociatedENSNamesList } from '@/components/ens/AssociatedENSNamesList'
import { OwnedENSNamesList } from '@/components/ens/OwnedENSNamesList'

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
  const [isMetadataLoading, setIsMetadataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ensNames, setEnsNames] = useState<ENSDomain[]>([])
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [contractDeployerPrimaryName, setContractDeployerPrimaryName] =
    useState<string | null>(null)
  const [primaryNameExpiryDate, setPrimaryNameExpiryDate] = useState<
    number | null
  >(null)
  const [forwardNameExpiryDate, setForwardNameExpiryDate] = useState<
    number | null
  >(null)
  const [selectedForwardName, setSelectedForwardName] = useState<string | null>(
    null,
  )
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(null)
  const [hasAttestations, setHasAttestations] = useState<boolean>(false)
  const [userOwnedDomains, setUserOwnedDomains] = useState<ENSDomain[]>([])
  const [sourcifyMetadata, setSourceifyMetadata] = useState<any>(null)
  const [ensNameOwner, setEnsNameOwner] = useState<string | null>(null)
  const [ensNameManager, setEnsNameManager] = useState<string | null>(null)
  const [ensNameManagerLoading, setEnsNameManagerLoading] = useState(false)
  const [tldOwner, setTldOwner] = useState<string | null>(null)
  const [tldManager, setTldManager] = useState<string | null>(null)
  const [otherDetailsExpanded, setOtherDetailsExpanded] = useState(false)
  const [ensNameOwnerResolved, setEnsNameOwnerResolved] = useState<
    string | null
  >(null)
  const [ensNameManagerResolved, setEnsNameManagerResolved] = useState<
    string | null
  >(null)
  const [tldOwnerResolved, setTldOwnerResolved] = useState<string | null>(null)
  const [tldManagerResolved, setTldManagerResolved] = useState<string | null>(
    null,
  )
  const [deployerResolved, setDeployerResolved] = useState<string | null>(null)
  const [implDeployerAddress, setImplDeployerAddress] = useState<string | null>(
    null,
  )
  const [implDeployerName, setImplDeployerName] = useState<string | null>(null)
  const { chain, isConnected } = useAccount()
  const [customProvider, setCustomProvider] =
    useState<ReturnType<typeof createPublicClient> | null>(null)
  const { toast } = useToast()

  // Use provided chainId if available, otherwise use connected wallet's chain
  const effectiveChainId = chainId || chain?.id
  const config = effectiveChainId ? CONTRACTS[effectiveChainId] : undefined
  const etherscanUrl = config?.ETHERSCAN_URL || 'https://etherscan.io/'
  const SOURCIFY_URL = 'https://repo.sourcify.dev/'

  // Determine if we should use the wallet client or a custom provider
  const shouldUseWalletClient = isConnected && chainId === chain?.id


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
    } catch (error) {
      console.error("Error fetching user's owned ENS domains:", error)
    }
  }, [address, config])

  // Initialize custom provider when chainId changes
  useEffect(() => {
    if (effectiveChainId && config?.RPC_ENDPOINT) {
      try {
        const provider = createPublicClient({ transport: http(config.RPC_ENDPOINT) })
        setCustomProvider(provider)
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

      const res = await fetch(
        `/api/v1/verification/${chainId}/${address.toLowerCase()}`,
      )
      if (!res.ok) return defaultStatus

      const data = await res.json()

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

      // Always do reverse lookup to get the ACTUAL primary name
      // Don't skip this even if queriedENSName exists - we need to check if they match

      // Check if address is a valid Ethereum address format (0x...)
      // If it contains '.' it's likely an ENS name, not an address
      if (address.includes('.')) {
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
        return
      }

      // Validate it's a proper address format before reverse lookup
      if (!address.startsWith('0x') || address.length !== 42) {
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
        return
      }

      // Do reverse lookup (address → ENS name) to get the ACTUAL primary name
      const primaryENS = await getENS(address, effectiveChainId!)

      if (primaryENS) {
        setPrimaryName(primaryENS)

        // Check if queriedENSName matches the actual primary name
        if (queriedENSName) {
          const isActualPrimary =
            queriedENSName.toLowerCase() === primaryENS.toLowerCase()
        }

        // Fetch expiry date for the primary name's 2LD
        await fetchPrimaryNameExpiryDate(primaryENS)
      } else {
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching primary ENS name:', error)
      setPrimaryName(null)
    }
  }, [address, customProvider, queriedENSName])

  // Function to fetch expiry date for any ENS name's 2LD
  const fetchNameExpiryDate = async (
    ensName: string,
    setExpiryState: (date: number | null) => void,
  ) => {
    if (!config?.SUBGRAPH_API) return

    try {
      // Extract domain parts from the ENS name
      const nameParts = ensName.split('.')
      if (nameParts.length < 2) return

      // For other networks or 2LD names, query the 2LD
      const tld = nameParts[nameParts.length - 1]
      const sld = nameParts[nameParts.length - 2]
      const domainToQuery = `${sld}.${tld}`

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

      const expiryDate =
        domainData?.data?.domains?.[0]?.registration?.expiryDate

      if (expiryDate) {
        setExpiryState(Number(expiryDate))
      } else {
        setExpiryState(null)
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching name expiry date:', error)
      setExpiryState(null)
    }
  }

  // Wrapper for primary name expiry
  const fetchPrimaryNameExpiryDate = useCallback(async (primaryENS: string) => {
    await fetchNameExpiryDate(primaryENS, setPrimaryNameExpiryDate)
  }, [])

  // Wrapper for forward name expiry
  const fetchForwardNameExpiryDate = useCallback(async (forwardENS: string) => {
    await fetchNameExpiryDate(forwardENS, setForwardNameExpiryDate)
  }, [])

  // Function to fetch owner and manager from ENS subgraph with fallback to ENS Registry
  const fetchOwnerAndManager = useCallback(
    async (ensName: string) => {
      if (!config?.SUBGRAPH_API) {
        return { owner: null, manager: null }
      }

      try {

        const query = `
        {
          domains(where: {name: "${ensName}"}) {
            name
            owner {
              id
            }
            registrant {
              id
            }
            wrappedOwner {
              id
            }
          }
        }
      `

        const response = await fetch(config.SUBGRAPH_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
          },
          body: JSON.stringify({ query }),
        })

        const data = await response.json()

        if (data.data?.domains && data.data.domains.length > 0) {
          const domain = data.data.domains[0]

          // Manager is the 'owner' field in subgraph (confusing naming)
          let manager = domain.owner?.id || null

          // Owner is wrappedOwner if set (wrapped name), else registrant
          const owner = domain.wrappedOwner?.id || domain.registrant?.id || null

          // Fallback: If manager is not available, check ENS Registry contract directly
          if (!manager && config.ENS_REGISTRY && customProvider) {
            try {
              const { namehash: computeNamehash } = await import('viem/ens')
              const nameNode = computeNamehash(ensName)
              manager = await readContract(customProvider, {
                address: config.ENS_REGISTRY as `0x${string}`,
                abi: ensRegistryABI,
                functionName: 'owner',
                args: [nameNode],
              }) as string
            } catch (registryError) {
              console.error(
                `[ENSDetails] Error fetching from ENS Registry:`,
                registryError,
              )
            }
          }

          return { owner, manager }
        }

        // No domain found in subgraph, try fallback to ENS Registry
        let manager = null
        if (config.ENS_REGISTRY && customProvider) {
          try {
            const { namehash: computeNamehash } = await import('viem/ens')
            const nameNode = computeNamehash(ensName)
            manager = await readContract(customProvider, {
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'owner',
              args: [nameNode],
            }) as string
          } catch (registryError) {
            console.error(
              `[ENSDetails] Error fetching from ENS Registry:`,
              registryError,
            )
          }
        }
        return { owner: null, manager }
      } catch (error) {
        console.error(
          `[ENSDetails] Error fetching owner/manager for ${ensName}:`,
          error,
        )
        return { owner: null, manager: null }
      }
    },
    [config, customProvider],
  )

  // Function to fetch all ENS names resolving to this address
  const fetchAssociatedNames = useCallback(async () => {
    if (!address || !config?.SUBGRAPH_API) return

    try {

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

      if (domainsData.data && domainsData.data.domains) {
        // Filter domains based on chain
        let filteredDomains = domainsData.data.domains

        // Apply chain-specific filtering
        if (effectiveChainId === CHAINS.BASE) {
          // For Base chain, only keep .base.eth names
          filteredDomains = filteredDomains.filter((domain: { name: string }) =>
            domain.name.endsWith('.base.eth'),
          )
        } else if (effectiveChainId === CHAINS.BASE_SEPOLIA) {
          // For Base Sepolia, don't show any names
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
      const status = await getContractStatus(effectiveChainId, address)
      setVerificationStatus(status)
    } catch (error) {
      console.error('[ENSDetails] Error fetching verification status:', error)
      setVerificationStatus(null)
    }
  }, [address, effectiveChainId, isContract])

  // Function to fetch Sourcify metadata for verified contracts
  const fetchSourceifyMetadata = useCallback(async () => {
    if (!address || !effectiveChainId || !isContract) return

    try {
      const response = await fetch(
        `https://sourcify.dev/server/v2/contract/${effectiveChainId}/${address}?fields=abi,metadata`,
      )

      if (response.ok) {
        const data = await response.json()
        setSourceifyMetadata(data)
      } else {
        setSourceifyMetadata(null)
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching Sourcify metadata:', error)
      setSourceifyMetadata(null)
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
          isContract ? fetchSourceifyMetadata() : Promise.resolve(),
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
    queriedENSName,
    fetchPrimaryName,
    fetchAssociatedNames,
    fetchVerificationStatus,
    fetchSourceifyMetadata,
    fetchUserOwnedDomains,
  ])

  // Function to fetch text records from API
  const fetchTextRecordsFromAPI = useCallback(
    async (ensName: string) => {
      if (!ensName || !isContract || !effectiveChainId) return

      setIsMetadataLoading(true)

      try {
        const response = await fetch(
          `/api/v1/contractMetadata/${effectiveChainId}/${encodeURIComponent(ensName)}`,
        )

        if (!response.ok) {
          console.error('[ENSDetails] API error:', response.status)
          setTextRecords({})
          return
        }

        const records: TextRecords = await response.json()
        setTextRecords(records)
      } catch (error) {
        console.error(
          '[ENSDetails] Error fetching text records from API:',
          error,
        )
        setTextRecords({})
      } finally {
        setIsMetadataLoading(false)
      }
    },
    [effectiveChainId, isContract],
  )

  // Fetch text records based on queried name or primary name
  useEffect(() => {
    // Determine which ENS name to use for text records
    let ensNameToFetch: string | null = null

    if (queriedENSName) {
      // If user queried by ENS name, use that name immediately (priority)
      ensNameToFetch = queriedENSName

      // Fetch expiry for queried name if it's not the primary name
      if (
        !primaryName ||
        queriedENSName.toLowerCase() !== primaryName.toLowerCase()
      ) {
        fetchForwardNameExpiryDate(queriedENSName)
      }
    } else {
      // If user queried by address, use primary name or forward name
      ensNameToFetch = primaryName || selectedForwardName

      // Fetch expiry for selected forward name if it exists and is not the primary name
      if (
        selectedForwardName &&
        (!primaryName ||
          selectedForwardName.toLowerCase() !== primaryName.toLowerCase())
      ) {
        fetchForwardNameExpiryDate(selectedForwardName)
      }
    }

    // Fetch from API if we have an ENS name and it's a contract
    if (ensNameToFetch && isContract) {
      fetchTextRecordsFromAPI(ensNameToFetch)
    } else {
      setTextRecords({})
      setIsMetadataLoading(false) // No metadata to load for non-contracts
    }
  }, [
    queriedENSName,
    primaryName,
    selectedForwardName,
    isContract,
    fetchTextRecordsFromAPI,
  ])

  // Fetch owner and manager for current ENS name and 2LD
  useEffect(() => {
    const fetchOwnerManagerData = async () => {
      const currentName = queriedENSName || primaryName || selectedForwardName


      // Resolve contract deployer to ENS name (even if no ENS name for contract)
      if (contractDeployerAddress && isContract && customProvider) {
        try {
          const deployerENS = await getENS(
            contractDeployerAddress,
            effectiveChainId!,
          )
          setDeployerResolved(deployerENS || null)
        } catch (err) {
          setDeployerResolved(null)
        }
      }

      if (!currentName || !isContract || !customProvider) {
        return
      }


      // Fetch owner/manager for current ENS name
      setEnsNameManagerLoading(true)
      const { owner, manager } = await fetchOwnerAndManager(currentName)
      setEnsNameOwner(owner)
      setEnsNameManager(manager)
      setEnsNameManagerLoading(false)

      // Resolve owner to ENS name
      if (owner) {
        try {
          const ownerENS = await getENS(owner, effectiveChainId!)
          setEnsNameOwnerResolved(ownerENS || null)
        } catch (err) {
          setEnsNameOwnerResolved(null)
        }
      }

      // Resolve manager to ENS name
      if (manager) {
        try {
          const managerENS = await getENS(manager, effectiveChainId!)
          setEnsNameManagerResolved(managerENS || null)
        } catch (err) {
          setEnsNameManagerResolved(null)
        }
      }

      // Extract and fetch owner/manager for 2LD
      const parts = currentName.split('.')
      if (parts.length >= 2) {
        const tld = parts[parts.length - 1]
        const sld = parts[parts.length - 2]
        const tldName = `${sld}.${tld}`

        const { owner: tldOwnerData, manager: tldManagerData } =
          await fetchOwnerAndManager(tldName)
        setTldOwner(tldOwnerData)
        setTldManager(tldManagerData)

        // Resolve 2LD owner to ENS name
        if (tldOwnerData) {
          try {
            const tldOwnerENS = await getENS(tldOwnerData, effectiveChainId!)
            setTldOwnerResolved(tldOwnerENS || null)
          } catch (err) {
            setTldOwnerResolved(null)
          }
        }

        // Resolve 2LD manager to ENS name
        if (tldManagerData) {
          try {
            const tldManagerENS = await getENS(tldManagerData, effectiveChainId!)
            setTldManagerResolved(tldManagerENS || null)
          } catch (err) {
            setTldManagerResolved(null)
          }
        }
      }
    }

    fetchOwnerManagerData()
  }, [
    queriedENSName,
    primaryName,
    selectedForwardName,
    isContract,
    fetchOwnerAndManager,
    customProvider,
    contractDeployerAddress,
  ])

  // Fetch deployer for implementation contract
  useEffect(() => {
    const fetchImplDeployer = async () => {
      if (!proxyInfo?.implementationAddress || !effectiveChainId) {
        return
      }

      try {

        const url = `${ETHERSCAN_API}&chainid=${effectiveChainId}&module=contract&action=getcontractcreation&contractaddresses=${proxyInfo.implementationAddress}`
        const response = await fetch(url)
        const data = await response.json()

        if (data.status === '1' && data.result && data.result.length > 0) {
          const creatorAddress = data.result[0]?.contractCreator
          setImplDeployerAddress(creatorAddress || null)

          // Fetch primary name for the deployer
          if (creatorAddress && customProvider) {
            try {
              const deployerENS = await getENS(creatorAddress, effectiveChainId!)
              setImplDeployerName(deployerENS || null)
            } catch (err) {
              setImplDeployerName(null)
            }
          }
        }
      } catch (error) {
        console.error(
          '[ENSDetails] Error fetching implementation deployer:',
          error,
        )
      }
    }

    fetchImplDeployer()
  }, [proxyInfo?.implementationAddress, effectiveChainId, customProvider])

  // Show loading until ENS data is loaded AND (for contracts) metadata is loaded
  const shouldShowLoading = isLoading || (isContract && isMetadataLoading)

  if (shouldShowLoading) {
    return (
      <Card className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-5/6" />
            <div className="pt-4">
              <Skeleton className="h-32 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
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
          {/* Show primary name only (with blue tick) */}
          {primaryName &&
            (!queriedENSName ||
              queriedENSName.toLowerCase() === primaryName.toLowerCase()) && (
              <div className="space-y-6">
                {/* Full width profile card */}
                {!isContract && (
                  <div className="w-full scale-100 transform origin-top">
                    <FullWidthProfile addressOrName={primaryName} />
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
                                    Trusted - Named, Verified and Audited
                                    Contract
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                      </TooltipProvider>
                      <span className="text-xl text-gray-900 dark:text-white flex items-center gap-1.5 font-bold">
                        {primaryName}
                        {/* Always show primary name badge in this section */}
                        {primaryName && (
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
                          copyToClipboard(primaryName || '', 'primary-name')
                        }
                      >
                        {copied['primary-name'] ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Get All Metadata Button */}
                      {isContract && primaryName && (
                        <Link
                          href={`/nameMetadata?name=${encodeURIComponent(primaryName)}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          >
                            View Metadata
                          </Button>
                        </Link>
                      )}
                      {/* Expiry badge */}
                      {primaryNameExpiryDate &&
                        primaryName &&
                        (() => {
                          const nameParts = primaryName.split('.')
                          const tld = nameParts[nameParts.length - 1]
                          const sld = nameParts[nameParts.length - 2]

                          const domainToShow = `${sld}.${tld}`
                          const now = new Date()
                          const expiryDate = new Date(
                            primaryNameExpiryDate * 1000,
                          )
                          const threeMonthsFromNow = new Date()
                          threeMonthsFromNow.setMonth(now.getMonth() + 3)

                          const isExpired = expiryDate < now
                          const isWithinThreeMonths =
                            !isExpired && expiryDate < threeMonthsFromNow
                          const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
                          const isInGracePeriod =
                            isExpired &&
                            now.getTime() - expiryDate.getTime() <
                              ninetyDaysInMs

                          let statusIcon
                          let statusText
                          let bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                          let textColorClass =
                            'text-green-600 dark:text-green-400'

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
                            textColorClass =
                              'text-yellow-600 dark:text-yellow-400'
                          } else {
                            statusIcon = (
                              <CheckCircle
                                className="inline-block mr-1 text-green-600 dark:text-green-400"
                                size={16}
                              />
                            )
                            statusText = `valid until ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                            textColorClass =
                              'text-green-600 dark:text-green-400'
                          }

                          const showDomainSeparately =
                            domainToShow !== primaryName

                          return (
                            <div className="flex items-center">
                              {showDomainSeparately && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-gray-800 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm mr-2 cursor-pointer">
                                        {domainToShow}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-lg"
                                    >
                                      <div className="space-y-3 text-xs">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                          Organization Details
                                        </p>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Owner:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldOwnerResolved || tldOwner}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldOwnerResolved ||
                                                tldOwner ||
                                                'Loading...'}
                                            </Link>
                                            {tldOwner && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldOwner,
                                                    'tldOwner',
                                                  )
                                                }}
                                              >
                                                {copied['tldOwner'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Manager:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldManagerResolved || tldManager}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldManagerResolved ||
                                                tldManager ||
                                                'Loading...'}
                                            </Link>
                                            {tldManager && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldManager,
                                                    'tldManager',
                                                  )
                                                }}
                                              >
                                                {copied['tldManager'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                  </div>

                  {/* ENS Name + copy + link below */}
                  {/* Removed separate row to align with expiry badge */}
                </div>
              </div>
            )}

          {/* Forward Resolution Name Display (show queried name if not primary, or selected forward name) */}
          {isContract &&
            ((queriedENSName &&
              (!primaryName ||
                queriedENSName.toLowerCase() !== primaryName.toLowerCase())) ||
              (selectedForwardName &&
                (!primaryName ||
                  selectedForwardName.toLowerCase() !==
                    primaryName?.toLowerCase()))) && (
              <div className="space-y-6">
                {/* Details section - SAME structure as primary name */}
                <div className="space-y-2">
                  {/* Heading + Expiry badge in a single row */}
                  <div className="flex flex-wrap justify-between items-center gap-1">
                    <div className="flex items-center gap-1.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-xl text-gray-900 dark:text-white flex items-center gap-1.5 font-bold">
                              {queriedENSName || selectedForwardName}
                              <TriangleAlert className="h-5 w-5 text-yellow-500" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            <p>
                              {queriedENSName
                                ? 'This ENS name resolves to this address but is not set as the primary name'
                                : 'Warning: name only forward resolves to this address, no reverse record is set'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-0"
                        onClick={() =>
                          copyToClipboard(
                            queriedENSName || selectedForwardName || '',
                            'forward-name',
                          )
                        }
                      >
                        {copied['forward-name'] ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Get All Metadata Button */}
                      {(queriedENSName || selectedForwardName) && (
                        <Link
                          href={`/nameMetadata?name=${encodeURIComponent(queriedENSName || selectedForwardName || '')}`}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20"
                          >
                            View Metadata
                          </Button>
                        </Link>
                      )}
                      {/* Expiry badge */}
                      {forwardNameExpiryDate &&
                        (queriedENSName || selectedForwardName) &&
                        (() => {
                          const forwardName =
                            queriedENSName || selectedForwardName || ''
                          const nameParts = forwardName.split('.')
                          const tld = nameParts[nameParts.length - 1]
                          const sld = nameParts[nameParts.length - 2]

                          const domainToShow = `${sld}.${tld}`
                          const now = new Date()
                          const expiryDate = new Date(
                            forwardNameExpiryDate * 1000,
                          )
                          const threeMonthsFromNow = new Date()
                          threeMonthsFromNow.setMonth(now.getMonth() + 3)

                          const isExpired = expiryDate < now
                          const isWithinThreeMonths =
                            !isExpired && expiryDate < threeMonthsFromNow
                          const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000
                          const isInGracePeriod =
                            isExpired &&
                            now.getTime() - expiryDate.getTime() <
                              ninetyDaysInMs

                          let statusIcon
                          let statusText
                          let bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                          let textColorClass =
                            'text-green-600 dark:text-green-400'

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
                            textColorClass =
                              'text-yellow-600 dark:text-yellow-400'
                          } else {
                            statusIcon = (
                              <CheckCircle
                                className="inline-block mr-1 text-green-600 dark:text-green-400"
                                size={16}
                              />
                            )
                            statusText = `valid until ${expiryDate.toLocaleDateString()}`
                            bgColorClass = 'bg-green-50 dark:bg-green-900/20'
                            textColorClass =
                              'text-green-600 dark:text-green-400'
                          }

                          const showDomainSeparately =
                            domainToShow !== forwardName

                          return (
                            <div className="flex items-center">
                              {showDomainSeparately && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-gray-800 dark:text-gray-400 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-sm mr-2 cursor-pointer">
                                        {domainToShow}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-lg"
                                    >
                                      <div className="space-y-3 text-xs">
                                        <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                          Organization Details
                                        </p>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Owner:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldOwnerResolved || tldOwner}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldOwnerResolved ||
                                                tldOwner ||
                                                'Loading...'}
                                            </Link>
                                            {tldOwner && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldOwner,
                                                    'tldOwner',
                                                  )
                                                }}
                                              >
                                                {copied['tldOwner'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <span className="text-gray-500 dark:text-gray-400 block mb-1">
                                            Manager:
                                          </span>
                                          <div className="flex items-center gap-2">
                                            <Link
                                              href={`/explore/${effectiveChainId}/${tldManagerResolved || tldManager}`}
                                              className="font-mono text-blue-600 dark:text-blue-400 hover:underline break-all"
                                            >
                                              {tldManagerResolved ||
                                                tldManager ||
                                                'Loading...'}
                                            </Link>
                                            {tldManager && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(
                                                    tldManager,
                                                    'tldManager',
                                                  )
                                                }}
                                              >
                                                {copied['tldManager'] ? (
                                                  <Check className="h-3 w-3 text-green-500" />
                                                ) : (
                                                  <Copy className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                                                )}
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
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
                  </div>
                </div>
              </div>
            )}

          {/* Contract Address Section - Moved here after ENS name */}
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
                {isContract &&
                !primaryName &&
                !queriedENSName &&
                !selectedForwardName ? (
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
          </div>

          {/* Text Records Display for Contracts */}
          {isContract &&
            (queriedENSName || primaryName || selectedForwardName) &&
            Object.keys(textRecords).length > 0 && (
              <div className="mt-6 space-y-6">
                {/* Name/Alias, Description, URL with Avatar and Header */}
                <TextRecordsIdentityCard textRecords={textRecords} />

                {/* Technical Details and Security Audits Grid */}
                <TechnicalDetailsAndAuditsPanel textRecords={textRecords} />
              </div>
            )}

          {/* Compiled Metadata - Independent Section (Shows for Sourcify-verified contracts) */}
          {isContract && sourcifyMetadata && (
            <CompiledMetadataPanel sourcifyMetadata={sourcifyMetadata} />
          )}

                    {/* Management details - Shows for all contracts */}
          {isContract && (
            <div className="mt-6">
              {/* <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Management details
              </h3> */}
              <div
                className={`grid grid-cols-1 ${queriedENSName || primaryName || selectedForwardName ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-4`}
              >
                {/* Card 1: Contract Deployer (always shown) */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                    Contract Deployer
                  </h4>
                  {contractDeployerAddress ? (
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/explore/${effectiveChainId}/${deployerResolved || contractDeployerPrimaryName || contractDeployerAddress}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs break-all"
                      >
                        {deployerResolved ||
                          contractDeployerPrimaryName ||
                          contractDeployerAddress}
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(
                            contractDeployerAddress,
                            'contractDeployerAddress',
                          )
                        }}
                      >
                        {copied['contractDeployerAddress'] ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      N/A
                    </p>
                  )}
                </div>

                {/* Card 2: Manager (only show if ENS name exists) */}
                {(queriedENSName || primaryName || selectedForwardName) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      Manager
                    </h4>
                    {ensNameManagerLoading ? (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Loading...
                      </p>
                    ) : ensNameManager ? (
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/explore/${effectiveChainId}/${ensNameManagerResolved || ensNameManager}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs break-all"
                        >
                          {ensNameManagerResolved || ensNameManager}
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            copyToClipboard(ensNameManager, 'ensNameManager')
                          }}
                        >
                          {copied['ensNameManager'] ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        Not available
                      </p>
                    )}
                  </div>
                )}

                {/* Card 3: Parent (only show if ENS name exists) */}
                {(queriedENSName || primaryName || selectedForwardName) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      Parent
                    </h4>
                    {(() => {
                      const currentName =
                        queriedENSName ||
                        primaryName ||
                        selectedForwardName ||
                        ''
                      const parts = currentName.split('.')
                      if (parts.length > 2) {
                        const parentName = parts.slice(1).join('.')
                        return (
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/nameMetadata?name=${encodeURIComponent(parentName)}`}
                              className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs break-all"
                            >
                              {parentName}
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="ml-auto flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(parentName, 'parentName')
                              }}
                            >
                              {copied['parentName'] ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        )
                      }
                      return (
                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                          No parent (top-level domain)
                        </span>
                      )
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Other Details - Card-based Expandable Section */}
          <div className="mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              {/* Card Header - Clickable */}
              <div
                className="flex items-center justify-between cursor-pointer p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg"
                onClick={() => setOtherDetailsExpanded(!otherDetailsExpanded)}
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Other Details
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {otherDetailsExpanded
                      ? 'Click to collapse'
                      : 'Click to expand'}
                  </span>
                  {otherDetailsExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Card Content - Expandable */}
              {otherDetailsExpanded && (
                <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-6 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
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
                            {implementationExpanded
                              ? 'Hide Details'
                              : 'Show Details'}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-1"
                            asChild
                          >
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
                              contractDeployerAddress={implDeployerAddress}
                              contractDeployerName={implDeployerName}
                              chainId={effectiveChainId}
                              isContract={true}
                              isNestedView={true}
                            />
                          </div>
                        )}
                      </div>
                    )}

                  {/* Contract Verification Status */}
                  {isContract && verificationStatus && (
                    <VerificationBadges
                      verificationStatus={verificationStatus}
                      address={address}
                      etherscanUrl={etherscanUrl}
                      chainId={effectiveChainId!}
                      config={config}
                    />
                  )}

                  {/* Contract Security Audits */}
                  {isContract && verificationStatus && (
                    <SecurityAuditBadges verificationStatus={verificationStatus} />
                  )}

                  {isContract && (
                    <AttestationsPanel
                      hasAttestations={hasAttestations}
                      address={address}
                      chainId={effectiveChainId}
                    />
                  )}

                  <AssociatedENSNamesList
                    ensNames={ensNames}
                    config={config}
                  />

                  {/* Owned ENS Names */}
                  <OwnedENSNamesList
                    userOwnedDomains={userOwnedDomains}
                    config={config}
                    onNavigateToDomain={async (domainName) => {
                      try {
                        if (customProvider) {
                          const { getEnsAddress: resolveEnsName } = await import('viem/actions')
                          const resolvedAddress = await resolveEnsName(customProvider, { name: domainName })
                          if (resolvedAddress) {
                            window.location.href = `/explore/${effectiveChainId}/${resolvedAddress}`
                          } else {
                            toast({
                              title: "Name doesn't resolve",
                              description: `${domainName} doesn't resolve to any address`,
                              variant: 'destructive',
                            })
                          }
                        }
                      } catch (error) {
                        console.error('Error resolving name:', error)
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
