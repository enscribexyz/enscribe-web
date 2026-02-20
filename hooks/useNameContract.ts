import { useState, useEffect } from 'react'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { useRouter, useSearchParams } from 'next/navigation'
import contractABI from '../contracts/Enscribe'
import ensRegistryABI from '../contracts/ENSRegistry'
import nameWrapperABI from '../contracts/NameWrapper'
import publicResolverABI from '../contracts/PublicResolver'
import reverseRegistrarABI from '@/contracts/ReverseRegistrar'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import {
  optimism,
  optimismSepolia,
  arbitrum,
  arbitrumSepolia,
  scroll,
  scrollSepolia,
  base,
  baseSepolia,
  linea,
  lineaSepolia,
} from 'wagmi/chains'
import { useToast } from '@/hooks/use-toast'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { useChainConfig } from '@/hooks/useChainConfig'
import { useSafeWallet } from '@/hooks/useSafeWallet'
import { getChainName } from '@/lib/chains'
import { getENS, fetchAssociatedNamesCount, getParentNode, fetchOwnedDomains } from '../utils/ens'
import type { Step } from '@/types'
import { v4 as uuid } from 'uuid'
import {
  fetchGeneratedName,
  logMetric,
  isTestNet,
} from '@/utils/componentUtils'
import {
  getEnsAddress,
  readContract,
  writeContract,
  getBytecode,
  getEnsName,
} from 'viem/actions'
import { namehash, normalize } from 'viem/ens'
import { isAddress, keccak256, toBytes, encodeFunctionData, parseAbi, encodePacked } from 'viem'
import { toCoinType } from 'viem'
import { getPublicClient } from '@/lib/viemClient'
import enscribeContractABI from '../contracts/Enscribe'
import ownableContractABI from '@/contracts/Ownable'

