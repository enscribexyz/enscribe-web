import { useCallback, useEffect, useState } from 'react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { readContract } from 'viem/actions'
import { getPublicClient } from '@/lib/viemClient'
import { useAccount } from 'wagmi'
import {
  CHAINS,
  CONTRACTS,
  ETHERSCAN_API,
  OLI_GQL_URL,
} from '@/utils/constants'
import ensRegistryABI from '@/contracts/ENSRegistry'
import { getENS, fetchOwnedDomains } from '@/utils/ens'
import { useToast } from '@/hooks/use-toast'
import type { ENSDomain, TextRecords, VerificationStatus } from '@/types'
import type { PublicClient } from 'viem'

interface UseENSDetailsProps {
  address: string
  contractDeployerAddress: string | null
  contractDeployerName: string | null
  chainId?: number
  isContract: boolean
  proxyInfo?: {
    isProxy: boolean
    implementationAddress?: string
  }
  queriedENSName?: string
}

export function useENSDetails({
  address,
  contractDeployerAddress,
  contractDeployerName,
  chainId,
  isContract,
  proxyInfo,
  queriedENSName,
}: UseENSDetailsProps) {
  const { copied, copyToClipboard } = useCopyToClipboard()
  const [implementationExpanded, setImplementationExpanded] = useState(false)
  const [textRecords, setTextRecords] = useState<TextRecords>({})
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
  const [customProvider, setCustomProvider] = useState<PublicClient | null>(null)
  const { toast } = useToast()

  // Derived values
  const effectiveChainId = chainId || chain?.id
  const config = effectiveChainId ? CONTRACTS[effectiveChainId] : undefined
  const etherscanUrl = config?.ETHERSCAN_URL || 'https://etherscan.io/'
  const SOURCIFY_URL = 'https://repo.sourcify.dev/'
  const shouldUseWalletClient = isConnected && chainId === chain?.id

  // ─── Data fetching callbacks ───────────────────────────────────────────────

  const fetchUserOwnedDomains = useCallback(async () => {
    if (!address || !config?.SUBGRAPH_API) return
    try {
      const domains = await fetchOwnedDomains(address, config.SUBGRAPH_API, {
        includeRegistration: true,
      })
      setUserOwnedDomains(domains)
    } catch (error) {
      console.error("Error fetching user's owned ENS domains:", error)
    }
  }, [address, config])

  // Initialize custom provider when chainId changes
  useEffect(() => {
    if (effectiveChainId && config?.RPC_ENDPOINT) {
      try {
        const provider = getPublicClient(effectiveChainId)
        if (provider) setCustomProvider(provider)
      } catch (err) {
        console.error('[ENSDetails] Error initializing provider:', err)
        setError('Failed to initialize provider for the selected chain')
      }
    }
  }, [effectiveChainId, config])

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

  const fetchNameExpiryDate = async (
    ensName: string,
    setExpiryState: (date: number | null) => void,
  ) => {
    if (!config?.SUBGRAPH_API) return

    try {
      const nameParts = ensName.split('.')
      if (nameParts.length < 2) return

      const tld = nameParts[nameParts.length - 1]
      const sld = nameParts[nameParts.length - 2]
      const domainToQuery = `${sld}.${tld}`

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

  const fetchPrimaryNameExpiryDate = useCallback(
    async (primaryENS: string) => {
      await fetchNameExpiryDate(primaryENS, setPrimaryNameExpiryDate)
    },
    [],
  )

  const fetchForwardNameExpiryDate = useCallback(
    async (forwardENS: string) => {
      await fetchNameExpiryDate(forwardENS, setForwardNameExpiryDate)
    },
    [],
  )

  const fetchPrimaryName = useCallback(async () => {
    if (!address || !customProvider) return

    try {
      if (address.includes('.')) {
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
        return
      }

      if (!address.startsWith('0x') || address.length !== 42) {
        setPrimaryName(null)
        setPrimaryNameExpiryDate(null)
        return
      }

      const primaryENS = await getENS(address, effectiveChainId!)

      if (primaryENS) {
        setPrimaryName(primaryENS)

        if (queriedENSName) {
          const isActualPrimary =
            queriedENSName.toLowerCase() === primaryENS.toLowerCase()
        }

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

          let manager = domain.owner?.id || null
          const owner =
            domain.wrappedOwner?.id || domain.registrant?.id || null

          if (!manager && config.ENS_REGISTRY && customProvider) {
            try {
              const { namehash: computeNamehash } = await import('viem/ens')
              const nameNode = computeNamehash(ensName)
              manager = (await readContract(customProvider, {
                address: config.ENS_REGISTRY as `0x${string}`,
                abi: ensRegistryABI,
                functionName: 'owner',
                args: [nameNode],
              })) as string
            } catch (registryError) {
              console.error(
                `[ENSDetails] Error fetching from ENS Registry:`,
                registryError,
              )
            }
          }

          return { owner, manager }
        }

        let manager = null
        if (config.ENS_REGISTRY && customProvider) {
          try {
            const { namehash: computeNamehash } = await import('viem/ens')
            const nameNode = computeNamehash(ensName)
            manager = (await readContract(customProvider, {
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'owner',
              args: [nameNode],
            })) as string
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

  const fetchAssociatedNames = useCallback(async () => {
    if (!address || !config?.SUBGRAPH_API) return

    try {
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
        let filteredDomains = domainsData.data.domains

        if (effectiveChainId === CHAINS.BASE) {
          filteredDomains = filteredDomains.filter(
            (domain: { name: string }) => domain.name.endsWith('.base.eth'),
          )
        } else if (effectiveChainId === CHAINS.BASE_SEPOLIA) {
          filteredDomains = []
        }

        const filterDomains = async () => {
          return await Promise.all(
            filteredDomains.map(
              async (domain: {
                name: string
                registration: { expiryDate: string } | null
              }) => {
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

        setEnsNames(sortedDomains)

        if (isContract && !primaryName && sortedDomains.length > 0) {
          const forwardSortedDomains = sortedDomains.sort((a: any, b: any) => {
            const aIsDeployer =
              a.owner?.id?.toLowerCase() ===
              contractDeployerAddress?.toLowerCase()
            const bIsDeployer =
              b.owner?.id?.toLowerCase() ===
              contractDeployerAddress?.toLowerCase()

            if (aIsDeployer && !bIsDeployer) return -1
            if (!aIsDeployer && bIsDeployer) return 1

            const aExpiry = a.expiryDate || 0
            const bExpiry = b.expiryDate || 0
            return bExpiry - aExpiry
          })

          const names = forwardSortedDomains.map(
            (domain: any) => domain.name,
          )
          setSelectedForwardName(names[0])
        }
      }
    } catch (error) {
      console.error('[ENSDetails] Error fetching associated ENS names:', error)
    }
  }, [address, config, effectiveChainId, primaryName])

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

  // ─── Effects ───────────────────────────────────────────────────────────────

  // Main data fetch
  useEffect(() => {
    setError(null)

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

  // Fetch text records from API
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
    let ensNameToFetch: string | null = null

    if (queriedENSName) {
      ensNameToFetch = queriedENSName

      if (
        !primaryName ||
        queriedENSName.toLowerCase() !== primaryName.toLowerCase()
      ) {
        fetchForwardNameExpiryDate(queriedENSName)
      }
    } else {
      ensNameToFetch = primaryName || selectedForwardName

      if (
        selectedForwardName &&
        (!primaryName ||
          selectedForwardName.toLowerCase() !== primaryName.toLowerCase())
      ) {
        fetchForwardNameExpiryDate(selectedForwardName)
      }
    }

    if (ensNameToFetch && isContract) {
      fetchTextRecordsFromAPI(ensNameToFetch)
    } else {
      setTextRecords({})
      setIsMetadataLoading(false)
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
      const currentName =
        queriedENSName || primaryName || selectedForwardName

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

      setEnsNameManagerLoading(true)
      const { owner, manager } = await fetchOwnerAndManager(currentName)
      setEnsNameOwner(owner)
      setEnsNameManager(manager)
      setEnsNameManagerLoading(false)

      if (owner) {
        try {
          const ownerENS = await getENS(owner, effectiveChainId!)
          setEnsNameOwnerResolved(ownerENS || null)
        } catch (err) {
          setEnsNameOwnerResolved(null)
        }
      }

      if (manager) {
        try {
          const managerENS = await getENS(manager, effectiveChainId!)
          setEnsNameManagerResolved(managerENS || null)
        } catch (err) {
          setEnsNameManagerResolved(null)
        }
      }

      const parts = currentName.split('.')
      if (parts.length >= 2) {
        const tld = parts[parts.length - 1]
        const sld = parts[parts.length - 2]
        const tldName = `${sld}.${tld}`

        const { owner: tldOwnerData, manager: tldManagerData } =
          await fetchOwnerAndManager(tldName)
        setTldOwner(tldOwnerData)
        setTldManager(tldManagerData)

        if (tldOwnerData) {
          try {
            const tldOwnerENS = await getENS(tldOwnerData, effectiveChainId!)
            setTldOwnerResolved(tldOwnerENS || null)
          } catch (err) {
            setTldOwnerResolved(null)
          }
        }

        if (tldManagerData) {
          try {
            const tldManagerENS = await getENS(
              tldManagerData,
              effectiveChainId!,
            )
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

          if (creatorAddress && customProvider) {
            try {
              const deployerENS = await getENS(
                creatorAddress,
                effectiveChainId!,
              )
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

  const shouldShowLoading = isLoading || (isContract && isMetadataLoading)

  return {
    // Loading/error
    isLoading,
    isMetadataLoading,
    shouldShowLoading,
    error,
    // ENS name data
    primaryName,
    selectedForwardName,
    ensNames,
    userOwnedDomains,
    primaryNameExpiryDate,
    forwardNameExpiryDate,
    // Ownership data
    ensNameOwner,
    ensNameManager,
    ensNameManagerLoading,
    ensNameOwnerResolved,
    ensNameManagerResolved,
    tldOwner,
    tldManager,
    tldOwnerResolved,
    tldManagerResolved,
    deployerResolved,
    contractDeployerPrimaryName,
    implDeployerAddress,
    implDeployerName,
    // Contract data
    verificationStatus,
    sourcifyMetadata,
    textRecords,
    hasAttestations,
    // Provider/config
    customProvider,
    effectiveChainId,
    config,
    etherscanUrl,
    SOURCIFY_URL,
    shouldUseWalletClient,
    // UI state
    implementationExpanded,
    setImplementationExpanded,
    otherDetailsExpanded,
    setOtherDetailsExpanded,
    // Clipboard
    copied,
    copyToClipboard,
    // Toast
    toast,
    // Connection
    isConnected,
  }
}
