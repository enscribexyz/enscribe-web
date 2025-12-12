import React, { useState, useEffect, useRef } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { isAddress, encodeFunctionData, namehash } from 'viem'
import { readContract, writeContract, waitForTransactionReceipt } from 'viem/actions'
import { X, Copy, Check } from 'lucide-react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import enscribeV2ContractABI from '../contracts/EnscribeV2'
import ensRegistryABI from '../contracts/ENSRegistry'
import nameWrapperABI from '../contracts/NameWrapper'
import reverseRegistrarABI from '@/contracts/ReverseRegistrar'
import ownableContractABI from '@/contracts/Ownable'
import Image from 'next/image'
import SetNameStepsModal, { Step } from './SetNameStepsModal'

interface BatchEntry {
  id: string
  address: string
  label: string
}


const L2_CHAIN_OPTIONS = ['Optimism', 'Arbitrum', 'Scroll', 'Base', 'Linea']

export default function BatchNamingForm() {
  const { address: walletAddress, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const config = chain?.id ? CONTRACTS[chain.id] : undefined
  const enscribeDomain = config?.ENSCRIBE_DOMAIN || ''

  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([
    { id: '1', address: '', label: '' }
  ])
  const [parentName, setParentName] = useState('')
  const [parentType, setParentType] = useState<'web3labs' | 'own'>('web3labs')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showL2Modal, setShowL2Modal] = useState(false)
  const [selectedL2ChainNames, setSelectedL2ChainNames] = useState<string[]>([])
  const [skipL1Naming, setSkipL1Naming] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSteps, setModalSteps] = useState<Step[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [modalSubtitle, setModalSubtitle] = useState('')
  const [showENSModal, setShowENSModal] = useState(false)
  const [fetchingENS, setFetchingENS] = useState(false)
  const [userOwnedDomains, setUserOwnedDomains] = useState<string[]>([])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [callDataList, setCallDataList] = useState<string[]>([])
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({})
  const [allCallData, setAllCallData] = useState<string>('')
  const [isCallDataOpen, setIsCallDataOpen] = useState<boolean>(false)

  // Unsupported L2 gating for this page: Optimism/Arbitrum/Scroll/Linea/Base L2s should show guidance
  const isUnsupportedL2Chain = [
    CHAINS.OPTIMISM,
    CHAINS.OPTIMISM_SEPOLIA,
    CHAINS.ARBITRUM,
    CHAINS.ARBITRUM_SEPOLIA,
    CHAINS.SCROLL,
    CHAINS.SCROLL_SEPOLIA,
    CHAINS.LINEA,
    CHAINS.LINEA_SEPOLIA,
    CHAINS.BASE,
    CHAINS.BASE_SEPOLIA,
  ].includes((chain?.id as number) || -1)

  const unsupportedL2Name =
    chain?.id === CHAINS.OPTIMISM
      ? 'Optimism'
      : chain?.id === CHAINS.OPTIMISM_SEPOLIA
        ? 'Optimism Sepolia'
        : chain?.id === CHAINS.ARBITRUM
          ? 'Arbitrum'
          : chain?.id === CHAINS.ARBITRUM_SEPOLIA
            ? 'Arbitrum Sepolia'
            : chain?.id === CHAINS.SCROLL
              ? 'Scroll'
              : chain?.id === CHAINS.SCROLL_SEPOLIA
                ? 'Scroll Sepolia'
                : chain?.id === CHAINS.LINEA
                  ? 'Linea'
                  : chain?.id === CHAINS.LINEA_SEPOLIA
                    ? 'Linea Sepolia'
                    : chain?.id === CHAINS.BASE
                      ? 'Base'
                      : chain?.id === CHAINS.BASE_SEPOLIA
                        ? 'Base Sepolia'
                        : ''

  useEffect(() => {
    // Don't reset form if modal is open (to prevent closing during transaction)
    if (modalOpen) {
      console.log('Modal is open, skipping form reset to prevent interruption')
      return
    }

    setParentName(enscribeDomain)
    setParentType('web3labs')
    setError('')
    setLoading(false)
    setBatchEntries([{ id: '1', address: '', label: '' }])
    setModalOpen(false)
    setModalSteps([])
    setModalTitle('')
    setModalSubtitle('')
    setUserOwnedDomains([])
    setShowENSModal(false)
    setSelectedL2ChainNames([])
    setSkipL1Naming(false)
    setIsAdvancedOpen(false)
    setCallDataList([])
    setCopied({})
    setAllCallData('')
    setIsCallDataOpen(false)
  }, [chain?.id, isConnected, modalOpen, enscribeDomain])

  useEffect(() => {
    if (selectedL2ChainNames.length === 0) {
      setSkipL1Naming(false)
      // Collapse Advanced Options when all L2 chains are cleared
      setIsAdvancedOpen(false)
    }
  }, [selectedL2ChainNames])

  useEffect(() => {
    if (parentName && batchEntries.some(e => e.address && e.label)) {
      generateCallData()
    } else {
      setCallDataList([])
    }
  }, [batchEntries, parentName, selectedL2ChainNames, skipL1Naming, walletAddress, config, chain?.id])

  const addEntry = () => {
    setBatchEntries([
      ...batchEntries,
      { id: Date.now().toString(), address: '', label: '' },
    ])
  }

  const updateEntry = (id: string, field: 'address' | 'label', value: string) => {
    setBatchEntries(
      batchEntries.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    )
  }

  const removeEntry = (id: string) => {
    if (batchEntries.length > 1) {
      setBatchEntries(batchEntries.filter((entry) => entry.id !== id))
    }
  }

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

  const fetchUserOwnedDomains = async () => {
    if (!walletAddress) {
      console.warn('Address or chain configuration is missing')
      return
    }

    if (!config?.SUBGRAPH_API) {
      console.warn('No subgraph API endpoint configured for this chain')
      return
    }

    try {
      setFetchingENS(true)
      // Fetch domains where user is the owner
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
                                } 
                            }
                        `,
              variables: {
                address: walletAddress.toLowerCase(),
              },
            }),
          }),
          // Fetch domains where user is the registrant
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
                                } 
                            }
                        `,
              variables: {
                address: walletAddress.toLowerCase(),
              },
            }),
          }),
          // Fetch domains where user is the wrapped
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
                                } 
                            }
                        `,
              variables: {
                address: walletAddress.toLowerCase(),
              },
            }),
          }),
        ])

      const [ownerData, registrantData, wrappedData] = await Promise.all([
        ownerResponse.json(),
        registrantResponse.json(),
        wrappedResponse.json(),
      ])

      // Combine all sets of domains and remove duplicates
      const ownedDomains =
        ownerData?.data?.domains?.map((d: { name: string }) => d.name) || []
      const registrantDomains =
        registrantData?.data?.domains?.map((d: { name: string }) => d.name) ||
        []
      const wrappedDomains =
        wrappedData?.data?.domains?.map((d: { name: string }) => d.name) || []

      // Combine and deduplicate domains
      const allDomains = [
        ...new Set([...ownedDomains, ...registrantDomains, ...wrappedDomains]),
      ]

      if (allDomains.length > 0) {
        // Filter out .addr.reverse names
        const filteredDomains = allDomains.filter(
          (domain: string) => !domain.endsWith('.addr.reverse'),
        )

        // Keep domains as-is, including any labelhashes
        const processedDomains = filteredDomains

        // First, separate domains with labelhashes from regular domains
        const domainsWithLabelhash = processedDomains.filter(
          (domain) => domain.includes('[') && domain.includes(']'),
        )
        const regularDomains = processedDomains.filter(
          (domain) => !(domain.includes('[') && domain.includes(']')),
        )

        // Function to get the 2LD for a domain
        const get2LD = (domain: string): string => {
          const parts = domain.split('.')
          if (parts.length < 2) return domain
          return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
        }

        // Group regular domains by their 2LD
        const domainsByParent: { [key: string]: string[] } = {}

        regularDomains.forEach((domain) => {
          const parent2LD = get2LD(domain)
          if (!domainsByParent[parent2LD]) {
            domainsByParent[parent2LD] = []
          }
          domainsByParent[parent2LD].push(domain)
        })

        // Sort 2LDs alphabetically
        const sorted2LDs = Object.keys(domainsByParent).sort()

        // For each 2LD, sort its domains by depth
        const sortedDomains: string[] = []

        sorted2LDs.forEach((parent2LD) => {
          // Sort domains within this 2LD group by depth
          const sortedGroup = domainsByParent[parent2LD].sort((a, b) => {
            // Always put the 2LD itself first
            if (a === parent2LD) return -1
            if (b === parent2LD) return 1

            // Then sort by depth
            const aDepth = a.split('.').length
            const bDepth = b.split('.').length
            if (aDepth !== bDepth) {
              return aDepth - bDepth
            }

            // If same depth, sort alphabetically
            return a.localeCompare(b)
          })

          // Add all domains from this group to the result
          sortedDomains.push(...sortedGroup)
        })

        // Finally, add domains with labelhashes at the end
        sortedDomains.push(...domainsWithLabelhash)

        // Apply chain-specific filtering
        let chainFilteredDomains = sortedDomains

        setUserOwnedDomains(chainFilteredDomains)
        console.log(
          'Fetched and processed user owned domains:',
          chainFilteredDomains,
        )
      }
    } catch (error) {
      console.error("Error fetching user's owned ENS domains:", error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch your owned ENS domains',
      })
    } finally {
      setFetchingENS(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent =
      'address,name\n0x1234567890123456789012345678901234567890,mycontract.enscribe.eth\n0x0987654321098765432109876543210987654321,anothercontract.enscribe.eth'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'batch-naming-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n').filter((line) => line.trim())
        const startIndex = lines[0].toLowerCase().includes('address') ? 1 : 0
        const newEntries: BatchEntry[] = []
        let detectedParentName = ''

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const parts = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''))
          if (parts.length >= 2) {
            const address = parts[0]
            const fullName = parts[1]

            if (!isAddress(address)) continue

            const nameParts = fullName.split('.')
            if (nameParts.length >= 2) {
              const label = nameParts[0]
              const parent = nameParts.slice(1).join('.')
              if (!detectedParentName) detectedParentName = parent
              newEntries.push({ id: `${Date.now()}-${i}`, address, label })
            } else {
              newEntries.push({ id: `${Date.now()}-${i}`, address, label: fullName })
            }
          }
        }

        if (detectedParentName) {
          setParentName(detectedParentName)
          setParentType(
            detectedParentName === enscribeDomain ? 'web3labs' : 'own'
          )
        }
        setBatchEntries([
          ...batchEntries.filter((e) => e.address || e.label),
          ...newEntries,
        ])
        toast({
          title: 'CSV Imported',
          description: `Imported ${newEntries.length} entries`,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to parse CSV',
          variant: 'destructive',
        })
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const generateCallData = async () => {
    if (!walletClient || !config || !parentName) {
      setCallDataList([])
      return
    }

    const validEntries = batchEntries.filter(
      (e) => e.address && e.label && isAddress(e.address)
    )

    if (validEntries.length === 0) {
      setCallDataList([])
      return
    }

    const processedEntries = processAndSortEntries(validEntries, parentName)
    const callDataArray: string[] = []

    try {
      // 1. Grant operator access
      const parentNode = namehash(parentName)

      const owner = await readContract(walletClient, {
        address: config.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'owner',
        args: [parentNode],
      })

      const isWrapped = owner === config.NAME_WRAPPER

      const approvalCallData = encodeFunctionData({
        abi: isWrapped ? nameWrapperABI : ensRegistryABI,
        functionName: 'setApprovalForAll',
        args: [config.ENSCRIBE_CONTRACT, true],
      })
      callDataArray.push(
        `${isWrapped ? 'NameWrapper' : 'ENSRegistry'}.setApprovalForAll (grant): ${approvalCallData}`
      )

      // 2. Batch naming
      const addresses = processedEntries.map((e) => e.address as `0x${string}`)
      const labels = processedEntries.map((e) => e.label)

      const coinTypes: bigint[] = []
      if (!skipL1Naming) {
        coinTypes.push(60n)
      }

      const isL1Mainnet = chain?.id === CHAINS.MAINNET
      
      for (const chainName of selectedL2ChainNames) {
        const chainConfigs = {
          Optimism: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
          Arbitrum: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
          Scroll: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
          Base: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
          Linea: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
        }
        
        const chainId = chainConfigs[chainName as keyof typeof chainConfigs]
        if (chainId) {
          coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
        }
      }

      const uniqueCoinTypes = [...new Set(coinTypes)]

      let batchCallData
      if (uniqueCoinTypes.length === 1 && uniqueCoinTypes[0] === 60n) {
        batchCallData = encodeFunctionData({
          abi: enscribeV2ContractABI,
          functionName: 'setNameBatch',
          args: [addresses, labels, parentName],
        })
      } else {
        batchCallData = encodeFunctionData({
          abi: enscribeV2ContractABI,
          functionName: 'setNameBatch',
          args: [addresses, labels, parentName, uniqueCoinTypes],
        })
      }
      callDataArray.push(`Enscribe.setNameBatch: ${batchCallData}`)

      // 3. Reverse resolution (if applicable)
      if (!skipL1Naming) {
        for (const entry of processedEntries) {
          if (
            entry.address === '0x0000000000000000000000000000000000000000'
          ) {
            continue
          }

          const labelOnly = entry.label.split('.')[0]
          const reverseCallData = encodeFunctionData({
            abi: reverseRegistrarABI,
            functionName: 'setNameForAddr',
            args: [
              entry.address as `0x${string}`,
              walletAddress!,
              config.PUBLIC_RESOLVER as `0x${string}`,
              entry.label,
            ],
          })
          callDataArray.push(
            `ReverseRegistrar.setNameForAddr (${labelOnly}): ${reverseCallData}`
          )
        }
      }

      // 4. Revoke operator access
      const revokeCallData = encodeFunctionData({
        abi: isWrapped ? nameWrapperABI : ensRegistryABI,
        functionName: 'setApprovalForAll',
        args: [config.ENSCRIBE_CONTRACT, false],
      })
      callDataArray.push(
        `${isWrapped ? 'NameWrapper' : 'ENSRegistry'}.setApprovalForAll (revoke): ${revokeCallData}`
      )

      setCallDataList(callDataArray)
      setAllCallData(callDataArray.join('\n\n'))
    } catch (error) {
      console.error('Error generating call data:', error)
      setCallDataList([])
    }
  }


  const getParentNode = (name: string) => {
    try {
      return namehash(name)
    } catch (error) {
      return ''
    }
  }

  function isEmpty(value: string) {
    return value == null || value.trim().length === 0
  }

  const checkIfAddressEmpty = (address: string): boolean => {
    return isEmpty(address)
  }

  const isAddressValidCheck = (address: string): boolean => {
    if (isEmpty(address)) {
      return false
    }

    if (!isAddress(address)) {
      return false
    }
    return true
  }

  const checkIfOwnable = async (
    contractAddress: string
  ): Promise<boolean> => {
    if (
      checkIfAddressEmpty(contractAddress) ||
      !isAddressValidCheck(contractAddress) ||
      !walletClient
    ) {
      return false
    }

    try {
      const ownerAddress = (await readContract(walletClient, {
        address: contractAddress as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
        args: [],
      })) as `0x${string}`

      console.log('contract ownable')
      return true
    } catch (err) {
      console.log('err ' + err)
      return false
    }
  }

  const checkIfContractOwner = async (
    contractAddress: string
  ): Promise<boolean> => {
    if (
      checkIfAddressEmpty(contractAddress) ||
      !isAddressValidCheck(contractAddress) ||
      !walletClient ||
      !config?.ENS_REGISTRY ||
      !walletAddress
    ) {
      return false
    }
    
    try {
      const ownerAddress = (await readContract(walletClient, {
        address: contractAddress as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
        args: [],
      })) as `0x${string}`
      
      console.log(
        `ownerAddress: ${ownerAddress.toLowerCase()} signer: ${walletAddress}`,
      )
      return ownerAddress.toLowerCase() === walletAddress.toLowerCase()
    } catch (err) {
      console.log('err ' + err)
      const addrLabel = contractAddress.slice(2).toLowerCase()
      const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
      
      try {
        const resolvedAddr = (await readContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'owner',
          args: [reversedNode],
        })) as string

        console.log(
          `resolvedAddr: ${resolvedAddr.toLowerCase()} signer: ${walletAddress}`,
        )
        return resolvedAddr.toLowerCase() === walletAddress.toLowerCase()
      } catch (error) {
        console.log('Error checking reverse registrar owner:', error)
        return false
      }
    }
  }

  const grantOperatorAccess = async () => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_CONTRACT ||
      !getParentNode(parentName)
    ) {
      console.log('Missing required parameters for granting operator access')
      return
    }

    try {
      const parentNode = getParentNode(parentName)
      
      if (chain?.id === CHAINS.BASE || chain?.id === CHAINS.BASE_SEPOLIA) {
        const tx = await writeContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_CONTRACT, true],
          account: walletAddress,
        })

        await waitForTransactionReceipt(walletClient, { hash: tx })
      } else {
        const isWrapped = (await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })) as boolean

        const tx = isWrapped
          ? await writeContract(walletClient, {
              address: config.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, true],
              account: walletAddress,
            })
          : await writeContract(walletClient, {
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, true],
              account: walletAddress,
            })

        await waitForTransactionReceipt(walletClient, { hash: tx })
      }

      console.log('Operator access granted successfully')
    } catch (err) {
      console.error('Error granting operator access:', err)
      throw err
    }
  }

  const revokeOperatorAccess = async () => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_CONTRACT ||
      !getParentNode(parentName)
    ) {
      console.log('Missing required parameters for revoking operator access')
      return
    }

    try {
      const parentNode = getParentNode(parentName)

      if (chain?.id === CHAINS.BASE || chain?.id === CHAINS.BASE_SEPOLIA) {
        const tx = await writeContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_CONTRACT, false],
          account: walletAddress,
        })

        await waitForTransactionReceipt(walletClient, { hash: tx })
      } else {
        const isWrapped = (await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })) as boolean

        const tx = isWrapped
          ? await writeContract(walletClient, {
              address: config.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, false],
              account: walletAddress,
            })
          : await writeContract(walletClient, {
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, false],
              account: walletAddress,
            })

        await waitForTransactionReceipt(walletClient, { hash: tx })
      }

      console.log('Operator access revoked successfully')
    } catch (err) {
      console.error('Error revoking operator access:', err)
      throw err
    }
  }

  /**
   * Process entries to add missing parent subdomains and sort
   * This ensures that all intermediate subdomains are created before their children
   */
  const processAndSortEntries = (
    entries: BatchEntry[],
    parent: string
  ): BatchEntry[] => {
    const processed: BatchEntry[] = []
    const fullNames = new Set<string>()

    // Build full names for each entry
    entries.forEach((entry) => {
      if (entry.address && entry.label) {
        const fullName = `${entry.label}.${parent}`
        fullNames.add(fullName)
        processed.push({ ...entry, label: fullName })
      }
    })

    // Find all required parent subdomains
    const requiredParents = new Set<string>()
    fullNames.forEach((name) => {
      const parts = name.split('.')
      // For each subdomain, check if parent exists
      for (let i = 1; i < parts.length - 1; i++) {
        const parentSubdomain = parts.slice(i).join('.')
        // Only add if it's not the base parent and doesn't already exist
        if (parentSubdomain !== parent && !fullNames.has(parentSubdomain)) {
          requiredParents.add(parentSubdomain)
        }
      }
    })

    // Add zero address entries for missing parents
    requiredParents.forEach((parentSubdomain) => {
      // Extract just the label part (everything before the parent domain)
      const label = parentSubdomain.replace(`.${parent}`, '')
      processed.push({
        id: `zero-${Date.now()}-${Math.random()}`,
        address: '0x0000000000000000000000000000000000000000',
        label: parentSubdomain,
      })
    })

    // Sort by nesting level and alphabetically
    processed.sort((a, b) => {
      const aLevel = a.label.split('.').length
      const bLevel = b.label.split('.').length

      // First sort by nesting level (fewer dots = higher level = first)
      if (aLevel !== bLevel) {
        return aLevel - bLevel
      }

      // If same level, sort alphabetically
      return a.label.localeCompare(b.label)
    })

    return processed
  }

  const handleBatchNaming = async () => {
    setError('')

    if (!isConnected) {
      setError('Please connect your wallet first')
      toast({
        title: 'Error',
        description: 'Please connect your wallet',
        variant: 'destructive',
      })
      return
    }

    if (isUnsupportedL2Chain) {
      setError(
        `To batch name contracts on ${unsupportedL2Name}, change to the ${chain?.id === CHAINS.OPTIMISM || chain?.id === CHAINS.ARBITRUM || chain?.id === CHAINS.SCROLL || chain?.id === CHAINS.LINEA || chain?.id === CHAINS.BASE ? 'Ethereum Mainnet' : 'Sepolia'} network and use the Naming on L2 Chains option.`
      )
      return
    }

    const validEntries = batchEntries.filter(
      (e) => e.address && e.label && isAddress(e.address)
    )

    if (validEntries.length === 0) {
      setError('Please add at least one valid entry with address and name')
      toast({
        title: 'Error',
        description: 'Please add valid entries',
        variant: 'destructive',
      })
      return
    }

    if (!parentName || !parentName.trim()) {
      setError('Parent name cannot be empty')
      toast({
        title: 'Error',
        description: 'Please provide parent name',
        variant: 'destructive',
      })
      return
    }

    if (!config) {
      console.error('Unsupported network')
      setError('Unsupported network')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Process entries to add missing parents and sort
      const processedEntries = processAndSortEntries(validEntries, parentName)

      const steps: Step[] = []

      // Step 1: Grant operator access
      steps.push({
        title: 'Grant operator access',
        chainId: chain!.id, // Add chainId for L1 transaction
        action: async () => {
          await grantOperatorAccess()
        },
      })

      // Step 2: Batch naming
      steps.push({
        title: `Name ${processedEntries.length} entries (${validEntries.length} contracts + ${processedEntries.length - validEntries.length} parent subdomains)`,
        chainId: chain!.id, // Add chainId for L1 transaction
        action: async () => {
          const addresses = processedEntries.map((e) => e.address as `0x${string}`)
          const labels = processedEntries.map((e) => e.label)

          const pricing = await readContract(walletClient!, {
            address: config!.ENSCRIBE_CONTRACT as `0x${string}`,
            abi: enscribeV2ContractABI,
            functionName: 'pricing',
            args: [],
          })

          // Determine coin types based on selected L2 chains
          const coinTypes: bigint[] = []

          // Only include cointype 60 if NOT skipping L1 naming
          if (!skipL1Naming) {
            coinTypes.push(60n)
          }

          const isL1Mainnet = chain?.id === CHAINS.MAINNET

          const chainConfigs = {
            Optimism: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
            Arbitrum: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
            Scroll: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
            Base: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
            Linea: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
          }

          for (const chainName of selectedL2ChainNames) {
            const chainId =
              chainConfigs[chainName as keyof typeof chainConfigs]
            if (chainId) {
              coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
            }
          }

          // Remove duplicates
          const uniqueCoinTypes = [...new Set(coinTypes)]

          let hash
          if (uniqueCoinTypes.length === 1 && uniqueCoinTypes[0] === 60n) {
            hash = await writeContract(walletClient!, {
              address: config!.ENSCRIBE_CONTRACT as `0x${string}`,
              abi: enscribeV2ContractABI,
              functionName: 'setNameBatch',
              args: [addresses, labels, parentName],
              value: pricing as bigint,
            })
          } else {
            hash = await writeContract(walletClient!, {
              address: config!.ENSCRIBE_CONTRACT as `0x${string}`,
              abi: enscribeV2ContractABI,
              functionName: 'setNameBatch',
              args: [addresses, labels, parentName, uniqueCoinTypes],
              value: pricing as bigint,
            })
          }

          await waitForTransactionReceipt(walletClient!, { hash })
        },
      })

      // Step 3: Check each contract for reverse resolution (only for non-zero addresses and if not skipping L1)
      if (!skipL1Naming) {
        for (const entry of processedEntries) {
          // Skip zero addresses
          if (
            entry.address === '0x0000000000000000000000000000000000000000'
          ) {
            continue
          }

          const isOwnable = await checkIfOwnable(entry.address)
          if (isOwnable) {
            const isOwner = await checkIfContractOwner(entry.address)
            if (isOwner) {
              const labelOnly = entry.label.split('.')[0]

              // Add reverse resolution for L1
              steps.push({
                title: `Set reverse record for ${labelOnly}`,
                chainId: chain!.id, // Add chainId for L1 transaction
                action: async () => {
                  const tx = await writeContract(walletClient!, {
                    address: config!.REVERSE_REGISTRAR as `0x${string}`,
                    abi: reverseRegistrarABI,
                    functionName: 'setNameForAddr',
                    args: [
                      entry.address as `0x${string}`,
                      walletAddress!,
                      config!.PUBLIC_RESOLVER as `0x${string}`,
                      entry.label,
                    ],
                  })
                  await waitForTransactionReceipt(walletClient!, { hash: tx })
                },
              })
            }
          }
        }
      }

      // Step 4: Revoke operator access
      steps.push({
        title: 'Revoke operator access',
        chainId: chain!.id, // Add chainId for L1 transaction
        action: async () => {
          await revokeOperatorAccess()
        },
      })

      setModalSteps(steps)
      setModalTitle('Batch Naming')
      setModalSubtitle(
        `Naming ${processedEntries.length} entries (${validEntries.length} contracts + ${processedEntries.length - validEntries.length} parent subdomains)`
      )
      setModalOpen(true)
    } catch (error: any) {
      console.error('Batch naming error:', error)
      setError(error?.message || 'Error during batch naming')
      toast({
        title: 'Error',
        description: error.message || 'Failed to start batch naming',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
        Batch Naming
      </h2>
      {(!isConnected || isUnsupportedL2Chain) && (
        <p className="text-red-500 mt-4">
          {!isConnected
            ? 'Please connect your wallet.'
            : `To batch name contracts on ${unsupportedL2Name}, change to the ${chain?.id === CHAINS.OPTIMISM || chain?.id === CHAINS.ARBITRUM || chain?.id === CHAINS.SCROLL || chain?.id === CHAINS.LINEA || chain?.id === CHAINS.BASE ? 'Ethereum Mainnet' : 'Sepolia'} network and use the Naming on L2 Chains option.`}
        </p>
      )}
    
    <div
        className={`space-y-6 mt-6 ${!isConnected || isUnsupportedL2Chain ? 'pointer-events-none opacity-50' : ''}`}
      >
      {/* Parent Name */}
      
        <label className="block text-gray-700 dark:text-gray-300">
          Parent Domain
        </label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={parentName}
            onChange={(e) => {
              setParentName(e.target.value)
              setParentType(e.target.value === enscribeDomain ? 'web3labs' : 'own')
            }}
            placeholder="mydomain.eth"
            className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <Button
            onClick={() => {
              setShowENSModal(true)
              fetchUserOwnedDomains()
            }}
            className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50"
          >
            Select Domain
          </Button>
        </div>
      

      {/* Contracts Table */}
      
        <label className="block text-gray-700 dark:text-gray-300">
          Contracts
        </label>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
          {batchEntries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Contract Address"
                value={entry.address}
                onChange={(e) => updateEntry(entry.id, 'address', e.target.value)}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
              <Input
                type="text"
                placeholder="ENS Name"
                value={entry.label}
                onChange={(e) => updateEntry(entry.id, 'label', e.target.value)}
                className="w-48 px-4 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
              {batchEntries.length > 1 && (
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
          
          <div className="flex items-center gap-4 pt-2">
            <button
              onClick={addEntry}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              Add contract
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              Upload CSV
            </button>
            <button
              onClick={downloadTemplate}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium"
            >
              Download Template
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
          </div>
        </div>
     

      {/* Advanced Options */}
      <div className="mt-4 mb-4">
        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          {isAdvancedOpen ? (
            <ChevronDownIcon className="w-5 h-5" />
          ) : (
            <ChevronRightIcon className="w-5 h-5" />
          )}
          <span className="text-lg font-medium">Advanced Options</span>
        </button>

        {isAdvancedOpen && (
          <div className="mt-4 space-y-4 border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="block text-gray-700 dark:text-gray-300">
                  Naming on L2 Chains
                </label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-gray-600 dark:text-gray-300 text-xs select-none">
                        i
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Select which L2 chains to set coin types for. This will add the corresponding coin types for all contracts.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {selectedL2ChainNames.length > 0 && (
                <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                  <span className="text-gray-700 dark:text-gray-300">
                    Skip L1 Naming
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-400 text-gray-600 dark:text-gray-300 text-xs select-none">
                          i
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Select this if you want to name only on the selected L2 chains and skip L1 naming (cointype 60).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Checkbox
                    checked={skipL1Naming}
                    onCheckedChange={(val) => setSkipL1Naming(Boolean(val))}
                    aria-label="Skip L1 Naming"
                  />
                </div>
              )}
            </div>

            {/* Selected L2 Chains Display */}
            {selectedL2ChainNames.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {selectedL2ChainNames.map((chainName) => {
                    const logoSrc =
                      chainName === 'Optimism' ? '/images/optimism.svg' :
                      chainName === 'Arbitrum' ? '/images/arbitrum.svg' :
                      chainName === 'Scroll' ? '/images/scroll.svg' :
                      chainName === 'Base' ? '/images/base.svg' :
                      '/images/linea.svg'
                    
                    return (
                      <div key={chainName} className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm">
                        <Image src={logoSrc} alt={chainName} width={14} height={14} />
                        <span>{chainName}</span>
                        <button
                          onClick={() => setSelectedL2ChainNames(selectedL2ChainNames.filter(c => c !== chainName))}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* L2 Chain chooser button */}
            <div>
              <Button
                type="button"
                className="bg-gray-900 text-white dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white"
                onClick={() => setShowL2Modal(true)}
                disabled={L2_CHAIN_OPTIONS.filter(c => !selectedL2ChainNames.includes(c)).length === 0}
              >
                Choose L2 Chains
              </Button>
            </div>

            {/* Call data section */}
            {callDataList.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCallDataOpen(!isCallDataOpen)}
                  className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-3"
                >
                  {isCallDataOpen ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">Call Data ({callDataList.length} calls)</span>
                </button>

                {isCallDataOpen && (
                  <div className="space-y-3">
                    {/* Copy All Button */}
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(allCallData, 'all')}
                        className="text-xs"
                      >
                        {copied['all'] ? (
                          <>
                            <Check className="h-3 w-3 mr-1 text-green-500" />
                            Copied All
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy All
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Individual Call Data Items */}
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {callDataList.map((callData, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all whitespace-pre-wrap">
                                {callData}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 flex-shrink-0"
                              onClick={() => {
                                const parts = callData.split(': ')
                                const hexData = parts.length > 1 ? parts[1] : callData
                                copyToClipboard(hexData, `callData-${index}`)
                              }}
                            >
                              {copied[`callData-${index}`] ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleBatchNaming}
        disabled={loading || !isConnected || !parentName}
        className="relative overflow-hidden w-full py-6 text-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus:ring-4 focus:ring-blue-500/30 group"
        style={{ backgroundSize: '200% 100%' }}
      >
        <span className="absolute top-0 left-0 w-full h-full bg-white/10 transform -skew-x-12 group-hover:animate-shimmer pointer-events-none"></span>
        <span className="absolute bottom-0 right-0 w-12 h-12 bg-white/20 rounded-full blur-xl group-hover:animate-pulse pointer-events-none"></span>

        {loading ? (
          <div className="flex items-center justify-center relative z-10">
            <svg
              className="animate-spin h-6 w-6 mr-3 text-white"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span className="animate-pulse">Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center relative z-10">
            <span className="group-hover:scale-105 transition-transform duration-300 dark:text-white">
              Name Your Contracts
            </span>
            <span className="ml-2 inline-block animate-rocket">🚀</span>
          </div>
        )}

        <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none"></span>
      </Button>

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-md p-3 break-words max-w-full overflow-hidden">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ENS Domain Selection Modal */}
      <Dialog open={showENSModal} onOpenChange={setShowENSModal}>
        <DialogContent className="max-w-3xl bg-white dark:bg-gray-900 shadow-lg rounded-lg">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Choose Domain
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mb-6">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                Your Domains
              </h3>
              {fetchingENS ? (
                <div className="flex justify-center items-center p-6">
                  <svg className="animate-spin h-5 w-5 mr-3 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <p className="text-gray-700 dark:text-gray-300">Fetching your ENS domains...</p>
                </div>
              ) : userOwnedDomains.length > 0 ? (
                <div className="max-h-[30vh] overflow-y-auto pr-1">
                  {(() => {
                    // Function to get the 2LD for a domain
                    const get2LD = (domain: string): string => {
                      const parts = domain.split('.')
                      if (parts.length < 2) return domain
                      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
                    }

                    // Separate domains with labelhashes
                    const domainsWithLabelhash = userOwnedDomains.filter(
                      (domain) =>
                        domain.includes('[') && domain.includes(']'),
                    )
                    const regularDomains = userOwnedDomains.filter(
                      (domain) =>
                        !(domain.includes('[') && domain.includes(']')),
                    )

                    // Group regular domains by 2LD
                    const domainGroups: { [key: string]: string[] } = {}

                    regularDomains.forEach((domain) => {
                      const parent2LD = get2LD(domain)
                      if (!domainGroups[parent2LD]) {
                        domainGroups[parent2LD] = []
                      }
                      domainGroups[parent2LD].push(domain)
                    })

                    // Sort 2LDs alphabetically
                    const sorted2LDs = Object.keys(domainGroups).sort()

                    return (
                      <div className="space-y-4">
                        {/* Regular domains grouped by 2LD */}
                        {sorted2LDs.map((parent2LD) => (
                          <div
                            key={parent2LD}
                            className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0"
                          >
                            <div className="flex flex-wrap gap-2">
                              {domainGroups[parent2LD].map(
                                (domain, index) => (
                                  <div
                                    key={domain}
                                    className={`px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center ${index === 0 ? 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800' : 'bg-white dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                                    onClick={() => {
                                      setParentName(domain)
                                      setParentType(
                                        domain === enscribeDomain
                                          ? 'web3labs'
                                          : 'own',
                                      )
                                      setShowENSModal(false)
                                    }}
                                  >
                                    <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                                      {domain}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Domains with labelhashes at the end */}
                        {domainsWithLabelhash.length > 0 && (
                          <div className="pt-2">
                            <div className="flex flex-wrap gap-2">
                              {domainsWithLabelhash.map((domain) => (
                                <div
                                  key={domain}
                                  className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center"
                                  onClick={() => {
                                    setParentName(domain)
                                    setParentType(
                                      domain === enscribeDomain
                                        ? 'web3labs'
                                        : 'own',
                                    )
                                    setShowENSModal(false)
                                  }}
                                >
                                  <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                                    {domain}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-gray-500 dark:text-gray-400">
                    No ENS domains found for your address.
                  </p>
                </div>
              )}
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                Other Domains
              </h3>
              <div
                className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer transition-colors inline-flex items-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
                onClick={() => {
                  setParentName(enscribeDomain)
                  setParentType('web3labs')
                  setShowENSModal(false)
                }}
              >
                <span className="text-gray-800 dark:text-gray-200 font-medium whitespace-nowrap">
                  {enscribeDomain}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* L2 Chain Selection Modal */}
      <Dialog open={showL2Modal} onOpenChange={setShowL2Modal}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white">
              Select L2 Chains
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Choose which L2 chains to set coin types for
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-3 mt-4">
            {L2_CHAIN_OPTIONS.map((chainName) => {
              const isSelected = selectedL2ChainNames.includes(chainName)
              const logoSrc =
                chainName === 'Optimism' ? '/images/optimism.svg' :
                chainName === 'Arbitrum' ? '/images/arbitrum.svg' :
                chainName === 'Scroll' ? '/images/scroll.svg' :
                chainName === 'Base' ? '/images/base.svg' :
                '/images/linea.svg'
              
              return (
                <button
                  key={chainName}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedL2ChainNames(selectedL2ChainNames.filter(c => c !== chainName))
                    } else {
                      setSelectedL2ChainNames([...selectedL2ChainNames, chainName])
                    }
                  }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <Image src={logoSrc} alt={chainName} width={24} height={24} />
                  <span className="font-medium text-gray-900 dark:text-white">{chainName}</span>
                  {isSelected && (
                    <span className="ml-auto text-blue-600 dark:text-blue-400 font-bold">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowL2Modal(false)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Steps Modal */}
      <SetNameStepsModal
        open={modalOpen}
        onClose={(result) => {
          console.log('Modal closed with result:', result)
          setModalOpen(false)

          if (result?.startsWith('ERROR')) {
            // Extract the actual error message (remove 'ERROR: ' prefix)
            const errorMessage = result.replace('ERROR: ', '')
            setError(errorMessage)
            return
          }

          if (result === 'INCOMPLETE') {
            setError(
              'Steps not completed. Please complete all steps before closing.'
            )
          } else {
            console.log('Success - resetting form')
            // Reset form after successful batch naming
            setBatchEntries([{ id: '1', address: '', label: '' }])
            setParentType('web3labs')
            setParentName(enscribeDomain)
            setSelectedL2ChainNames([])
            setSkipL1Naming(false)
            setError('')
            setIsAdvancedOpen(false)
            setCallDataList([])
            setCopied({})
            setAllCallData('')
            setIsCallDataOpen(false)
          }
        }}
        steps={modalSteps}
        title={modalTitle}
        subtitle={modalSubtitle}
      />
    </div>
    </div>
  )
}