export function useNameContract() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { address: walletAddress, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()

  const config = useChainConfig()
  const enscribeDomain = config?.ENSCRIBE_DOMAIN!
  const isSafeWallet = useSafeWallet()

  const { toast } = useToast()

  const [existingContractAddress, setExistingContractAddress] = useState('')
  const [label, setLabel] = useState('')
  const [parentType, setParentType] = useState<'web3labs' | 'own' | 'register'>(
    'web3labs',
  )
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [parentName, setParentName] = useState(enscribeDomain)
  const [fetchingENS, setFetchingENS] = useState(false)
  const [userOwnedDomains, setUserOwnedDomains] = useState<string[]>([])
  const [showENSModal, setShowENSModal] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAddressEmpty, setIsAddressEmpty] = useState(true)
  const [isAddressInvalid, setIsAddressInvalid] = useState(true)
  const [isContractExists, setIsContractExists] = useState<boolean | null>(null)
  const [isOwnable, setIsOwnable] = useState<boolean | null>(false)
  const [isContractOwner, setIsContractOwner] = useState<boolean | null>(false)
  const [isReverseClaimable, setIsReverseClaimable] = useState<boolean | null>(
    false,
  )
  const [isPrimaryNameSet, setIsPrimaryNameSet] = useState(false)

  // L2 Ownable state variables
  const [isOwnableOptimism, setIsOwnableOptimism] = useState<boolean | null>(
    null,
  )
  const [isOwnableArbitrum, setIsOwnableArbitrum] = useState<boolean | null>(
    null,
  )
  const [isOwnableScroll, setIsOwnableScroll] = useState<boolean | null>(null)
  const [isOwnableBase, setIsOwnableBase] = useState<boolean | null>(null)
  const [isOwnableLinea, setIsOwnableLinea] = useState<boolean | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalSteps, setModalSteps] = useState<Step[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [modalSubtitle, setModalSubtitle] = useState('')
  const [selectedL2ChainNames, setSelectedL2ChainNames] = useState<string[]>([])
  const [dropdownValue, setDropdownValue] = useState<string>('')
  const [skipL1Naming, setSkipL1Naming] = useState<boolean>(false)
  const [showL2Modal, setShowL2Modal] = useState<boolean>(false)
  const [sldAsPrimary, setSldAsPrimary] = useState<boolean>(true)
  const [ensModalFromPicker, setEnsModalFromPicker] = useState<boolean>(false)
  const [ensNameChosen, setEnsNameChosen] = useState<boolean>(false)
  const [selectedAction, setSelectedAction] = useState<
    'subname' | 'pick' | null
  >(null)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false)
  const [callDataList, setCallDataList] = useState<string[]>([])
  const { copied, copyToClipboard, resetCopied } = useCopyToClipboard()
  const [allCallData, setAllCallData] = useState<string>('')
  const [isCallDataOpen, setIsCallDataOpen] = useState<boolean>(false)

  const corelationId = uuid()
  const opType = 'nameexisting'
  const L2_CHAIN_OPTIONS = ['Optimism', 'Arbitrum', 'Scroll', 'Base', 'Linea']

  // Unsupported L2 gating: L2s except Base (handled separately) show guidance
  const isUnsupportedL2Chain = [
    CHAINS.OPTIMISM, CHAINS.OPTIMISM_SEPOLIA,
    CHAINS.ARBITRUM, CHAINS.ARBITRUM_SEPOLIA,
    CHAINS.SCROLL, CHAINS.SCROLL_SEPOLIA,
    CHAINS.LINEA, CHAINS.LINEA_SEPOLIA,
  ].includes((chain?.id as number) || -1)

  const isBaseChain =
    chain?.id === CHAINS.BASE || chain?.id === CHAINS.BASE_SEPOLIA
  const baseRequiredParentDomain =
    chain?.id === CHAINS.BASE
      ? 'base.eth'
      : chain?.id === CHAINS.BASE_SEPOLIA
        ? 'basetest.eth'
        : null

  const unsupportedL2Name = getChainName(chain?.id ?? 0)

  useEffect(() => {
    // Don't reset form if modal is open (to prevent closing during Optimism transaction)
    if (modalOpen) {
      return
    }

    setLabel('')
    setParentType('web3labs')
    setParentName(enscribeDomain)
    setError('')
    setLoading(false)
    setExistingContractAddress('')
    setModalOpen(false)
    setModalSteps([])
    setModalTitle('')
    setModalSubtitle('')
    setUserOwnedDomains([])
    setShowENSModal(false)
    setIsOwnable(false)
    setIsReverseClaimable(false)
    setIsAddressEmpty(true)
    setIsAddressInvalid(false)
    setIsContractExists(null)
    setSelectedL2ChainNames([])
    setDropdownValue('')
    setSkipL1Naming(false)
    setIsAdvancedOpen(false)
    setCallDataList([])
    resetCopied()
    setAllCallData('')
    setIsCallDataOpen(false)

    // Reset L2 ownable states
    setIsOwnableOptimism(null)
    setIsOwnableArbitrum(null)
    setIsOwnableScroll(null)
    setIsOwnableBase(null)
    setIsOwnableLinea(null)
  }, [chain?.id, isConnected, modalOpen])

  useEffect(() => {
    // If user has selected all L2 chains, clear the dropdown value and effectively hide the dropdown
    const allSelected = L2_CHAIN_OPTIONS.every((c) =>
      selectedL2ChainNames.includes(c),
    )
    if (allSelected && dropdownValue !== '') {
      setDropdownValue('')
    }
    if (selectedL2ChainNames.length === 0) {
      setSkipL1Naming(false)
      // Collapse Advanced Options when all L2 chains are cleared
      setIsAdvancedOpen(false)
    }
  }, [selectedL2ChainNames])

  // Automatically select L2 chains when contract is detected to be Ownable on them
  // Also clear L2 chains when contract is not deployed on any L2
  useEffect(() => {
    // Only run this on L1 chains (mainnet or sepolia)
    if (chain?.id !== CHAINS.MAINNET && chain?.id !== CHAINS.SEPOLIA) {
      return
    }

    // Don't run if address is empty
    if (!existingContractAddress || existingContractAddress.trim() === '') {
      return
    }

    // Check if all L2 checks have completed (all flags are not null)
    const allL2ChecksComplete =
      isOwnableOptimism !== null &&
      isOwnableArbitrum !== null &&
      isOwnableScroll !== null &&
      isOwnableBase !== null &&
      isOwnableLinea !== null

    // Use functional update to access current state and avoid dependency on selectedL2ChainNames
    setSelectedL2ChainNames((prev) => {
      // If all checks are complete and none are true, clear all selected L2 chains
      if (allL2ChecksComplete &&
          !isOwnableOptimism &&
          !isOwnableArbitrum &&
          !isOwnableScroll &&
          !isOwnableBase &&
          !isOwnableLinea) {
        // Collapse Advanced Options when all L2 chains are cleared
        setIsAdvancedOpen(false)
        return []
      }

      const chainsToAdd: string[] = []

      // Check each L2 chain flag and add to selection if detected and not already selected
      if (isOwnableOptimism === true && !prev.includes('Optimism')) {
        chainsToAdd.push('Optimism')
      }
      if (isOwnableArbitrum === true && !prev.includes('Arbitrum')) {
        chainsToAdd.push('Arbitrum')
      }
      if (isOwnableScroll === true && !prev.includes('Scroll')) {
        chainsToAdd.push('Scroll')
      }
      if (isOwnableBase === true && !prev.includes('Base')) {
        chainsToAdd.push('Base')
      }
      if (isOwnableLinea === true && !prev.includes('Linea')) {
        chainsToAdd.push('Linea')
      }

      // Only update if there are chains to add
      if (chainsToAdd.length > 0) {
        // Automatically expand Advanced Options when chains are auto-selected
        setIsAdvancedOpen(true)
        return [...prev, ...chainsToAdd]
      }

      return prev
    })
  }, [isOwnableOptimism, isOwnableArbitrum, isOwnableScroll, isOwnableBase, isOwnableLinea, chain?.id, existingContractAddress])

  // Clear L2 chains and collapse Advanced Options when contract address is removed
  useEffect(() => {
    // Check if address is empty
    const isAddressEmpty =
      !existingContractAddress || existingContractAddress.trim() === ''

    if (isAddressEmpty) {
      // Clear selected L2 chains
      setSelectedL2ChainNames([])
      // Collapse Advanced Options
      setIsAdvancedOpen(false)
    }
  }, [existingContractAddress])

  useEffect(() => {
    const run = async () => {
      const contractParam = searchParams.get('contract')
      if (!contractParam || !isAddress(contractParam)) {
        return
      }

      const addr = contractParam

      // Blockscout redirect: run even when wallet is disconnected (use URL chainId when no wallet)
      const chainIdParam = searchParams.get('chainId')
      const urlChainId = chainIdParam != null ? Number(chainIdParam) : null
      const redirectChainId =
        urlChainId != null && !Number.isNaN(urlChainId) && CONTRACTS[urlChainId]
          ? urlChainId
          : chain?.id

      if (searchParams.get('utm') === 'blockscout' && redirectChainId) {
        try {
          const primaryName = await getENS(addr, redirectChainId)
          if (primaryName && primaryName.length > 0) {
            router.replace(`/explore/${redirectChainId}/${addr}`)
            return
          }
          const { count } = await fetchAssociatedNamesCount(addr, redirectChainId)
          if (count > 0) {
            router.replace(`/explore/${redirectChainId}/${addr}`)
            return
          }
        } catch (error) {
          console.error('Error checking ENS for blockscout redirect:', error)
        }
        // No redirect happened; fall through to form population if wallet is connected
      }

      // Populate form only when wallet is connected
      if (!walletClient) return

      setExistingContractAddress(addr)
      isAddressValid(addr)
      await checkIfOwnable(addr)
      await checkIfReverseClaimable(addr)
    }

    run()
  }, [searchParams, walletClient, chain?.id])

  useEffect(() => {
    if (parentType === 'web3labs' && config?.ENSCRIBE_DOMAIN) {
      setParentName(config.ENSCRIBE_DOMAIN)
    }
  }, [config, parentType])

  // Generate call data when relevant values change
  useEffect(() => {
    if (existingContractAddress && label && walletClient && config) {
      generateCallData()
    } else {
      setCallDataList([])
    }
  }, [existingContractAddress, label, parentName, selectedAction, parentType, selectedL2ChainNames, skipL1Naming, isOwnable, isReverseClaimable, isContractOwner, isOwnableOptimism, isOwnableArbitrum, isOwnableScroll, isOwnableBase, isOwnableLinea, walletClient, config, chain?.id])

  const populateName = async () => {
    const name = await fetchGeneratedName()
    setLabel(name)
  }


  // Validate ENS name format (for "Use Existing Name" flow)
  const validateFullENSName = (name: string): string | null => {
    if (!name.includes('.')) {
      return 'Please enter a full ENS name (e.g., "myawesomeapp.mydomain.eth")'
    }

    const parts = name.split('.')
    if (parts.length < 2 || parts[parts.length - 1].trim() === '') {
      return 'Invalid ENS name format'
    }

    return null
  }

  const generateCallData = async () => {
    if (!walletClient || !config || !existingContractAddress || !label) {
      setCallDataList([])
      setAllCallData('')
      return
    }

    // For subname creation, we need a valid parent name
    if (selectedAction === 'subname' && !parentName.trim()) {
      setCallDataList([])
      setAllCallData('')
      return
    }

    // Validate that label is not empty
    if (!label.trim()) {
      setCallDataList([])
      setAllCallData('')
      return
    }

    try {
      const callDataArray: string[] = []

      // Compute the same values as in setPrimaryName
      let labelNormalized: string
      let parentNameNormalized: string
      let name: string

      // Validate label before normalizing
      try {
        labelNormalized = normalize(label)
      } catch (error) {
        setCallDataList([])
        setAllCallData('')
        return
      }

      if (selectedAction === 'pick') {
        parentNameNormalized = ''
        const cleanedLabel = label.replace(/\.$/, '')
        name = normalize(cleanedLabel)
      } else {
        // Validate parent name before normalizing
        parentNameNormalized = ''
        if (parentName.trim()) {
          // Check if parent name is valid (not just dots or empty)
          const trimmedParent = parentName.trim()
          if (trimmedParent !== '.' && trimmedParent !== '..' && !trimmedParent.startsWith('.') && !trimmedParent.endsWith('.')) {
            try {
              parentNameNormalized = normalize(trimmedParent)
            } catch (error) {
              parentNameNormalized = ''
            }
          }
        }

        const constructedName = parentNameNormalized
          ? `${labelNormalized}.${parentNameNormalized}`.replace(/\.$/, '')
          : labelNormalized
        name = normalize(constructedName)
      }

      const skipSubnameCreation = selectedAction !== 'subname'
      const parentNode = selectedAction === 'pick' ? getParentNode(name) : getParentNode(parentNameNormalized)
      const node = skipSubnameCreation ? namehash(label) : namehash(name)
      const labelHash = selectedAction === 'pick' ? keccak256(toBytes(name.split('.')[0])) : keccak256(toBytes(labelNormalized))

      const publicResolverAddress = config.PUBLIC_RESOLVER! as `0x${string}`
      const txCost = (await readContract(walletClient, {
        address: config.ENSCRIBE_CONTRACT as `0x${string}`,
        abi: enscribeContractABI,
        functionName: 'pricing',
        args: [],
      })) as bigint

      // Step 1: Create Subname (if needed)
      if (!skipSubnameCreation) {
        if (parentType === 'web3labs') {
          const callData = encodeFunctionData({
            abi: contractABI,
            functionName: 'setName',
            args: [existingContractAddress, labelNormalized, parentNameNormalized, parentNode],
          })
          callDataArray.push(`Enscribe.setName: ${callData}`)
        } else {
           // Check if wrapped (only if parentNode is valid)
           let isWrapped = false
           if (parentNode && parentNode !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
             try {
               isWrapped = (await readContract(walletClient, {
                 address: config.NAME_WRAPPER as `0x${string}`,
                 abi: nameWrapperABI,
                 functionName: 'isWrapped',
                 args: [parentNode],
               })) as boolean
             } catch (error) {
               isWrapped = false
             }
           }

           if (isWrapped) {
            const callData = encodeFunctionData({
              abi: nameWrapperABI,
              functionName: 'setSubnodeRecord',
              args: [parentNode, labelNormalized, walletAddress, publicResolverAddress, 0, 0, 0],
            })
            callDataArray.push(`NameWrapper.setSubnodeRecord: ${callData}`)
          } else {
            const callData = encodeFunctionData({
              abi: ensRegistryABI,
              functionName: 'setSubnodeRecord',
              args: [parentNode, labelHash, walletAddress, publicResolverAddress, 0],
            })
            callDataArray.push(`ENSRegistry.setSubnodeRecord: ${callData}`)
          }
        }
      }

      // Step 2: Set Forward Resolution (if needed)
      if (!skipL1Naming && (skipSubnameCreation || parentType != 'web3labs')) {
        const callData = encodeFunctionData({
          abi: publicResolverABI,
          functionName: 'setAddr',
          args: [node, existingContractAddress],
        })
        callDataArray.push(`PublicResolver.setAddr: ${callData}`)
      }

      // Step 3: Set Reverse Resolution (if needed)
      if (isReverseClaimable && !skipL1Naming) {
        const addrLabel = existingContractAddress.slice(2).toLowerCase()
        const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
        const callData = encodeFunctionData({
          abi: publicResolverABI,
          functionName: 'setName',
          args: [reversedNode, name],
        })
        callDataArray.push(`PublicResolver.setName: ${callData}`)
      } else if (isContractOwner && isOwnable && !skipL1Naming) {
        const callData = encodeFunctionData({
          abi: reverseRegistrarABI,
          functionName: 'setNameForAddr',
          args: [existingContractAddress, walletAddress, publicResolverAddress, name],
        })
        callDataArray.push(`ReverseRegistrar.setNameForAddr: ${callData}`)
      }

      // L2 Forward Resolution steps
      for (const selectedChain of selectedL2ChainNames) {
        const isL1Mainnet = chain?.id === CHAINS.MAINNET
        const chainConfigs = {
          Optimism: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
          Arbitrum: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
          Scroll: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
          Base: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
          Linea: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
        }

        const l2ChainId = chainConfigs[selectedChain as keyof typeof chainConfigs]
        const l2Config = CONTRACTS[l2ChainId]
        const coinType = Number(l2Config.COIN_TYPE || '60')

        if (l2Config && coinType) {
          const callData = encodeFunctionData({
            abi: publicResolverABI,
            functionName: 'setAddr',
            args: [node, coinType, existingContractAddress],
          })
          callDataArray.push(`PublicResolver.setAddr (${selectedChain}): ${callData}`)
        }
      }

      // L2 Primary Name steps
      for (const selectedChain of selectedL2ChainNames) {
        const isL1Mainnet = chain?.id === CHAINS.MAINNET
        const chainConfigs = {
          Optimism: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
          Arbitrum: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
          Scroll: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
          Base: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
          Linea: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
        }

        const l2ChainId = chainConfigs[selectedChain as keyof typeof chainConfigs]
        const l2Config = CONTRACTS[l2ChainId]

        // Check if contract is ownable on this L2 chain
        let isOwnableOnThisL2Chain = false
        switch (selectedChain) {
          case 'Optimism':
            isOwnableOnThisL2Chain = isOwnableOptimism === true
            break
          case 'Arbitrum':
            isOwnableOnThisL2Chain = isOwnableArbitrum === true
            break
          case 'Scroll':
            isOwnableOnThisL2Chain = isOwnableScroll === true
            break
          case 'Base':
            isOwnableOnThisL2Chain = isOwnableBase === true
            break
          case 'Linea':
            isOwnableOnThisL2Chain = isOwnableLinea === true
            break
        }

        if (l2Config && l2Config.L2_REVERSE_REGISTRAR && isOwnableOnThisL2Chain) {
          const callData = encodeFunctionData({
            abi: [{
              inputs: [
                { internalType: 'address', name: 'addr', type: 'address' },
                { internalType: 'string', name: 'name', type: 'string' },
              ],
              name: 'setNameForAddr',
              outputs: [],
              stateMutability: 'nonpayable',
              type: 'function',
            }],
            functionName: 'setNameForAddr',
            args: [existingContractAddress as `0x${string}`, skipSubnameCreation ? label : name],
          })
          callDataArray.push(`L2ReverseRegistrar.setNameForAddr (${selectedChain}): ${callData}`)
        }
      }

      setCallDataList(callDataArray)

      // Generate combined call data for batch execution
      const combinedCallData = callDataArray.map(item => {
        // Extract just the hex call data (after the colon and space)
        const parts = item.split(': ')
        return parts.length > 1 ? parts[1] : item
      })

      // Format as JSON array for easy use in contracts
      const jsonFormat = JSON.stringify(combinedCallData, null, 2)

      // Also provide a simple comma-separated format
      const simpleFormat = combinedCallData.join(', ')

      // Create a comprehensive format with both options
      const comprehensiveFormat = `// Batch Call Data for ENS Naming
// Use this data with contracts like ENS Governance executeTransaction function

// JSON Array Format (recommended):
${jsonFormat}

// Simple Comma-Separated Format:
${simpleFormat}

// Individual Call Data:
${callDataArray.map((item, index) => `${index + 1}. ${item}`).join('\n')}`

      setAllCallData(comprehensiveFormat)
    } catch (error) {
      console.error('Error generating call data:', error)
      setCallDataList([])
      setAllCallData('')
    }
  }

  const fetchUserOwnedDomains = async () => {
    if (!walletAddress || !config?.SUBGRAPH_API) return
    try {
      setFetchingENS(true)
      const domains = await fetchOwnedDomains(walletAddress, config.SUBGRAPH_API)
      setUserOwnedDomains(domains.map((d) => d.name))
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

  const checkENSReverseResolution = async () => {
    if (isEmpty(label) || !walletClient) return

    // Validate label and parent name before checking
    // Only require parentName for "Create New Name" flow

    // In "use existing name" flow, validate that the name contains dots (full ENS name)
    if (selectedAction === 'pick') {
      const validationError = validateFullENSName(label)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    if (selectedAction !== 'pick' && !parentName.trim()) {
      setError('Parent name cannot be empty')
      return
    }
    // In "use existing name" flow, allow dots in label (full name is allowed)
    if (selectedAction !== 'pick' && label.includes('.')) {
      setError("Can't include '.' in label name")
      return
    }

    // try {
    //   const fullEnsName = `${label}.${parentName}`
    //   let resolvedAddress = await getEnsAddress(walletClient, {
    //     name: normalize(fullEnsName),
    //   })

    //   if (resolvedAddress) {
    //     setError('ENS name already used, please change label')
    //   } else {
    //     setError('')
    //   }
    // } catch (err) {
    //   console.error('Error checking ENS name:', err)
    // }
  }

  function isEmpty(value: string) {
    return value == null || value.trim().length === 0
  }

  const checkIfAddressEmpty = (existingContractAddress: string): boolean => {
    const addrEmpty = isEmpty(existingContractAddress)
    setIsAddressEmpty(addrEmpty)
    return addrEmpty
  }

  const isAddressValid = (existingContractAddress: string): boolean => {
    if (isEmpty(existingContractAddress)) {
      setError('contract address cannot be empty')
      return false
    }

    if (!isAddress(existingContractAddress)) {
      setError('Invalid contract address')
      setIsOwnable(false)
      setIsAddressInvalid(true)
      return false
    }
    return true
  }

  const checkIfContractExists = async (address: string) => {
    if (
      checkIfAddressEmpty(address) ||
      !isAddressValid(address) ||
      !walletClient
    ) {
      setIsContractExists(null)
      return
    }

    try {
      // Try to get the contract code to check if it exists
      const code = await getBytecode(walletClient, {
        address: address as `0x${string}`,
      })

      if (code && code !== '0x') {
        setIsContractExists(true)
      } else {
        setIsContractExists(false)
      }
    } catch (err) {
      setIsContractExists(false)
    }
  }

  const checkIfContractOwner = async (address: string) => {
    if (
      checkIfAddressEmpty(address) ||
      !isAddressValid(address) ||
      !walletClient ||
      !config?.ENS_REGISTRY ||
      !walletAddress
    ) {
      setIsOwnable(false)
      setIsContractOwner(false)
      return
    }
    try {
      const ownerAddress = (await readContract(walletClient, {
        address: address as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
        args: [],
      })) as `0x${string}`
      setIsContractOwner(
        ownerAddress.toLowerCase() == walletAddress.toLowerCase(),
      )
    } catch (err) {
      const addrLabel = address.slice(2).toLowerCase()
      const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
      const resolvedAddr = (await readContract(walletClient, {
        address: config.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'owner',
        args: [reversedNode],
      })) as string

      setIsContractOwner(
        resolvedAddr.toLowerCase() == walletAddress.toLowerCase(),
      )
    }
  }

  const checkIfOwnable = async (address: string) => {
    if (
      checkIfAddressEmpty(address) ||
      !isAddressValid(address) ||
      !walletClient
    ) {
      setIsOwnable(false)
      return
    }

    try {
      const ownerAddress = (await readContract(walletClient, {
        address: address as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
        args: [],
      })) as `0x${string}`

      setIsOwnable(true)
      setIsAddressInvalid(false)
      setError('')
    } catch (err) {
      setIsAddressEmpty(false)
      setIsAddressInvalid(false)
      setIsOwnable(false)
    }
  }

  const checkIfOwnableOnL2Chains = async (address: string) => {
    if (
      checkIfAddressEmpty(address) ||
      !isAddressValid(address) ||
      !walletClient
    ) {
      // Reset all L2 ownable states
      setIsOwnableOptimism(null)
      setIsOwnableArbitrum(null)
      setIsOwnableScroll(null)
      setIsOwnableBase(null)
      setIsOwnableLinea(null)
      return
    }

    // Only check L2 ownable if we're on L1 chains (mainnet or sepolia)
    if (chain?.id !== CHAINS.MAINNET && chain?.id !== CHAINS.SEPOLIA) {
      // Reset all L2 ownable states
      setIsOwnableOptimism(null)
      setIsOwnableArbitrum(null)
      setIsOwnableScroll(null)
      setIsOwnableBase(null)
      setIsOwnableLinea(null)
      return
    }

    // Determine if we're on L1 mainnet or sepolia to check appropriate L2 networks
    const isL1Mainnet = chain?.id === CHAINS.MAINNET

    // Check ownable on each L2 chain in parallel (mainnet or testnet based on current L1)
    const l2Chains = [
      {
        name: 'Optimism',
        chainId: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
        setter: setIsOwnableOptimism,
      },
      {
        name: 'Arbitrum',
        chainId: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
        setter: setIsOwnableArbitrum,
      },
      {
        name: 'Scroll',
        chainId: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
        setter: setIsOwnableScroll,
      },
      {
        name: 'Base',
        chainId: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
        setter: setIsOwnableBase,
      },
      {
        name: 'Linea',
        chainId: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
        setter: setIsOwnableLinea,
      },
    ]


    type OwnableResult = { name: string; isOwnable: boolean; error?: string }

    const results: OwnableResult[] = await Promise.all(
      l2Chains.map(async (l2Chain) => {
        try {
          const l2Config = CONTRACTS[l2Chain.chainId]
          if (!l2Config?.RPC_ENDPOINT) {
            return {
              name: l2Chain.name,
              isOwnable: false,
              error: `No RPC endpoint configured for ${l2Chain.name}`,
            }
          }

          // Create a custom client for this L2 chain
          const l2Client = getPublicClient(l2Chain.chainId)
          if (!l2Client) {
            return {
              name: l2Chain.name,
              isOwnable: false,
              error: `Failed to create client for ${l2Chain.name}`,
            }
          }

          const ownerAddress = (await readContract(l2Client, {
            address: address as `0x${string}`,
            abi: ownableContractABI,
            functionName: 'owner',
            args: [],
          })) as `0x${string}`

          return { name: l2Chain.name, isOwnable: true }
        } catch (err) {
          return { name: l2Chain.name, isOwnable: false }
        }
      }),
    )

    // Update state based on results
    results.forEach((result) => {
      const l2Chain = l2Chains.find((chain) => chain.name === result.name)
      if (l2Chain) {
        l2Chain.setter(result.isOwnable)
      }
    })

  }

  const checkIfReverseClaimable = async (address: string) => {
    if (checkIfAddressEmpty(address) || !isAddressValid(address)) {
      setIsOwnable(false)
      setIsReverseClaimable(false)
      return
    }

    try {
      if (!walletClient || !walletAddress) {
        alert('Please connect your wallet first.')
        setLoading(false)
        return
      }
      const addrLabel = address.slice(2).toLowerCase()
      const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
      const resolvedAddr = (await readContract(walletClient, {
        address: config?.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'owner',
        args: [reversedNode],
      })) as `0x${string}`

      if (resolvedAddr.toLowerCase() === walletAddress.toLowerCase()) {
        setIsReverseClaimable(true)
      } else {
        setIsReverseClaimable(false)
      }

      setIsAddressInvalid(false)
      setError('')
    } catch (err) {
      setIsAddressEmpty(false)
      setIsAddressInvalid(false)
      setIsReverseClaimable(false)
    }
  }

  const recordExist = async (): Promise<boolean> => {
    if (!walletClient || !getParentNode(parentName)) return false
    try {
      const parentNode = getParentNode(parentName)

      return (await readContract(walletClient, {
        address: config?.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'recordExists',
        args: [parentNode],
      })) as boolean
    } catch (err) {
      return false
    }
  }

  const setPrimaryName = async () => {
    setError('')
    if (!walletClient || !walletAddress) return

    // In "use existing name" flow, validate that the name contains dots (full ENS name)
    if (selectedAction === 'pick') {
      const validationError = validateFullENSName(label)
      if (validationError) {
        setError(validationError)
        return
      }
    }

    // Force clear error for "Use Existing Name" flow
    if (selectedAction === 'pick') {
      setError('')
    }

    if (isUnsupportedL2Chain) {
      setError(
        `To name your contract on ${unsupportedL2Name}, change to the ${chain?.id === CHAINS.OPTIMISM || chain?.id === CHAINS.ARBITRUM || chain?.id === CHAINS.SCROLL || chain?.id === CHAINS.LINEA || chain?.id === CHAINS.BASE ? 'Ethereum Mainnet' : 'Sepolia'} network and use the Naming on L2 Chains option.`,
      )
      return
    }

    if (
      isBaseChain &&
      selectedAction === 'subname' &&
      baseRequiredParentDomain
    ) {
      const normalizedParent = parentName.trim().toLowerCase()
      const parentTwoLD = normalizedParent
        .split('.')
        .filter(Boolean)
        .slice(-2)
        .join('.')

      if (parentTwoLD !== baseRequiredParentDomain) {
        setError(
          `Parent domain must end with ${baseRequiredParentDomain} when using ${chain?.name ?? 'Base'}.`,
        )
        return
      }
    }

    if (!isAddressValid(existingContractAddress)) {
      setIsOwnable(false)
      return
    }

    await checkIfOwnable(existingContractAddress)
    await checkIfOwnableOnL2Chains(existingContractAddress)
    await checkIfReverseClaimable(existingContractAddress)

    if (!label.trim()) {
      setError('Label cannot be empty')
      return
    }

    // In "use existing name" flow, allow dots in label (full name is allowed)
    if (selectedAction !== 'pick' && label.includes('.')) {
      setError("Can't include '.' in label name")
      return
    }

    // Only require parentName for "Create New Name" flow
    if (selectedAction !== 'pick' && !parentName.trim()) {
      setError('Parent name cannot be empty')
      return
    }

    if (!config) {
      console.error('Unsupported network')
      setError('Unsupported network')
      return
    }

    try {
      setLoading(true)
      setError('')

      if (!walletClient) {
        alert('Please connect your wallet first.')
        setLoading(false)
        return
      }

      // Compute label/parent from inputs; in SLD mode the label contains the full name
      let labelNormalized: string
      let parentNameNormalized: string
      let name: string

      if (selectedAction === 'pick') {
        // Use Existing Name flow: label contains the full ENS name
        labelNormalized = normalize(label)
        parentNameNormalized = '' // Not used in this flow
        // Remove any trailing dots before normalizing
        const cleanedLabel = label.replace(/\.$/, '')
        name = normalize(cleanedLabel)
      } else {
        // Create New Name flow: construct from label and parent
        labelNormalized = normalize(label)
        parentNameNormalized = normalize(parentName)
        // Remove any trailing dots before constructing the name
        const constructedName =
          `${labelNormalized}.${parentNameNormalized}`.replace(/\.$/, '')
        name = normalize(constructedName)
      }
      const chainId = chain?.id!

      // Skip subname creation only when not in Create New Name flow
      const skipSubnameCreation = selectedAction !== 'subname'

      const parentNode =
        selectedAction === 'pick'
          ? getParentNode(name)
          : getParentNode(parentNameNormalized)
      // When a name is selected from dialog, use the full name directly
      const node = skipSubnameCreation
        ? namehash(label) // Use the full selected name
        : namehash(name) // Use the constructed name
      const labelHash =
        selectedAction === 'pick'
          ? keccak256(toBytes(name.split('.')[0])) // Extract label part from full name
          : keccak256(toBytes(labelNormalized))

      const nameExist = (await readContract(walletClient, {
        address: config.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'recordExists',
        args: [node],
      })) as boolean

      // Internal balance check for all selected L2 chains before creating any steps
      const l2ChainsForBalanceCheck: Array<{
        name: string
        chainId: number
        chain: any
      }> = []

      // Map selected chain names to their configurations
      const isL1Mainnet = chain?.id === CHAINS.MAINNET
      const chainConfigs = {
        Optimism: {
          chainId: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
          chain: isL1Mainnet ? optimism : optimismSepolia,
        },
        Arbitrum: {
          chainId: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
          chain: isL1Mainnet ? arbitrum : arbitrumSepolia,
        },
        Scroll: {
          chainId: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
          chain: isL1Mainnet ? scroll : scrollSepolia,
        },
        Base: {
          chainId: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
          chain: isL1Mainnet ? base : baseSepolia,
        },
        Linea: {
          chainId: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
          chain: isL1Mainnet ? linea : lineaSepolia,
        },
      }

      // Add selected chains to balance check
      for (const selectedChain of selectedL2ChainNames) {
        const config = chainConfigs[selectedChain as keyof typeof chainConfigs]
        if (config) {
          l2ChainsForBalanceCheck.push({
            name: selectedChain,
            chainId: config.chainId,
            chain: config.chain,
          })
        }
      }

      // Check balances on all selected L2 chains using RPC calls (in parallel)
      if (l2ChainsForBalanceCheck.length > 0) {

        type BalanceResult = { name: string; balance?: bigint; error?: string }

        const results: BalanceResult[] = await Promise.all(
          l2ChainsForBalanceCheck.map(async (l2Chain) => {
            try {
              const l2Config = CONTRACTS[l2Chain.chainId]
              if (!l2Config?.RPC_ENDPOINT) {
                return {
                  name: l2Chain.name,
                  error: `No RPC endpoint configured for ${l2Chain.name}`,
                }
              }

              const response = await fetch(l2Config.RPC_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  method: 'eth_getBalance',
                  params: [walletAddress, 'latest'],
                  id: l2Chain.chainId,
                }),
              })

              const data = await response.json()

              if (data?.error) {
                return {
                  name: l2Chain.name,
                  error: `Failed to get balance on ${l2Chain.name}: ${data.error.message}`,
                }
              }

              const balance = BigInt(data.result)
              return { name: l2Chain.name, balance }
            } catch (e: any) {
              return {
                name: l2Chain.name,
                error: `Failed to get balance on ${l2Chain.name}: ${e?.message || String(e)}`,
              }
            }
          }),
        )

        const insufficientBalanceChains = results
          .filter((r) => !r.error && r.balance === 0n)
          .map((r) => ({ name: r.name, balance: 0n as bigint }))

        const failures = results.filter((r) => r.error) as Array<{
          name: string
          error: string
        }>

        if (failures.length > 0) {
          const msg = failures.map((f) => `${f.name}: ${f.error}`).join(' | ')
          setError(`Balance check failed for some chains: ${msg}`)
          setLoading(false)
          return
        }

        if (insufficientBalanceChains.length > 0) {
          const chainDetails = insufficientBalanceChains
            .map((chain) => `${chain.name} chain: ${chain.balance} wei`)
            .join(', ')
          setError(
            `Insufficient balance on L2 chains: ${chainDetails}. Please add Eth to these chains before proceeding.`,
          )
          setLoading(false)
          return
        }

      }

      const steps: Step[] = []

      const publicResolverAddress = config.PUBLIC_RESOLVER! as `0x${string}`
      // try {
      //   publicResolverAddress = (await readContract(walletClient, {
      //     address: config.ENS_REGISTRY as `0x${string}`,
      //     abi: ensRegistryABI,
      //     functionName: 'resolver',
      //     args: [parentNode],
      //   })) as `0x${string}`
      // } catch (err) {
      //   console.log('err ' + err)
      //   setError('Failed to get public resolver')
      // }


      const txCost = (await readContract(walletClient, {
        address: config.ENSCRIBE_CONTRACT as `0x${string}`,
        abi: enscribeContractABI,
        functionName: 'pricing',
        args: [],
      })) as bigint


      const titleFirst =
        parentType === 'web3labs'
          ? skipL1Naming
            ? 'Create subname'
            : 'Set forward resolution'
          : 'Create subname'

      // chain selected is other than base/base-sepolia

      // Step 1: Create Subname (skip if using existing name)
      if (!skipSubnameCreation) {
        steps.push({
          title: titleFirst,
          chainId: chainId, // Add chainId for L1 transaction
          action: async () => {
            if (parentType === 'web3labs') {
              const currentAddr = (await readContract(walletClient, {
                address: publicResolverAddress,
                abi: publicResolverABI,
                functionName: 'addr',
                args: [node],
              })) as `0x${string}`

              if (
                currentAddr.toLowerCase() !==
                existingContractAddress.toLowerCase()
              ) {
                let txn

                if (isSafeWallet) {
                  await writeContract(walletClient, {
                    address: config.ENSCRIBE_CONTRACT as `0x${string}`,
                    abi: contractABI,
                    functionName: 'setName',
                    args: [
                      existingContractAddress,
                      labelNormalized,
                      parentNameNormalized,
                      parentNode,
                    ],
                    value: txCost,
                    account: walletAddress,
                  })
                  txn = 'safe wallet'
                } else {
                  txn = await writeContract(walletClient, {
                    address: config.ENSCRIBE_CONTRACT as `0x${string}`,
                    abi: contractABI,
                    functionName: 'setName',
                    args: [
                      existingContractAddress,
                      labelNormalized,
                      parentNameNormalized,
                      parentNode,
                    ],
                    value: txCost,
                    account: walletAddress,
                  })
                }

                if (!isTestNet(chainId)) {
                  try {
                    await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      existingContractAddress,
                      walletAddress,
                      name,
                      'subname::setName',
                      txn,
                      isOwnable ? 'Ownable' : 'ReverseClaimer',
                      opType,
                    )
                  } catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              } else {
                setError('Forward resolution already set')
              }
            } else if (chainId === CHAINS.BASE || chainId === CHAINS.BASE_SEPOLIA) {
              const ensRegistryAbi = parseAbi([
                'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
              ]);
              let txn = await writeContract(walletClient, {
                chain,
                address: config.ENS_REGISTRY as `0x${string}`,
                abi: ensRegistryAbi,
                functionName: 'setSubnodeRecord',
                args: [parentNode as `0x${string}`, labelHash, walletAddress as `0x${string}`, config.PUBLIC_RESOLVER as `0x${string}`, BigInt(0)],
                account: walletAddress
              });

              if (!isTestNet(chainId)) {
                try {
                  await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    existingContractAddress,
                    walletAddress,
                    name,
                    'subname::setSubnodeRecord',
                    txn,
                    isOwnable ? 'Ownable' : 'ReverseClaimer',
                    opType,
                  )
                } catch (err) {
                  setError('Failed to log metric')
                }
              }
              return txn
            } else {
              const isWrapped = await readContract(walletClient, {
                address: config.NAME_WRAPPER as `0x${string}`,
                abi: nameWrapperABI,
                functionName: 'isWrapped',
                args: [parentNode],
              })
              if (!nameExist) {
                if (isWrapped) {
                  let txn

                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setSubnodeRecord',
                      args: [
                        parentNode,
                        labelNormalized,
                        walletAddress,
                        publicResolverAddress,
                        0,
                        0,
                        0,
                      ],
                      account: walletAddress,
                    })
                    txn = 'safe wallet'
                  } else {
                    txn = await writeContract(walletClient, {
                      address: config.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setSubnodeRecord',
                      args: [
                        parentNode,
                        labelNormalized,
                        walletAddress,
                        publicResolverAddress,
                        0,
                        0,
                        0,
                      ],
                      account: walletAddress,
                    })
                  }

                  if (!isTestNet(chainId)) {
                    try {
                      await logMetric(
                        corelationId,
                        Date.now(),
                        chainId,
                        existingContractAddress,
                        walletAddress,
                        name,
                        'subname::setSubnodeRecord',
                        txn,
                        isOwnable ? 'Ownable' : 'ReverseClaimer',
                        opType,
                      )
                    } catch (err) {
                      setError('Failed to log metric')
                    }
                  }
                  return txn
                } else {
                  let txn

                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setSubnodeRecord',
                      args: [
                        parentNode,
                        labelHash,
                        walletAddress,
                        publicResolverAddress,
                        0,
                      ],
                      account: walletAddress,
                    })
                    txn = 'safe wallet'
                  } else {
                    txn = await writeContract(walletClient, {
                      address: config.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setSubnodeRecord',
                      args: [
                        parentNode,
                        labelHash,
                        walletAddress,
                        publicResolverAddress,
                        0,
                      ],
                      account: walletAddress,
                    })
                  }

                  if (!isTestNet(chainId)) {
                    try {
                      await logMetric(
                        corelationId,
                        Date.now(),
                        chainId,
                        existingContractAddress,
                        walletAddress,
                        name,
                        'subname::setSubnodeRecord',
                        txn,
                        isOwnable ? 'Ownable' : 'ReverseClaimer',
                        opType,
                      )
                    } catch (err) {
                      setError('Failed to log metric')
                    }
                  }
                  return txn
                }
              }
            }
          },
        })
      }

      // if trying to set resolutions for an existing name, check for a resolver address
      let resolverAddr = null;
      if (selectedAction === 'pick') { // setting forward resolution for a existing name
        resolverAddr = await readContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'resolver',
          args: [node],
        }) as `0x${string}`

        if (resolverAddr === '0x0000000000000000000000000000000000000000' || resolverAddr === null || resolverAddr === undefined) {
          setError('No resolver found for this name')
          return '';
        }
      } else { // setting forward resolution for a new name
        resolverAddr = publicResolverAddress;
      }


      // Step 2: Set Forward Resolution
      // For existing names, always set forward resolution (even for web3labs), since we skip subname creation.
      // For new names, set forward only if parentType is not 'web3labs'. If skipL1Naming, omit this.
      if (!skipL1Naming && (skipSubnameCreation || parentType != 'web3labs')) {
        steps.push({
          title: 'Set forward resolution',
          chainId: chainId, // Add chainId for L1 transaction
          action: async () => {
            let currentAddr = null;
            if (chainId === CHAINS.BASE || chainId === CHAINS.BASE_SEPOLIA) {
              currentAddr = await readContract(walletClient, {
                address: resolverAddr,
                abi: publicResolverABI,
                functionName: 'addr',
                args: [node, toCoinType(chainId)],
              }) as `0x${string}`
            } else {
              currentAddr = (await readContract(walletClient, {
                address: resolverAddr,
                abi: publicResolverABI,
                functionName: 'addr',
                args: [node],
              })) as `0x${string}`
            }

            if (currentAddr.toLowerCase() !== existingContractAddress.toLowerCase()) {
              let txn

              if (chainId === CHAINS.BASE || chainId === CHAINS.BASE_SEPOLIA) {
                const resolverAbi = parseAbi([
                  'function setAddr(bytes32 node, address a)',
                  'function setAddr(bytes32 node, uint256 coinType, bytes memory a)',
                ]);

                let txn = await writeContract(walletClient, {
                  chain,
                  address: config.PUBLIC_RESOLVER as `0x${string}`,
                  abi: resolverAbi,
                  functionName: 'setAddr',
                  args: [node, toCoinType(chainId), encodePacked(['address'], [existingContractAddress as `0x${string}`])],
                  account: walletAddress,
                });

                if (!isTestNet(chainId)) {
                  try {
                    await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      existingContractAddress,
                      walletAddress,
                      name,
                      'fwdres::setAddr',
                      txn,
                      isOwnable ? 'Ownable' : 'ReverseClaimer',
                      opType,
                    )
                  } catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              } else {
                if (isSafeWallet) {
                  await writeContract(walletClient, {
                    address: publicResolverAddress,
                    abi: publicResolverABI,
                    functionName: 'setAddr',
                    args: [node, existingContractAddress],
                    account: walletAddress,
                  })
                  txn = 'safe wallet'
                } else {
                  txn = await writeContract(walletClient, {
                    address: publicResolverAddress,
                    abi: publicResolverABI,
                    functionName: 'setAddr',
                    args: [node, existingContractAddress],
                    account: walletAddress,
                  })
                }

                if (!isTestNet(chainId)) {
                  try {
                    await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      existingContractAddress,
                      walletAddress,
                      name,
                      'fwdres::setAddr',
                      txn,
                      isOwnable ? 'Ownable' : 'ReverseClaimer',
                      opType,
                    )
                  } catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              }
            } else {
              setError('Forward resolution already set')
            }
          },
        })
      }

      // Step 3: Set Reverse Resolution (if Primary). If skipL1Naming, omit this.
      if (isContractOwner && isOwnable && !skipL1Naming) {
        setIsPrimaryNameSet(true)
        steps.push({
          title: 'Set reverse resolution',
          chainId: chainId, // Add chainId for L1 transaction
          action: async () => {
            let txn

            if (chainId === CHAINS.BASE || chainId === CHAINS.BASE_SEPOLIA) {
              // before setting the reverse resolution, we need to check if the name is already set
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

              const existingName = await readContract(walletClient, {
                address: config.L2_REVERSE_REGISTRAR as `0x${string}`,
                abi: nameForAddrABI,
                functionName: 'nameForAddr',
                args: [existingContractAddress as `0x${string}`],
              }) as string

              if (existingName.toLowerCase() === name.toLowerCase()) {
                setError('Reverse resolution already set')
                return '';
              }

              // name not set, so we can set the reverse resolution
              const reverseAbi = [
                // setNameForAddr(addr, owner, resolver, name)
                {
                  type: "function",
                  name: "setNameForAddr",
                  stateMutability: "nonpayable",
                  inputs: [
                    { name: "addr", type: "address" },
                    { name: "name", type: "string" },
                  ],
                  outputs: [],
                },
              ] as const;

              let txn = await writeContract(walletClient, {
                chain,
                address: config.L2_REVERSE_REGISTRAR as `0x${string}`,
                abi: reverseAbi,
                functionName: 'setNameForAddr',
                args: [existingContractAddress as `0x${string}`, name],
                account: walletAddress,
              })

              if (!isTestNet(chainId)) {
                try {
                  await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    existingContractAddress,
                    walletAddress,
                    name,
                    'revres::setNameForAddr',
                    txn,
                    'Ownable',
                    opType,
                  )
                } catch (err) {
                  setError('Failed to log metric')
                }
              }

              return txn
            } else {
              const existingEnsName = await getEnsName(walletClient, {address: existingContractAddress as `0x${string}`});
              if (existingEnsName && existingEnsName.toLowerCase() === name.toLowerCase()) {
                setError('Reverse resolution already set')
                return '';
              }

              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: config.REVERSE_REGISTRAR as `0x${string}`,
                  abi: reverseRegistrarABI,
                  functionName: 'setNameForAddr',
                  args: [
                    existingContractAddress,
                    walletAddress,
                    publicResolverAddress,
                    name,
                  ],
                  account: walletAddress,
                })
                txn = 'safe wallet'
              } else {
                txn = await writeContract(walletClient, {
                  address: config.REVERSE_REGISTRAR as `0x${string}`,
                  abi: reverseRegistrarABI,
                  functionName: 'setNameForAddr',
                  args: [
                    existingContractAddress,
                    walletAddress,
                    publicResolverAddress,
                    name,
                  ],
                  account: walletAddress,
                })
              }

              if (!isTestNet(chainId)) {
                try {
                  await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    existingContractAddress,
                    walletAddress,
                    name,
                    'revres::setNameForAddr',
                    txn,
                    'Ownable',
                    opType,
                  )
                } catch (err) {
                  setError('Failed to log metric')
                }
              }
              return txn
            }
          },
        })
      } else if (isReverseClaimable && !skipL1Naming) {
        setIsPrimaryNameSet(true)
        const addrLabel = existingContractAddress.slice(2).toLowerCase()
        const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
        steps.push({
          title: 'Set reverse resolution',
          chainId: chainId, // Add chainId for L1 transaction
          action: async () => {

            let txn

            if (isSafeWallet) {
              await writeContract(walletClient, {
                address: resolverAddr,
                abi: publicResolverABI,
                functionName: 'setName',
                args: [reversedNode, name],
                account: walletAddress,
              })
              txn = 'safe wallet'
            } else {
              txn = await writeContract(walletClient, {
                address: resolverAddr,
                abi: publicResolverABI,
                functionName: 'setName',
                args: [reversedNode, name],
                account: walletAddress,
              })
            }

            if (!isTestNet(chainId)) {
              try {
                await logMetric(
                  corelationId,
                  Date.now(),
                  chainId,
                  existingContractAddress,
                  walletAddress,
                  name,
                  'revres::setName',
                  txn,
                  'ReverseClaimer',
                  opType,
                )
              } catch (err) {
                setError('Failed to log metric')
              }
            }
            return txn
          },
        })
      } else {
        setIsPrimaryNameSet(false)
      }

      // Add L2 primary name steps for all selected chains
      const selectedL2Chains: Array<{
        name: string
        chainId: number
        chain: any
      }> = []

      // Map selected chain names to their configurations for steps
      const stepChainConfigs = {
        Optimism: {
          chainId: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
          chain: isL1Mainnet ? optimism : optimismSepolia,
        },
        Arbitrum: {
          chainId: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
          chain: isL1Mainnet ? arbitrum : arbitrumSepolia,
        },
        Scroll: {
          chainId: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
          chain: isL1Mainnet ? scroll : scrollSepolia,
        },
        Base: {
          chainId: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
          chain: isL1Mainnet ? base : baseSepolia,
        },
        Linea: {
          chainId: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
          chain: isL1Mainnet ? linea : lineaSepolia,
        },
      }

      // Add selected chains to steps
      for (const selectedChain of selectedL2ChainNames) {
        const config =
          stepChainConfigs[selectedChain as keyof typeof stepChainConfigs]
        if (config) {
          selectedL2Chains.push({ name: selectedChain, ...config })
        }
      }

      // Second: Add all L2 forward resolution steps (on current chain)
      for (const l2Chain of selectedL2Chains) {
        const l2Config = CONTRACTS[l2Chain.chainId]
        const coinType = Number(l2Config.COIN_TYPE || '60')

        if (l2Config && coinType) {
          // Add forward resolution step for this L2 chain
          steps.push({
            title: `Set forward resolution for ${l2Chain.name}`,
            chainId: chainId, // Add chainId for L1 transaction (forward resolution happens on L1)
            action: async () => {
              const currentAddr = (await readContract(walletClient, {
                address: publicResolverAddress,
                abi: publicResolverABI,
                functionName: 'addr',
                args: [node, coinType],
              })) as `0x${string}`

              if (
                currentAddr.toLowerCase() !==
                existingContractAddress.toLowerCase()
              ) {
                let txn
                if (isSafeWallet) {
                  writeContract(walletClient, {
                    address: publicResolverAddress,
                    abi: publicResolverABI,
                    functionName: 'setAddr',
                    args: [node, coinType, existingContractAddress],
                    account: walletAddress,
                  })
                  txn = 'safe wallet'
                } else {
                  txn = await writeContract(walletClient, {
                    address: publicResolverAddress,
                    abi: publicResolverABI,
                    functionName: 'setAddr',
                    args: [node, coinType, existingContractAddress],
                    account: walletAddress,
                  })
                }

                if (!isTestNet(chainId)) {
                  try {
                    await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      existingContractAddress,
                      walletAddress,
                      name,
                      'fwdres::setAddr',
                      txn,
                      isOwnable ? 'Ownable' : 'ReverseClaimer',
                      opType,
                    )
                  } catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              } else {
                setError('Forward resolution already set on this chain')
              }
            },
          })
        } else {
          console.error(`${l2Chain.name} configuration missing:`, {
            hasConfig: !!l2Config,
            config: l2Config,
          })
        }
      }

      // Then: Add L2 primary naming steps (switch to each chain, then proceed)
      for (const l2Chain of selectedL2Chains) {
        const l2Config = CONTRACTS[l2Chain.chainId]

        // Check if contract is ownable on this specific L2 chain
        let isOwnableOnThisL2Chain = false
        switch (l2Chain.name) {
          case 'Optimism':
            isOwnableOnThisL2Chain = isOwnableOptimism === true
            break
          case 'Arbitrum':
            isOwnableOnThisL2Chain = isOwnableArbitrum === true
            break
          case 'Scroll':
            isOwnableOnThisL2Chain = isOwnableScroll === true
            break
          case 'Base':
            isOwnableOnThisL2Chain = isOwnableBase === true
            break
          case 'Linea':
            isOwnableOnThisL2Chain = isOwnableLinea === true
            break
          default:
            isOwnableOnThisL2Chain = false
        }

        // Only add L2 primary name step if contract is ownable on this L2 chain
        if (
          l2Config &&
          l2Config.L2_REVERSE_REGISTRAR &&
          isOwnableOnThisL2Chain
        ) {
          setIsPrimaryNameSet(true)
          // Add reverse resolution step for this L2 chain
          steps.push({
            title: `Switch to ${l2Chain.name} and set L2 primary name`,
            chainId: l2Chain.chainId, // Add chainId for L2 transaction
            action: async () => {


              // Switch to L2 chain
              await switchChain({ chainId: l2Chain.chainId })

              // Wait a moment for the chain switch to complete
              await new Promise((resolve) => setTimeout(resolve, 3000))

              // Wait for the chain to actually change
              let attempts = 0
              while (attempts < 10) {
                const currentChain = await walletClient.getChainId()
                if (currentChain === l2Chain.chainId) {
                  break
                }
                await new Promise((resolve) => setTimeout(resolve, 1000))
                attempts++
              }

              if (attempts >= 10) {
                throw new Error(
                  `Chain switch timeout - chain did not change to ${l2Chain.name}`,
                )
              }

              // Now execute the reverse resolution transaction on L2

              // Perform reverse resolution on L2
              let txn
              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: l2Config.L2_REVERSE_REGISTRAR as `0x${string}`,
                  abi: [
                    {
                      inputs: [
                        {
                          internalType: 'address',
                          name: 'addr',
                          type: 'address',
                        },
                        {
                          internalType: 'string',
                          name: 'name',
                          type: 'string',
                        },
                      ],
                      name: 'setNameForAddr',
                      outputs: [],
                      stateMutability: 'nonpayable',
                      type: 'function',
                    },
                  ],
                  functionName: 'setNameForAddr',
                  args: [
                    existingContractAddress as `0x${string}`,
                    skipSubnameCreation ? label : name,
                  ],
                  account: walletAddress,
                  chain: l2Chain.chain,
                })
                txn = 'safe wallet'

              } else {
                txn = await writeContract(walletClient, {
                  address: l2Config.L2_REVERSE_REGISTRAR as `0x${string}`,
                  abi: [
                    {
                      inputs: [
                        {
                          internalType: 'address',
                          name: 'addr',
                          type: 'address',
                        },
                        {
                          internalType: 'string',
                          name: 'name',
                          type: 'string',
                        },
                      ],
                      name: 'setNameForAddr',
                      outputs: [],
                      stateMutability: 'nonpayable',
                      type: 'function',
                    },
                  ],
                  functionName: 'setNameForAddr',
                  args: [existingContractAddress as `0x${string}`, name],
                  account: walletAddress,
                  chain: l2Chain.chain,
                })
              }


              // Log the L2 transaction
              if (!isTestNet(l2Chain.chainId)) {
                try {
                  await logMetric(
                    `${l2Chain.name.toLowerCase()}-l2-primary`, // correlationId
                    Date.now(),
                    l2Chain.chainId,
                    existingContractAddress,
                    walletAddress,
                    skipSubnameCreation ? label : name,
                    'revres::setNameForAddr',
                    txn,
                    'L2Primary',
                    opType,
                  )
                } catch (err) {
                  setError('Failed to log metric')
                }
              }

              return txn
            },
          })
        } else {
          console.error(
            `${l2Chain.name} configuration missing or contract not ownable:`,
            {
              hasConfig: !!l2Config,
              hasReverseRegistrar: !!l2Config?.L2_REVERSE_REGISTRAR,
              config: l2Config,
            },
          )
        }
      }

      setModalTitle(
        (isContractOwner && isOwnable) || isReverseClaimable
          ? 'Set Primary Name'
          : 'Set Forward Resolution',
      )
      setModalSubtitle(
        isSafeWallet
          ? 'Transactions will be executed in your Safe wallet app'
          : 'Running each step to finish naming this contract',
      )
      setModalSteps(steps)
      setModalOpen(true)
    } catch (err: any) {
      console.error(err)
      setError(err?.code || 'Error naming exisiting contract')
    } finally {
      setLoading(false)
    }
  }

  return {
    // Hook instances
    router,
    searchParams,
    toast,
    walletClient,
    switchChain,
    chain,
    walletAddress,
    isConnected,
    config,
    enscribeDomain,
    isSafeWallet,
    copied,
    copyToClipboard,
    resetCopied,

    // State variables
    existingContractAddress,
    setExistingContractAddress,
    label,
    setLabel,
    parentType,
    setParentType,
    showRegisterDialog,
    setShowRegisterDialog,
    parentName,
    setParentName,
    fetchingENS,
    setFetchingENS,
    userOwnedDomains,
    setUserOwnedDomains,
    showENSModal,
    setShowENSModal,
    error,
    setError,
    loading,
    setLoading,
    isAddressEmpty,
    setIsAddressEmpty,
    isAddressInvalid,
    setIsAddressInvalid,
    isContractExists,
    setIsContractExists,
    isOwnable,
    setIsOwnable,
    isContractOwner,
    setIsContractOwner,
    isReverseClaimable,
    setIsReverseClaimable,
    isPrimaryNameSet,
    setIsPrimaryNameSet,
    isOwnableOptimism,
    setIsOwnableOptimism,
    isOwnableArbitrum,
    setIsOwnableArbitrum,
    isOwnableScroll,
    setIsOwnableScroll,
    isOwnableBase,
    setIsOwnableBase,
    isOwnableLinea,
    setIsOwnableLinea,
    modalOpen,
    setModalOpen,
    modalSteps,
    setModalSteps,
    modalTitle,
    setModalTitle,
    modalSubtitle,
    setModalSubtitle,
    selectedL2ChainNames,
    setSelectedL2ChainNames,
    dropdownValue,
    setDropdownValue,
    skipL1Naming,
    setSkipL1Naming,
    showL2Modal,
    setShowL2Modal,
    sldAsPrimary,
    setSldAsPrimary,
    ensModalFromPicker,
    setEnsModalFromPicker,
    ensNameChosen,
    setEnsNameChosen,
    selectedAction,
    setSelectedAction,
    isAdvancedOpen,
    setIsAdvancedOpen,
    callDataList,
    setCallDataList,
    allCallData,
    setAllCallData,
    isCallDataOpen,
    setIsCallDataOpen,

    // Derived constants
    corelationId,
    opType,
    L2_CHAIN_OPTIONS,
    isUnsupportedL2Chain,
    isBaseChain,
    baseRequiredParentDomain,
    unsupportedL2Name,

    // Functions
    populateName,
    validateFullENSName,
    generateCallData,
    fetchUserOwnedDomains,
    checkENSReverseResolution,
    isEmpty,
    checkIfAddressEmpty,
    isAddressValid,
    checkIfContractExists,
    checkIfContractOwner,
    checkIfOwnable,
    checkIfOwnableOnL2Chains,
    checkIfReverseClaimable,
    recordExist,
    setPrimaryName,
  }
}
