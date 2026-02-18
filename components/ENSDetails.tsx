import React, { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
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
    useState<ethers.JsonRpcProvider | null>(null)
  const { toast } = useToast()

  // Use provided chainId if available, otherwise use connected wallet's chain
  const effectiveChainId = chainId || chain?.id
  const config = effectiveChainId ? CONTRACTS[effectiveChainId] : undefined
  const etherscanUrl = config?.ETHERSCAN_URL || 'https://etherscan.io/'
  const SOURCIFY_URL = 'https://repo.sourcify.dev/'

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

      // Always do reverse lookup to get the ACTUAL primary name
      // Don't skip this even if queriedENSName exists - we need to check if they match

      // Check if address is a valid Ethereum address format (0x...)
      // If it contains '.' it's likely an ENS name, not an address
      if (address.includes('.')) {
        console.log(
          `[ENSDetails] Address looks like ENS name, skipping reverse lookup: ${address}`,
        )
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
        return
      }

      // Validate it's a proper address format before reverse lookup
      if (!address.startsWith('0x') || address.length !== 42) {
        console.log(
          `[ENSDetails] Invalid address format, skipping reverse lookup: ${address}`,
        )
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
        return
      }

      // Do reverse lookup (address → ENS name) to get the ACTUAL primary name
      const primaryENS = await getENS(address, effectiveChainId!)

      if (primaryENS) {
        setPrimaryName(primaryENS)
        console.log(`[ENSDetails] Primary ENS name found: ${primaryENS}`)

        // Check if queriedENSName matches the actual primary name
        if (queriedENSName) {
          const isActualPrimary =
            queriedENSName.toLowerCase() === primaryENS.toLowerCase()
          console.log(
            `[ENSDetails] Queried name "${queriedENSName}" is ${isActualPrimary ? 'THE' : 'NOT THE'} primary name`,
          )
        }

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
      console.log(`[ENSDetails] Fetching expiry date for 2LD: ${domainToQuery}`)

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
        setExpiryState(Number(expiryDate))
        console.log(
          `[ENSDetails] Expiry date for ${domainToQuery}: ${new Date(Number(expiryDate) * 1000).toLocaleDateString()}`,
        )
      } else {
        console.log(`[ENSDetails] No expiry date found for ${domainToQuery}`)
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
        console.log(`[ENSDetails] No subgraph API configured`)
        return { owner: null, manager: null }
      }

      try {
        console.log(`[ENSDetails] Fetching owner/manager for: ${ensName}`)

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
        console.log(`[ENSDetails] Subgraph response for ${ensName}:`, data)

        if (data.data?.domains && data.data.domains.length > 0) {
          const domain = data.data.domains[0]
          console.log(`[ENSDetails] Domain data:`, domain)

          // Manager is the 'owner' field in subgraph (confusing naming)
          let manager = domain.owner?.id || null

          // Owner is wrappedOwner if set (wrapped name), else registrant
          const owner = domain.wrappedOwner?.id || domain.registrant?.id || null

          // Fallback: If manager is not available, check ENS Registry contract directly
          if (!manager && config.ENS_REGISTRY && customProvider) {
            try {
              console.log(
                `[ENSDetails] Manager not found in subgraph, checking ENS Registry for ${ensName}`,
              )
              const nameNode = ethers.namehash(ensName)
              const registryContract = new ethers.Contract(
                config.ENS_REGISTRY,
                ensRegistryABI,
                customProvider,
              )
              manager = await registryContract.owner(nameNode)
              console.log(
                `[ENSDetails] Fallback manager from ENS Registry: ${manager}`,
              )
            } catch (registryError) {
              console.error(
                `[ENSDetails] Error fetching from ENS Registry:`,
                registryError,
              )
            }
          }

          console.log(
            `[ENSDetails] Resolved for ${ensName} - Owner: ${owner}, Manager: ${manager}`,
          )
          return { owner, manager }
        }

        // No domain found in subgraph, try fallback to ENS Registry
        console.log(
          `[ENSDetails] No domain found in subgraph for ${ensName}, trying ENS Registry fallback`,
        )
        let manager = null
        if (config.ENS_REGISTRY && customProvider) {
          try {
            const nameNode = ethers.namehash(ensName)
            const registryContract = new ethers.Contract(
              config.ENS_REGISTRY,
              ensRegistryABI,
              customProvider,
            )
            manager = await registryContract.owner(nameNode)
            console.log(
              `[ENSDetails] Fallback manager from ENS Registry: ${manager}`,
            )
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

  // Function to fetch Sourcify metadata for verified contracts
  const fetchSourceifyMetadata = useCallback(async () => {
    if (!address || !effectiveChainId || !isContract) return

    try {
      console.log(
        `[ENSDetails] Fetching Sourcify metadata for contract ${address}`,
      )
      const response = await fetch(
        `https://sourcify.dev/server/v2/contract/${effectiveChainId}/${address}?fields=abi,metadata`,
      )

      if (response.ok) {
        const data = await response.json()
        setSourceifyMetadata(data)
        console.log('[ENSDetails] Sourcify metadata found:', data)
      } else {
        console.log('[ENSDetails] No Sourcify metadata found')
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

      console.log(
        `[ENSDetails] useEffect - currentName: ${currentName}, isContract: ${isContract}`,
      )

      // Resolve contract deployer to ENS name (even if no ENS name for contract)
      if (contractDeployerAddress && isContract && customProvider) {
        try {
          const deployerENS = await getENS(
            contractDeployerAddress,
            effectiveChainId!,
          )
          setDeployerResolved(deployerENS || null)
        } catch (err) {
          console.log(`[ENSDetails] Could not resolve deployer ENS name`)
          setDeployerResolved(null)
        }
      }

      if (!currentName || !isContract || !customProvider) {
        console.log(
          `[ENSDetails] Skipping owner/manager fetch - no name, not contract, or no provider`,
        )
        return
      }

      console.log(
        `[ENSDetails] Fetching owner/manager data for: ${currentName}`,
      )

      // Fetch owner/manager for current ENS name
      setEnsNameManagerLoading(true)
      const { owner, manager } = await fetchOwnerAndManager(currentName)
      console.log(
        `[ENSDetails] Setting name owner/manager - Owner: ${owner}, Manager: ${manager}`,
      )
      setEnsNameOwner(owner)
      setEnsNameManager(manager)
      setEnsNameManagerLoading(false)

      // Resolve owner to ENS name
      if (owner) {
        try {
          const ownerENS = await getENS(owner, effectiveChainId!)
          setEnsNameOwnerResolved(ownerENS || null)
        } catch (err) {
          console.log(`[ENSDetails] Could not resolve owner ENS name`)
          setEnsNameOwnerResolved(null)
        }
      }

      // Resolve manager to ENS name
      if (manager) {
        try {
          const managerENS = await getENS(manager, effectiveChainId!)
          setEnsNameManagerResolved(managerENS || null)
        } catch (err) {
          console.log(`[ENSDetails] Could not resolve manager ENS name`)
          setEnsNameManagerResolved(null)
        }
      }

      // Extract and fetch owner/manager for 2LD
      const parts = currentName.split('.')
      if (parts.length >= 2) {
        const tld = parts[parts.length - 1]
        const sld = parts[parts.length - 2]
        const tldName = `${sld}.${tld}`

        console.log(`[ENSDetails] Fetching 2LD owner/manager for: ${tldName}`)
        const { owner: tldOwnerData, manager: tldManagerData } =
          await fetchOwnerAndManager(tldName)
        console.log(
          `[ENSDetails] Setting 2LD owner/manager - Owner: ${tldOwnerData}, Manager: ${tldManagerData}`,
        )
        setTldOwner(tldOwnerData)
        setTldManager(tldManagerData)

        // Resolve 2LD owner to ENS name
        if (tldOwnerData) {
          try {
            const tldOwnerENS = await getENS(tldOwnerData, effectiveChainId!)
            setTldOwnerResolved(tldOwnerENS || null)
          } catch (err) {
            console.log(`[ENSDetails] Could not resolve 2LD owner ENS name`)
            setTldOwnerResolved(null)
          }
        }

        // Resolve 2LD manager to ENS name
        if (tldManagerData) {
          try {
            const tldManagerENS = await getENS(tldManagerData, effectiveChainId!)
            setTldManagerResolved(tldManagerENS || null)
          } catch (err) {
            console.log(`[ENSDetails] Could not resolve 2LD manager ENS name`)
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
        console.log(
          `[ENSDetails] Fetching deployer for implementation contract: ${proxyInfo.implementationAddress}`,
        )

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
              console.log(
                `[ENSDetails] Could not resolve implementation deployer ENS name`,
              )
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
                {(textRecords.name ||
                  textRecords.alias ||
                  textRecords.description ||
                  textRecords.url ||
                  textRecords.avatar ||
                  textRecords.header) && (
                  <div className="relative bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Header Background Image */}
                    {textRecords.header && (
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-40"
                        style={{
                          backgroundImage: `url(${textRecords.header})`,
                        }}
                      />
                    )}

                    {/* Content */}
                    <div className="relative z-10 flex gap-6">
                      {/* Avatar Section (Left) - Circular */}
                      {textRecords.avatar && (
                        <div className="flex-shrink-0">
                          <img
                            src={textRecords.avatar}
                            alt="Avatar"
                            className="w-24 h-24 rounded-full object-cover"
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
                          <p className="text-black dark:text-white text-sm leading-relaxed font-bold">
                            {textRecords.description}
                          </p>
                        )}

                        {/* URL */}
                        {textRecords.url && (
                          <a
                            href={
                              textRecords.url.startsWith('http')
                                ? textRecords.url
                                : `https://${textRecords.url}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-800 dark:text-blue-200 hover:underline font-bold"
                          >
                            {textRecords.url}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </a>
                        )}

                        {/* Social Links */}
                        {(textRecords['com.github'] ||
                          textRecords['com.twitter'] ||
                          textRecords['org.telegram'] ||
                          textRecords['com.linkedin']) && (
                          <div className="flex items-center gap-3 pt-2">
                            {textRecords['com.github'] && (
                              <a
                                href={
                                  textRecords['com.github'].startsWith('http')
                                    ? textRecords['com.github']
                                    : `https://github.com/${textRecords['com.github']}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="GitHub"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                              </a>
                            )}
                            {textRecords['com.twitter'] && (
                              <a
                                href={
                                  textRecords['com.twitter'].startsWith('http')
                                    ? textRecords['com.twitter']
                                    : `https://twitter.com/${textRecords['com.twitter']}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="Twitter/X"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                              </a>
                            )}
                            {textRecords['org.telegram'] && (
                              <a
                                href={
                                  textRecords['org.telegram'].startsWith('http')
                                    ? textRecords['org.telegram']
                                    : `https://t.me/${textRecords['org.telegram']}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="Telegram"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                                </svg>
                              </a>
                            )}
                            {textRecords['com.linkedin'] && (
                              <a
                                href={
                                  textRecords['com.linkedin'].startsWith('http')
                                    ? textRecords['com.linkedin']
                                    : `https://linkedin.com/in/${textRecords['com.linkedin']}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                                title="LinkedIn"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Technical Details and Security Audits Grid */}
                {(textRecords.category ||
                  textRecords.license ||
                  textRecords.docs ||
                  textRecords.audits) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    {/* Technical Details (Left) */}
                    {(textRecords.category ||
                      textRecords.license ||
                      textRecords.docs) && (
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                          Technical Details
                        </h4>
                        <div className="space-y-3">
                          {textRecords.category && (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                Category
                              </span>
                              <span className="inline-block px-3 py-1 text-sm rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                                {textRecords.category}
                              </span>
                            </div>
                          )}

                          {textRecords.license && (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                License
                              </span>
                              <span className="inline-block px-3 py-1 text-sm rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                {textRecords.license}
                              </span>
                            </div>
                          )}

                          {textRecords.docs && (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">
                                Docs
                              </span>
                              <a
                                href={
                                  textRecords.docs.startsWith('http')
                                    ? textRecords.docs
                                    : `https://${textRecords.docs}`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline break-all text-right"
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
                                return audits
                                  .map((audit: any, index: number) => {
                                    // Handle string URLs
                                    if (typeof audit === 'string') {
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-start gap-2"
                                        >
                                          <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                          <a
                                            href={
                                              audit.startsWith('http')
                                                ? audit
                                                : `https://${audit}`
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                          >
                                            {audit.split('/').pop() ||
                                              `Audit ${index + 1}`}
                                            <ExternalLink className="h-3 w-3" />
                                          </a>
                                        </div>
                                      )
                                    }

                                    // Handle object with auditor property
                                    if (audit.auditor) {
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center gap-3"
                                        >
                                          <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
                                          <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {audit.auditor}
                                            </span>
                                            {audit.url && (
                                              <>
                                                <span className="mx-2 text-gray-400">
                                                  •
                                                </span>
                                                <a
                                                  href={
                                                    audit.url.startsWith('http')
                                                      ? audit.url
                                                      : `https://${audit.url}`
                                                  }
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                                >
                                                  View Report
                                                  <ExternalLink className="h-3 w-3" />
                                                </a>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    }

                                    // Handle object with key-value pairs (e.g., {"Cantina": "url"})
                                    const entries = Object.entries(audit)
                                    return entries.map(
                                      (
                                        [auditorName, url]: [string, any],
                                        entryIndex,
                                      ) => (
                                        <div
                                          key={`${index}-${entryIndex}`}
                                          className="flex items-center gap-3"
                                        >
                                          <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0" />
                                          <div className="flex-1">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {auditorName}
                                            </span>
                                            <span className="mx-2 text-gray-400">
                                              •
                                            </span>
                                            <a
                                              href={
                                                typeof url === 'string' &&
                                                url.startsWith('http')
                                                  ? url
                                                  : `https://${url}`
                                              }
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                            >
                                              View Report
                                              <ExternalLink className="h-3 w-3" />
                                            </a>
                                          </div>
                                        </div>
                                      ),
                                    )
                                  })
                                  .flat()
                              }
                            } catch (e) {
                              // Not JSON, treat as comma-separated or single URL
                              const auditUrls = textRecords.audits
                                .split(',')
                                .map((url) => url.trim())
                              return auditUrls.map((url, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-2"
                                >
                                  <ShieldCheck className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                  <a
                                    href={
                                      url.startsWith('http')
                                        ? url
                                        : `https://${url}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    {url.split('/').pop() ||
                                      `Audit ${index + 1}`}
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

          {/* Compiled Metadata - Independent Section (Shows for Sourcify-verified contracts) */}
          {isContract && sourcifyMetadata && (
            <div className="mt-6">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  Compiled Metadata
                </h4>
                <div className="space-y-3">
                  {/* Solidity Version */}
                  {sourcifyMetadata.metadata?.compiler?.version && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Solidity
                      </span>
                      <span className="inline-block px-3 py-1 text-sm rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-mono">
                        {sourcifyMetadata.metadata.compiler.version}
                      </span>
                    </div>
                  )}

                  {/* Contract ABI */}
                  {sourcifyMetadata.abi && sourcifyMetadata.abi.length > 0 && (
                    <div>
                      <details className="group cursor-pointer">
                        <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between py-1">
                          <span>Contract ABI</span>
                          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-2 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          {/* Functions */}
                          {sourcifyMetadata.abi.filter(
                            (item: any) => item.type === 'function',
                          ).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Functions
                              </p>
                              <div className="space-y-1">
                                {sourcifyMetadata.abi
                                  .filter(
                                    (item: any) => item.type === 'function',
                                  )
                                  .map((func: any, index: number) => (
                                    <div
                                      key={index}
                                      className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all"
                                    >
                                      <span className="text-green-600 dark:text-green-400">
                                        {func.name}
                                      </span>
                                      <span className="text-gray-500">(</span>
                                      {func.inputs?.map(
                                        (input: any, i: number) => (
                                          <span key={i}>
                                            <span className="text-blue-600 dark:text-blue-400">
                                              {input.type}
                                            </span>
                                            {input.name && (
                                              <span className="text-gray-600 dark:text-gray-400">
                                                {' '}
                                                {input.name}
                                              </span>
                                            )}
                                            {i < func.inputs.length - 1 && (
                                              <span className="text-gray-500">
                                                ,{' '}
                                              </span>
                                            )}
                                          </span>
                                        ),
                                      )}
                                      <span className="text-gray-500">)</span>
                                      {func.stateMutability &&
                                        func.stateMutability !==
                                          'nonpayable' && (
                                          <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                            {func.stateMutability}
                                          </span>
                                        )}
                                      {func.outputs &&
                                        func.outputs.length > 0 && (
                                          <span className="text-gray-500">
                                            {' returns ('}
                                            {func.outputs.map(
                                              (output: any, i: number) => (
                                                <span key={i}>
                                                  <span className="text-blue-600 dark:text-blue-400">
                                                    {output.type}
                                                  </span>
                                                  {i <
                                                    func.outputs.length - 1 &&
                                                    ', '}
                                                </span>
                                              ),
                                            )}
                                            {')'}
                                          </span>
                                        )}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Events */}
                          {sourcifyMetadata.abi.filter(
                            (item: any) => item.type === 'event',
                          ).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Events
                              </p>
                              <div className="space-y-1">
                                {sourcifyMetadata.abi
                                  .filter((item: any) => item.type === 'event')
                                  .map((event: any, index: number) => (
                                    <div
                                      key={index}
                                      className="text-xs font-mono break-all"
                                    >
                                      <span className="text-yellow-600 dark:text-yellow-400">
                                        {event.name}
                                      </span>
                                      <span className="text-gray-500">(</span>
                                      {event.inputs?.map(
                                        (input: any, i: number) => (
                                          <span
                                            key={i}
                                            className="text-gray-600 dark:text-gray-400"
                                          >
                                            <span className="text-blue-600 dark:text-blue-400">
                                              {input.type}
                                            </span>
                                            {input.indexed && (
                                              <span className="text-purple-600 dark:text-purple-400">
                                                {' '}
                                                indexed
                                              </span>
                                            )}
                                            {input.name && (
                                              <span> {input.name}</span>
                                            )}
                                            {i < event.inputs.length - 1 && (
                                              <span className="text-gray-500">
                                                ,{' '}
                                              </span>
                                            )}
                                          </span>
                                        ),
                                      )}
                                      <span className="text-gray-500">)</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Errors */}
                          {sourcifyMetadata.abi.filter(
                            (item: any) => item.type === 'error',
                          ).length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Errors
                              </p>
                              <div className="space-y-1">
                                {sourcifyMetadata.abi
                                  .filter((item: any) => item.type === 'error')
                                  .map((error: any, index: number) => (
                                    <div
                                      key={index}
                                      className="text-xs font-mono text-red-600 dark:text-red-400 break-all"
                                    >
                                      {error.name}
                                      <span className="text-gray-500">(</span>
                                      {error.inputs?.map(
                                        (input: any, i: number) => (
                                          <span
                                            key={i}
                                            className="text-gray-600 dark:text-gray-400"
                                          >
                                            <span className="text-blue-600 dark:text-blue-400">
                                              {input.type}
                                            </span>
                                            {input.name && (
                                              <span> {input.name}</span>
                                            )}
                                            {i < error.inputs.length - 1 && (
                                              <span className="text-gray-500">
                                                ,{' '}
                                              </span>
                                            )}
                                          </span>
                                        ),
                                      )}
                                      <span className="text-gray-500">)</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Source Files */}
                  {sourcifyMetadata.metadata?.sources &&
                    Object.keys(sourcifyMetadata.metadata.sources).length >
                      0 && (
                      <div>
                        <details className="group cursor-pointer">
                          <summary className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center justify-between py-1">
                            <span>Source Files</span>
                            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 max-h-48 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            {Object.entries(
                              sourcifyMetadata.metadata.sources,
                            ).map(
                              ([fileName, fileData]: [string, any], index) => {
                                // Extract IPFS hash from the second URL (dweb:/ipfs/<hash>)
                                let ipfsViewerUrl = ''
                                if (fileData.urls && fileData.urls[1]) {
                                  const dwebUrl = fileData.urls[1]
                                  const match =
                                    dwebUrl.match(/dweb:\/ipfs\/(.+)/)
                                  if (match && match[1]) {
                                    ipfsViewerUrl = `https://ipfsviewer.com/?hash=${match[1]}`
                                  }
                                }

                                return (
                                  <div
                                    key={index}
                                    className="flex items-center justify-between text-xs bg-white dark:bg-gray-900 p-2 rounded"
                                  >
                                    <span className="text-gray-700 dark:text-gray-300 font-mono truncate">
                                      {fileName}
                                    </span>
                                    {ipfsViewerUrl && (
                                      <a
                                        href={ipfsViewerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 ml-2 flex-shrink-0"
                                      >
                                        ipfs://
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    )}
                                  </div>
                                )
                              },
                            )}
                          </div>
                        </details>
                      </div>
                    )}
                </div>
              </div>
            </div>
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
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Contract Verification
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(verificationStatus.sourcify_verification ===
                          'exact_match' ||
                          verificationStatus.sourcify_verification ===
                            'match') && (
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
                        {verificationStatus.etherscan_verification ===
                          'verified' && (
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
                          verificationStatus.blockscout_verification ===
                            'match') && (
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
                        {verificationStatus.sourcify_verification ===
                          'unverified' && (
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
                        {verificationStatus.etherscan_verification ===
                          'unverified' && (
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
                                            const threeMonthsFromNow =
                                              new Date()
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
                                              now.getTime() -
                                                expiryDate.getTime() <
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
                                                {isExpired
                                                  ? 'Expired'
                                                  : 'Expires'}
                                                :{' '}
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
                          onClick={() =>
                            setOwnedNamesExpanded(!ownedNamesExpanded)
                          }
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
                                  return userOwnedDomains.map(
                                    (domain, index) => {
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
                                        indentLevel > 0
                                          ? `pl-${indentLevel * 4}`
                                          : ''

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
                                                        title:
                                                          "Name doesn't resolve",
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
                                                  const threeMonthsFromNow =
                                                    new Date()
                                                  threeMonthsFromNow.setMonth(
                                                    now.getMonth() + 3,
                                                  )

                                                  const isExpired =
                                                    expiryDate < now
                                                  const isWithinThreeMonths =
                                                    !isExpired &&
                                                    expiryDate <
                                                      threeMonthsFromNow
                                                  const ninetyDaysInMs =
                                                    90 * 24 * 60 * 60 * 1000
                                                  const isInGracePeriod =
                                                    isExpired &&
                                                    now.getTime() -
                                                      expiryDate.getTime() <
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
                                                    <span
                                                      className={textColorClass}
                                                    >
                                                      {isExpired
                                                        ? 'Expired'
                                                        : 'Expires'}
                                                      :{' '}
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
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                                              >
                                                <ExternalLink className="h-3 w-3" />
                                              </a>
                                            </Button>
                                          </div>
                                        </div>
                                      )
                                    },
                                  )
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
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
