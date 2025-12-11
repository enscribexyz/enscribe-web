import React, { useState, useEffect, useRef } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { isAddress, encodeFunctionData, namehash } from 'viem'
import { readContract, writeContract } from 'viem/actions'
import { createPublicClient, http } from 'viem'
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
import {
  mainnet,
  base,
  linea,
  optimism,
  arbitrum,
  scroll,
  sepolia,
  baseSepolia,
  lineaSepolia,
  optimismSepolia,
  arbitrumSepolia,
  scrollSepolia,
} from 'wagmi/chains'
import SetNameStepsModal, { Step } from './SetNameStepsModal'

interface BatchEntry {
  id: string
  address: string
  label: string
}

const CHAIN_TO_WAGMI_CHAIN: Record<number, any> = {
  [CHAINS.MAINNET]: mainnet,
  [CHAINS.BASE]: base,
  [CHAINS.LINEA]: linea,
  [CHAINS.OPTIMISM]: optimism,
  [CHAINS.ARBITRUM]: arbitrum,
  [CHAINS.SCROLL]: scroll,
  [CHAINS.SEPOLIA]: sepolia,
  [CHAINS.BASE_SEPOLIA]: baseSepolia,
  [CHAINS.LINEA_SEPOLIA]: lineaSepolia,
  [CHAINS.OPTIMISM_SEPOLIA]: optimismSepolia,
  [CHAINS.ARBITRUM_SEPOLIA]: arbitrumSepolia,
  [CHAINS.SCROLL_SEPOLIA]: scrollSepolia,
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

  useEffect(() => {
    if (enscribeDomain) {
      setParentName(enscribeDomain)
    }
  }, [enscribeDomain])

  const addEntry = () => {
    setBatchEntries([...batchEntries, { id: Date.now().toString(), address: '', label: '' }])
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

  const fetchUserOwnedDomains = async () => {
    if (!walletAddress || !config?.SUBGRAPH_API) return

    setFetchingENS(true)
    try {
      const response = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            domains(where: { owner: "${walletAddress.toLowerCase()}" }, first: 1000) {
              name
            }
          }`
        })
      })
      const data = await response.json()
      const domains = data?.data?.domains?.map((d: any) => d.name) || []
      setUserOwnedDomains(domains)
    } catch (error) {
      console.error('Error fetching ENS domains:', error)
      toast({ title: 'Error', description: 'Failed to fetch ENS domains', variant: 'destructive' })
    } finally {
      setFetchingENS(false)
    }
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
          setParentType(detectedParentName === enscribeDomain ? 'web3labs' : 'own')
        }
        setBatchEntries([...batchEntries.filter(e => e.address || e.label), ...newEntries])
        toast({ title: 'CSV Imported', description: `Imported ${newEntries.length} entries` })
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to parse CSV', variant: 'destructive' })
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [id]: true })
    setTimeout(() => {
      setCopied({ ...copied, [id]: false })
    }, 2000)
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
      const wagmiChain = CHAIN_TO_WAGMI_CHAIN[chain!.id]
      const publicClient = createPublicClient({ chain: wagmiChain, transport: http() })

      const owner = await readContract(publicClient, {
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
      callDataArray.push(`${isWrapped ? 'NameWrapper' : 'ENSRegistry'}.setApprovalForAll (grant): ${approvalCallData}`)

      // 2. Batch naming
      const addresses = processedEntries.map((e) => e.address as `0x${string}`)
      const labels = processedEntries.map((e) => e.label)

      const coinTypes: bigint[] = []
      if (!skipL1Naming) {
        coinTypes.push(60n)
      }

      const isL1Mainnet = chain?.id === CHAINS.MAINNET
      for (const chainName of selectedL2ChainNames) {
        if (chainName === 'Optimism') {
          const chainId = isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA
          coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
        } else if (chainName === 'Arbitrum') {
          const chainId = isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA
          coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
        } else if (chainName === 'Scroll') {
          const chainId = isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA
          coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
        } else if (chainName === 'Base') {
          const chainId = isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA
          coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
        } else if (chainName === 'Linea') {
          const chainId = isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA
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
          if (entry.address === '0x0000000000000000000000000000000000000000') {
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
          callDataArray.push(`ReverseRegistrar.setNameForAddr (${labelOnly}): ${reverseCallData}`)
        }
      }

      // 4. Revoke operator access
      const revokeCallData = encodeFunctionData({
        abi: isWrapped ? nameWrapperABI : ensRegistryABI,
        functionName: 'setApprovalForAll',
        args: [config.ENSCRIBE_CONTRACT, false],
      })
      callDataArray.push(`${isWrapped ? 'NameWrapper' : 'ENSRegistry'}.setApprovalForAll (revoke): ${revokeCallData}`)

      setCallDataList(callDataArray)
      setAllCallData(callDataArray.join('\n\n'))
    } catch (error) {
      console.error('Error generating call data:', error)
      setCallDataList([])
    }
  }

  useEffect(() => {
    if (parentName && batchEntries.some(e => e.address && e.label)) {
      generateCallData()
    } else {
      setCallDataList([])
    }
  }, [batchEntries, parentName, selectedL2ChainNames, skipL1Naming, walletAddress, config, chain?.id])

  const downloadTemplate = () => {
    const csvContent = 'address,name\n0x1234567890123456789012345678901234567890,mycontract.enscribe.eth\n0x0987654321098765432109876543210987654321,anothercontract.enscribe.eth'
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

  const checkIfOwnable = async (contractAddress: string): Promise<boolean> => {
    try {
      const wagmiChain = CHAIN_TO_WAGMI_CHAIN[chain!.id]
      const publicClient = createPublicClient({ chain: wagmiChain, transport: http() })
      await readContract(publicClient, {
        address: contractAddress as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
      })
      return true
    } catch {
      return false
    }
  }

  const checkIsOwner = async (contractAddress: string): Promise<boolean> => {
    try {
      const wagmiChain = CHAIN_TO_WAGMI_CHAIN[chain!.id]
      const publicClient = createPublicClient({ chain: wagmiChain, transport: http() })
      const owner = await readContract(publicClient, {
        address: contractAddress as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
      })
      return owner === walletAddress
    } catch {
      return false
    }
  }

  const grantOperatorAccess = async () => {
    if (!walletClient || !config) return

    const parentNode = namehash(parentName)
    const wagmiChain = CHAIN_TO_WAGMI_CHAIN[chain!.id]
    const publicClient = createPublicClient({ chain: wagmiChain, transport: http() })

    const owner = await readContract(publicClient, {
      address: config.ENS_REGISTRY as `0x${string}`,
      abi: ensRegistryABI,
      functionName: 'owner',
      args: [parentNode],
    })

    const isWrapped = owner === config.NAME_WRAPPER

    const tx = await writeContract(walletClient, {
      address: (isWrapped ? config.NAME_WRAPPER : config.ENS_REGISTRY) as `0x${string}`,
      abi: isWrapped ? nameWrapperABI : ensRegistryABI,
      functionName: 'setApprovalForAll',
      args: [config.ENSCRIBE_CONTRACT, true],
      account: walletAddress,
    })

    await publicClient.waitForTransactionReceipt({ hash: tx })
  }

  const revokeOperatorAccess = async () => {
    if (!walletClient || !config) return

    const parentNode = namehash(parentName)
    const wagmiChain = CHAIN_TO_WAGMI_CHAIN[chain!.id]
    const publicClient = createPublicClient({ chain: wagmiChain, transport: http() })

    const owner = await readContract(publicClient, {
      address: config.ENS_REGISTRY as `0x${string}`,
      abi: ensRegistryABI,
      functionName: 'owner',
      args: [parentNode],
    })

    const isWrapped = owner === config.NAME_WRAPPER

    const tx = await writeContract(walletClient, {
      address: (isWrapped ? config.NAME_WRAPPER : config.ENS_REGISTRY) as `0x${string}`,
      abi: isWrapped ? nameWrapperABI : ensRegistryABI,
      functionName: 'setApprovalForAll',
      args: [config.ENSCRIBE_CONTRACT, false],
      account: walletAddress,
    })

    await publicClient.waitForTransactionReceipt({ hash: tx })
  }

  // Process entries to add missing parent subdomains and sort
  const processAndSortEntries = (entries: BatchEntry[], parent: string) => {
    const processed: BatchEntry[] = []
    const fullNames = new Set<string>()
    
    // Build full names for each entry
    entries.forEach(entry => {
      if (entry.address && entry.label) {
        const fullName = `${entry.label}.${parent}`
        fullNames.add(fullName)
        processed.push({ ...entry, label: fullName })
      }
    })

    // Find all required parent subdomains
    const requiredParents = new Set<string>()
    fullNames.forEach(name => {
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
    requiredParents.forEach(parentSubdomain => {
      // Extract just the label part (everything before the parent domain)
      const label = parentSubdomain.replace(`.${parent}`, '')
      processed.push({
        id: `zero-${Date.now()}-${Math.random()}`,
        address: '0x0000000000000000000000000000000000000000',
        label: parentSubdomain
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
    if (!isConnected) {
      toast({ title: 'Error', description: 'Please connect your wallet', variant: 'destructive' })
      return
    }

    const validEntries = batchEntries.filter(
      (e) => e.address && e.label && isAddress(e.address)
    )

    if (validEntries.length === 0) {
      toast({ title: 'Error', description: 'Please add valid entries', variant: 'destructive' })
      return
    }

    if (!parentName) {
      toast({ title: 'Error', description: 'Please provide parent name', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const wagmiChain = CHAIN_TO_WAGMI_CHAIN[chain!.id]
      const publicClient = createPublicClient({ chain: wagmiChain, transport: http() })

      // Process entries to add missing parents and sort
      const processedEntries = processAndSortEntries(validEntries, parentName)

      const steps: Step[] = []
      
      // Step 1: Grant operator access
      steps.push({
        title: 'Grant operator access',
        action: async () => {
          await grantOperatorAccess()
        }
      })

      // Step 2: Batch naming
      steps.push({
        title: `Name ${processedEntries.length} entries (${validEntries.length} contracts + ${processedEntries.length - validEntries.length} parent subdomains)`,
        action: async () => {
          const addresses = processedEntries.map((e) => e.address as `0x${string}`)
          const labels = processedEntries.map((e) => e.label)

          const pricing = await readContract(publicClient, {
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

          for (const chainName of selectedL2ChainNames) {
            if (chainName === 'Optimism') {
              const chainId = isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA
              coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
            } else if (chainName === 'Arbitrum') {
              const chainId = isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA
              coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
            } else if (chainName === 'Scroll') {
              const chainId = isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA
              coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
            } else if (chainName === 'Base') {
              const chainId = isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA
              coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
            } else if (chainName === 'Linea') {
              const chainId = isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA
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

          await publicClient.waitForTransactionReceipt({ hash })
        }
      })

      // Step 3: Check each contract for reverse resolution (only for non-zero addresses and if not skipping L1)
      if (!skipL1Naming) {
        for (const entry of processedEntries) {
          // Skip zero addresses
          if (entry.address === '0x0000000000000000000000000000000000000000') {
            continue
          }
          
          const isOwnable = await checkIfOwnable(entry.address)
          if (isOwnable) {
            const isOwner = await checkIsOwner(entry.address)
            if (isOwner) {
              const labelOnly = entry.label.split('.')[0]
              
              // Add reverse resolution for L1
              steps.push({
                title: `Set reverse record for ${labelOnly}`,
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
                  await publicClient.waitForTransactionReceipt({ hash: tx })
                }
              })
            }
          }
        }
      }

      // Step 4: Revoke operator access
      steps.push({
        title: 'Revoke operator access',
        action: async () => {
          await revokeOperatorAccess()
        }
      })

      setModalSteps(steps)
      setModalTitle('Batch Naming')
      setModalSubtitle(`Naming ${processedEntries.length} entries (${validEntries.length} contracts + ${processedEntries.length - validEntries.length} parent subdomains)`)
      setModalOpen(true)

    } catch (error: any) {
      console.error('Batch naming error:', error)
      toast({ title: 'Error', description: error.message || 'Failed to start batch naming', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Parent Name */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300 mb-2">
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
            className="bg-gray-900 text-white dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white"
          >
            Select Domain
          </Button>
        </div>
      </div>

      {/* Contracts Table */}
      <div>
        <label className="block text-gray-700 dark:text-gray-300 mb-2">
          Contracts
        </label>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-2">
          {batchEntries.map((entry, index) => (
            <div key={entry.id} className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Enter address"
                value={entry.address}
                onChange={(e) => updateEntry(entry.id, 'address', e.target.value)}
                className="flex-1 px-4 py-2 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
              <Input
                type="text"
                placeholder="Name"
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
              Batch Naming
            </span>
            <span className="ml-2 inline-block animate-rocket">🚀</span>
          </div>
        )}

        <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-blue-500/0 via-blue-500/40 to-blue-500/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none"></span>
      </Button>

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
                  <div className="flex flex-wrap gap-2">
                    {userOwnedDomains.map((domain) => (
                      <div
                        key={domain}
                        className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors inline-flex items-center"
                        onClick={() => {
                          setParentName(domain)
                          setParentType(domain === enscribeDomain ? 'web3labs' : 'own')
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
        onClose={() => {
          setModalOpen(false)
          setBatchEntries([{ id: '1', address: '', label: '' }])
          setParentType('web3labs')
          setParentName(enscribeDomain)
          setSelectedL2ChainNames([])
          setSkipL1Naming(false)
        }}
        steps={modalSteps}
        title={modalTitle}
        subtitle={modalSubtitle}
      />
    </div>
  )
}
