import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { Button } from '@/components/ui/button'
import { checkIfSafe } from '@/components/componentUtils'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { CONTRACTS, CHAINS } from '../utils/constants'
import { L2_CHAIN_NAMES } from '@/lib/chains'
import { isAddress, encodeFunctionData, namehash, createPublicClient, http } from 'viem'
import { readContract, writeContract, waitForTransactionReceipt } from 'viem/actions'
import * as chains from 'viem/chains'
import { X, Copy, Check, Info, ChevronDown, ChevronRight } from 'lucide-react'
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
import { ENSDomainSelectionModal } from '@/components/naming/ENSDomainSelectionModal'
import { L2ChainPickerDialog } from '@/components/naming/L2ChainPickerDialog'
import { CallDataPanel } from '@/components/naming/CallDataPanel'
import { BatchEntryRow } from '@/components/naming/BatchEntryRow'

interface BatchEntry {
  id: string
  address: string
  label: string
  addressError?: string
  labelError?: string
}


const L2_CHAIN_OPTIONS = L2_CHAIN_NAMES

export default function BatchNamingForm() {
  const { address: walletAddress, isConnected, chain, connector } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()
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
  const [focusedInputId, setFocusedInputId] = useState<string | null>(null)
  const addressInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({})
  const [shouldTruncateAddress, setShouldTruncateAddress] = useState<{ [key: string]: boolean }>({})
  const [truncatedAddresses, setTruncatedAddresses] = useState<{ [key: string]: string }>({})
  const [isSafeWallet, setIsSafeWallet] = useState(false)

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
    const newEntry = { id: Date.now().toString(), address: '', label: '' }
    // Add new entry at the end, it will be sorted if needed
    setBatchEntries([...batchEntries, newEntry])
  }

  const validateAddress = (address: string): string | undefined => {
    if (!address || address.trim() === '') {
      return undefined // Empty is OK, will be caught when submitting
    }
    if (!isAddress(address)) {
      return 'Invalid contract address'
    }
    return undefined
  }

  const validateLabel = (label: string, parentDomain: string): string | undefined => {
    if (!label || label.trim() === '') {
      return undefined // Empty is OK, will be caught when submitting
    }
    
    if (!parentDomain || parentDomain.trim() === '') {
      return 'Please enter parent domain first'
    }

    // Check if label contains dots (meaning it might include parent)
    if (label.includes('.')) {
      // Full ENS name provided, validate that it ends with the parent domain
      const normalizedLabel = label.toLowerCase().trim()
      const normalizedParent = parentDomain.toLowerCase().trim()
      
      // Check if the label ends with .parentDomain
      if (!normalizedLabel.endsWith(`.${normalizedParent}`)) {
        return `Parent name doesn't match. Expected: ${parentDomain}`
      }
      
      // Check that there's at least one label before the parent
      const labelWithoutParent = normalizedLabel.slice(0, -(normalizedParent.length + 1))
      if (!labelWithoutParent || labelWithoutParent.trim() === '') {
        return 'Invalid ENS name format'
      }
    }
    
    return undefined
  }

  const checkIfAddressNeedsTruncation = useCallback((id: string, address: string) => {
    const input = addressInputRefs.current[id]
    if (!input || !address) {
      setShouldTruncateAddress((prev) => ({ ...prev, [id]: false }))
      setTruncatedAddresses((prev) => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      })
      return
    }

    const containerWidth = input.offsetWidth - 32 // Account for padding (16px each side)
    const last4Chars = address.slice(-4)
    const ellipsis = '...'

    // Create a temporary span to measure text width
    const measureSpan = document.createElement('span')
    measureSpan.style.visibility = 'hidden'
    measureSpan.style.position = 'absolute'
    measureSpan.style.fontSize = window.getComputedStyle(input).fontSize
    measureSpan.style.fontFamily = window.getComputedStyle(input).fontFamily
    measureSpan.style.fontWeight = window.getComputedStyle(input).fontWeight
    measureSpan.style.padding = '0'
    measureSpan.style.border = '0'
    measureSpan.style.whiteSpace = 'nowrap'
    
    // Measure full address width
    measureSpan.textContent = address
    document.body.appendChild(measureSpan)
    const fullTextWidth = measureSpan.offsetWidth

    // Measure ellipsis + last 4 chars width
    measureSpan.textContent = ellipsis + last4Chars
    const suffixWidth = measureSpan.offsetWidth

    document.body.removeChild(measureSpan)

    if (fullTextWidth <= containerWidth) {
      // Full address fits, no truncation needed
      setShouldTruncateAddress((prev) => ({ ...prev, [id]: false }))
      setTruncatedAddresses((prev) => {
        const newState = { ...prev }
        delete newState[id]
        return newState
      })
      return
    }

    // Need truncation - calculate how many chars from start can fit
    const availableWidth = containerWidth - suffixWidth
    let startChars = ''
    let startCharsWidth = 0
    let charIndex = 0

    // Binary search or linear search to find max chars that fit
    while (charIndex < address.length - 4) {
      const testChars = address.slice(0, charIndex + 1)
      measureSpan.textContent = testChars
      document.body.appendChild(measureSpan)
      const testWidth = measureSpan.offsetWidth
      document.body.removeChild(measureSpan)

      if (testWidth <= availableWidth) {
        startChars = testChars
        startCharsWidth = testWidth
        charIndex++
      } else {
        break
      }
    }

    const truncated = startChars + ellipsis + last4Chars
    setShouldTruncateAddress((prev) => ({ ...prev, [id]: true }))
    setTruncatedAddresses((prev) => ({ ...prev, [id]: truncated }))
  }, [])

  const updateEntry = (id: string, field: 'address' | 'label', value: string) => {
    setBatchEntries(
      batchEntries.map((entry) => {
        if (entry.id === id) {
          const updatedEntry = { ...entry, [field]: value }
          
          // Validate the field
          if (field === 'address') {
            updatedEntry.addressError = validateAddress(value)
            
            // Check for duplicate addresses (skip zero addresses and empty)
            if (value && value !== '0x0000000000000000000000000000000000000000' && value !== '0x0') {
              const duplicateAddress = batchEntries.find(
                (e) => e.id !== id && 
                e.address.toLowerCase() === value.toLowerCase() &&
                !e.id.startsWith('zero-')
              )
              if (duplicateAddress) {
                updatedEntry.addressError = 'Duplicate address'
              }
            }
            
            // Check if truncation is needed
            setTimeout(() => checkIfAddressNeedsTruncation(id, value), 0)
          } else if (field === 'label') {
            updatedEntry.labelError = validateLabel(value, parentName)
            
            // Check for duplicate labels
            if (value) {
              const normalizedValue = value.toLowerCase().trim()
              const duplicateLabel = batchEntries.find(
                (e) => e.id !== id && 
                e.label.toLowerCase().trim() === normalizedValue &&
                !e.id.startsWith('zero-')
              )
              if (duplicateLabel) {
                updatedEntry.labelError = 'Duplicate name'
              }
            }
          }
          
          return updatedEntry
        }
        return entry
      })
    )
  }

  // Re-validate all labels when parent name changes
  useEffect(() => {
    if (parentName) {
      setBatchEntries((entries) =>
        entries.map((entry) => ({
          ...entry,
          labelError: validateLabel(entry.label, parentName),
        }))
      )
    }
  }, [parentName])

  // Auto-sort entries and add missing parent subdomains with zero addresses
  useEffect(() => {
    if (!parentName) return

    // Separate entries into categories
    const userEntries = batchEntries.filter(
      (e) => (e.address || e.label) && !e.id.startsWith('zero-')
    )
    
    // Only process if there are user entries
    if (userEntries.length > 0) {
      // Use a timer to avoid processing on every keystroke (shorter debounce for better UX)
      const timer = setTimeout(() => {
        const allNames = new Map<string, BatchEntry>()
        
        // Track valid entries (no errors) for parent subdomain calculation
        const validEntriesForParents = userEntries.filter(
          (e) => e.address && e.label && !e.addressError && !e.labelError
        )
        
        // Add valid entries to the map for parent calculation
        validEntriesForParents.forEach((entry) => {
          let fullName = entry.label
          if (!entry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
            fullName = `${entry.label}.${parentName}`
          }
          allNames.set(fullName, entry)
        })

        // Find all required parent subdomains (only from valid entries)
        const requiredParents = new Set<string>()
        allNames.forEach((entry, name) => {
          const parts = name.split('.')
          const parentParts = parentName.split('.')
          // Check all intermediate parents
          for (let i = 1; i < parts.length - parentParts.length; i++) {
            const parentSubdomain = parts.slice(i).join('.')
            if (parentSubdomain !== parentName && !allNames.has(parentSubdomain)) {
              requiredParents.add(parentSubdomain)
            }
          }
        })

        // Create zero-address entries for missing parents
        const zeroAddressEntries: BatchEntry[] = []
        requiredParents.forEach((parentSubdomain) => {
          zeroAddressEntries.push({
            id: `zero-${parentSubdomain}-${Date.now()}`,
            address: '0x0000000000000000000000000000000000000000',
            label: parentSubdomain,
          })
        })

        // Combine ALL user entries (including ones with errors) with zero-address entries
        const emptyEntries = batchEntries.filter((e) => !e.address && !e.label)
        const allEntries = [...userEntries, ...zeroAddressEntries, ...emptyEntries]
        
        // Sort all entries by batch logic
        const sortedEntries = sortEntriesByBatchLogic(allEntries, parentName)
        
        // Only update if content changed
        const contentChanged = 
          sortedEntries.length !== batchEntries.length ||
          sortedEntries.some((entry, index) => entry.id !== batchEntries[index]?.id)
        
        if (contentChanged) {
          setBatchEntries(sortedEntries)
        }
      }, 300) // Wait 300ms after last change for better responsiveness

      return () => clearTimeout(timer)
    }
  }, [batchEntries, parentName])

  // Re-check truncation when window resizes
  useEffect(() => {
    const handleResize = () => {
      batchEntries.forEach((entry) => {
        if (entry.address) {
          checkIfAddressNeedsTruncation(entry.id, entry.address)
        }
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [batchEntries, checkIfAddressNeedsTruncation])

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
    const parent = parentName || 'yourdomain.eth'
    const csvContent = `address,name\n0x1234567890123456789012345678901234567890,mycontract.${parent}\n0x0987654321098765432109876543210987654321,anothercontract.${parent}`
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

  // Check if there are any validation errors
  const hasValidationErrors = (): boolean => {
    return batchEntries.some((entry) => entry.addressError || entry.labelError)
  }

  /**
   * Sort batch entries by batch logic (same order as transaction batches)
   */
  const sortEntriesByBatchLogic = (entries: BatchEntry[], parent: string): BatchEntry[] => {
    if (!parent || entries.length === 0) {
      return entries
    }

    // Create a temporary structure to calculate sort order
    const entriesWithMetadata = entries.map((entry) => {
      let fullName = entry.label
      if (entry.label && !entry.label.toLowerCase().endsWith(`.${parent.toLowerCase()}`)) {
        fullName = `${entry.label}.${parent}`
      }

      const parts = fullName.split('.')
      const parentParts = parent.split('.')
      const level = parts.length - parentParts.length

      // Get immediate parent
      let immediateParent: string
      if (level === 1) {
        immediateParent = parent
      } else {
        immediateParent = parts.slice(1).join('.')
      }

      return {
        entry,
        fullName,
        level,
        immediateParent,
      }
    })

    // Sort by: level (ascending), then immediate parent (alphabetically), then full name (alphabetically)
    entriesWithMetadata.sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level
      }
      if (a.immediateParent !== b.immediateParent) {
        return a.immediateParent.localeCompare(b.immediateParent)
      }
      return a.fullName.localeCompare(b.fullName)
    })

    return entriesWithMetadata.map((item) => item.entry)
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

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim()
          if (!line) continue

          const parts = line.split(',').map((part) => part.trim().replace(/^"|"$/g, ''))
          if (parts.length >= 2) {
            const address = parts[0]
            const fullName = parts[1]

            // Validate address
            const addressError = validateAddress(address)
            
            // Keep full name (don't strip parent)
            const labelError = validateLabel(fullName, parentName)

            newEntries.push({
              id: `${Date.now()}-${i}`,
              address,
              label: fullName, // Keep full name
              addressError,
              labelError,
            })
          }
        }

        const existingEntries = batchEntries.filter((e) => e.address || e.label)
        const combinedEntries = [...existingEntries, ...newEntries]
        
        // Set entries - they will be auto-sorted by the useEffect
        setBatchEntries(combinedEntries)
        
        const errorCount = newEntries.filter(
          (e) => e.addressError || e.labelError
        ).length
        
        if (errorCount > 0) {
          toast({
            title: 'CSV Imported with Errors',
            description: `Imported ${newEntries.length} entries, ${errorCount} with validation errors`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'CSV Imported',
            description: `Successfully imported ${newEntries.length} entries`,
          })
        }
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
      (e: BatchEntry) => e.address && e.label && isAddress(e.address)
    )

    if (validEntries.length === 0) {
      setCallDataList([])
      return
    }

    const batchGroups = processAndGroupEntriesForBatching(validEntries, parentName)
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

      // Only add approval call data if ENSCRIBE_V2_CONTRACT is available
      if (config.ENSCRIBE_V2_CONTRACT) {
        const approvalCallData = encodeFunctionData({
          abi: isWrapped ? nameWrapperABI : ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_V2_CONTRACT, true],
        })
        callDataArray.push(
          `${isWrapped ? 'NameWrapper' : 'ENSRegistry'}.setApprovalForAll (grant): ${approvalCallData}`
        )
      }

      // 2. Batch naming (multiple batches)
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

      // Generate call data for each batch
      batchGroups.forEach((batch, index) => {
        const labels = batch.entries.map((e: BatchEntry) => {
          const fullName = e.label
          const parentSuffix = `.${batch.parentName}`
          if (fullName.endsWith(parentSuffix)) {
            return fullName.slice(0, -parentSuffix.length)
          }
          return fullName
        })
        const addresses = batch.entries.map((e: BatchEntry) => e.address as `0x${string}`)

        let batchCallData
        if (uniqueCoinTypes.length === 1 && uniqueCoinTypes[0] === 60n) {
          batchCallData = encodeFunctionData({
            abi: enscribeV2ContractABI,
            functionName: 'setNameBatch',
            args: [addresses, labels, batch.parentName],
          })
        } else {
          batchCallData = encodeFunctionData({
            abi: enscribeV2ContractABI,
            functionName: 'setNameBatch',
            args: [addresses, labels, batch.parentName, uniqueCoinTypes],
          })
        }
        const levelSuffix = batch.level === 1 ? '3LD' : batch.level === 2 ? '4LD' : batch.level === 3 ? '5LD' : `${batch.level + 2}LD`
        callDataArray.push(`Enscribe.setNameBatch [${levelSuffix} under ${batch.parentName}]: ${batchCallData}`)
      })

      // 3. Reverse resolution (if applicable)
      // Flatten all entries from all batches
      const allEntries: BatchEntry[] = []
      batchGroups.forEach((batch) => {
        allEntries.push(...batch.entries)
      })

      if (!skipL1Naming) {
        for (const entry of allEntries) {
          // Skip zero addresses (normalize to full address format)
          const normalizedAddress = entry.address.toLowerCase().padEnd(42, '0')
          if (
            normalizedAddress === '0x0000000000000000000000000000000000000000' ||
            entry.address.toLowerCase() === '0x0' ||
            entry.address === ''
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
      // Only add revoke call data if ENSCRIBE_V2_CONTRACT is available
      if (config.ENSCRIBE_V2_CONTRACT) {
        const revokeCallData = encodeFunctionData({
          abi: isWrapped ? nameWrapperABI : ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_V2_CONTRACT, false],
        })
        callDataArray.push(
          `${isWrapped ? 'NameWrapper' : 'ENSRegistry'}.setApprovalForAll (revoke): ${revokeCallData}`
        )
      }

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

      return true
    } catch (err) {
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
      
      return ownerAddress.toLowerCase() === walletAddress.toLowerCase()
    } catch (err) {
      const addrLabel = contractAddress.slice(2).toLowerCase()
      const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
      
      try {
        const resolvedAddr = (await readContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'owner',
          args: [reversedNode],
        })) as string

        return resolvedAddr.toLowerCase() === walletAddress.toLowerCase()
      } catch (error) {
        return false
      }
    }
  }

  const checkIfReverseClaimable = async (
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
      const addrLabel = contractAddress.slice(2).toLowerCase()
      const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
      const resolvedAddr = (await readContract(walletClient, {
        address: config.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'owner',
        args: [reversedNode],
      })) as `0x${string}`

      return resolvedAddr.toLowerCase() === walletAddress.toLowerCase()
    } catch (err) {
      return false
    }
  }

  /**
   * Check if a contract is ownable on a specific L2 chain
   */
  const checkIfOwnableOnL2 = async (
    contractAddress: string,
    l2ChainId: number
  ): Promise<boolean> => {
    if (
      checkIfAddressEmpty(contractAddress) ||
      !isAddressValidCheck(contractAddress)
    ) {
      return false
    }

    try {
      // Get the viem chain object for the L2
      let viemChain
      switch (l2ChainId) {
        case CHAINS.OPTIMISM:
          viemChain = chains.optimism
          break
        case CHAINS.OPTIMISM_SEPOLIA:
          viemChain = chains.optimismSepolia
          break
        case CHAINS.ARBITRUM:
          viemChain = chains.arbitrum
          break
        case CHAINS.ARBITRUM_SEPOLIA:
          viemChain = chains.arbitrumSepolia
          break
        case CHAINS.SCROLL:
          viemChain = chains.scroll
          break
        case CHAINS.SCROLL_SEPOLIA:
          viemChain = chains.scrollSepolia
          break
        case CHAINS.BASE:
          viemChain = chains.base
          break
        case CHAINS.BASE_SEPOLIA:
          viemChain = chains.baseSepolia
          break
        case CHAINS.LINEA:
          viemChain = chains.linea
          break
        case CHAINS.LINEA_SEPOLIA:
          viemChain = chains.lineaSepolia
          break
        default:
          console.error(`Unknown chain ID: ${l2ChainId}`)
          return false
      }

      // Create a public client for the L2 chain
      const chainConfig = CONTRACTS[l2ChainId]
      const l2PublicClient = createPublicClient({
        chain: viemChain,
        transport: http(chainConfig.RPC_ENDPOINT),
      })

      // Try to read the owner from the contract on L2
      const ownerAddress = (await readContract(l2PublicClient, {
        address: contractAddress as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
        args: [],
      })) as `0x${string}`

      return true
    } catch (err) {
      return false
    }
  }

  /**
   * Check if wallet is the owner of a contract on a specific L2 chain
   */
  const checkIfContractOwnerOnL2 = async (
    contractAddress: string,
    l2ChainId: number
  ): Promise<boolean> => {
    if (
      checkIfAddressEmpty(contractAddress) ||
      !isAddressValidCheck(contractAddress) ||
      !walletAddress
    ) {
      return false
    }

    try {
      // Get the viem chain object for the L2
      let viemChain
      switch (l2ChainId) {
        case CHAINS.OPTIMISM:
          viemChain = chains.optimism
          break
        case CHAINS.OPTIMISM_SEPOLIA:
          viemChain = chains.optimismSepolia
          break
        case CHAINS.ARBITRUM:
          viemChain = chains.arbitrum
          break
        case CHAINS.ARBITRUM_SEPOLIA:
          viemChain = chains.arbitrumSepolia
          break
        case CHAINS.SCROLL:
          viemChain = chains.scroll
          break
        case CHAINS.SCROLL_SEPOLIA:
          viemChain = chains.scrollSepolia
          break
        case CHAINS.BASE:
          viemChain = chains.base
          break
        case CHAINS.BASE_SEPOLIA:
          viemChain = chains.baseSepolia
          break
        case CHAINS.LINEA:
          viemChain = chains.linea
          break
        case CHAINS.LINEA_SEPOLIA:
          viemChain = chains.lineaSepolia
          break
        default:
          console.error(`Unknown chain ID: ${l2ChainId}`)
          return false
      }

      // Create a public client for the L2 chain
      const chainConfig = CONTRACTS[l2ChainId]
      const l2PublicClient = createPublicClient({
        chain: viemChain,
        transport: http(chainConfig.RPC_ENDPOINT),
      })

      // Try to read the owner from the contract on L2
      const ownerAddress = (await readContract(l2PublicClient, {
        address: contractAddress as `0x${string}`,
        abi: ownableContractABI,
        functionName: 'owner',
        args: [],
      })) as `0x${string}`


      return ownerAddress.toLowerCase() === walletAddress.toLowerCase()
    } catch (err) {
      return false
    }
  }

  const checkIfSafeWallet = async (): Promise<boolean> => {
    return await checkIfSafe(connector)
  }

  const grantOperatorAccess = async (): Promise<`0x${string}` | undefined> => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_V2_CONTRACT ||
      !getParentNode(parentName)
    ) {
      return
    }

    try {
      const parentNode = getParentNode(parentName)
      let tx: `0x${string}`
      const safeCheck = await checkIfSafeWallet()
      
      if (chain?.id === CHAINS.BASE || chain?.id === CHAINS.BASE_SEPOLIA) {
        tx = await writeContract(walletClient, {
          chain,
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_V2_CONTRACT, true],
          account: walletAddress,
        })

        if (!safeCheck) {
          await waitForTransactionReceipt(walletClient, { hash: tx })
        }
      } else {
        const isWrapped = (await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })) as boolean

        tx = isWrapped
          ? await writeContract(walletClient, {
              chain,
              address: config.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_V2_CONTRACT, true],
              account: walletAddress,
            })
          : await writeContract(walletClient, {
              chain,
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_V2_CONTRACT, true],
              account: walletAddress,
            })

        if (!safeCheck) {
          await waitForTransactionReceipt(walletClient, { hash: tx })
        }
      }

      return tx
    } catch (err) {
      console.error('Error granting operator access:', err)
      throw err
    }
  }

  const revokeOperatorAccess = async (): Promise<`0x${string}` | undefined> => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_V2_CONTRACT ||
      !getParentNode(parentName)
    ) {
      return
    }

    try {
      const parentNode = getParentNode(parentName)
      let tx: `0x${string}`
      const safeCheck = await checkIfSafeWallet()

      if (chain?.id === CHAINS.BASE || chain?.id === CHAINS.BASE_SEPOLIA) {
        tx = await writeContract(walletClient, {
          chain,
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'setApprovalForAll',
          args: [config.ENSCRIBE_V2_CONTRACT, false],
          account: walletAddress,
        })

        if (!safeCheck) {
          await waitForTransactionReceipt(walletClient, { hash: tx })
        }
      } else {
        const isWrapped = (await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })) as boolean

        tx = isWrapped
          ? await writeContract(walletClient, {
              chain,
              address: config.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_V2_CONTRACT, false],
              account: walletAddress,
            })
          : await writeContract(walletClient, {
              chain,
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_V2_CONTRACT, false],
              account: walletAddress,
            })

        if (!safeCheck) {
          await waitForTransactionReceipt(walletClient, { hash: tx })
        }
      }

      return tx
    } catch (err) {
      console.error('Error revoking operator access:', err)
      throw err
    }
  }

  const checkOperatorAccess = async (name: string): Promise<boolean> => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_V2_CONTRACT ||
      !name
    )
      return false

    try {

      const parentNode = getParentNode(name)

      if (chain?.id == CHAINS.BASE || chain?.id == CHAINS.BASE_SEPOLIA) {
        return (await readContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'isApprovedForAll',
          args: [walletAddress, config.ENSCRIBE_V2_CONTRACT],
        })) as boolean
      } else {
        const isWrapped = (await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })) as boolean
        if (isWrapped) {
          // Wrapped Names
          return (await readContract(walletClient, {
            address: config.NAME_WRAPPER as `0x${string}`,
            abi: nameWrapperABI,
            functionName: 'isApprovedForAll',
            args: [walletAddress, config.ENSCRIBE_V2_CONTRACT],
          })) as boolean
        } else {
          //Unwrapped Names
          return (await readContract(walletClient, {
            address: config.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'isApprovedForAll',
            args: [walletAddress, config.ENSCRIBE_V2_CONTRACT],
          })) as boolean
        }
      }
    } catch (err) {
      console.error('Approval check failed:', err)
      return false
    }
  }

  /**
   * Process entries and group them into batches by level and parent
   * Each batch contains entries at the same level under the same parent
   */
  const processAndGroupEntriesForBatching = (
    entries: BatchEntry[],
    rootParent: string
  ): Array<{
    parentName: string
    entries: BatchEntry[]
    level: number
  }> => {
    const allNames = new Map<string, BatchEntry>() // fullName -> entry

    // Build full names for each entry
    entries.forEach((entry) => {
      if (entry.address && entry.label) {
        let fullName: string
        if (entry.label.toLowerCase().endsWith(`.${rootParent.toLowerCase()}`)) {
          fullName = entry.label
        } else {
          fullName = `${entry.label}.${rootParent}`
        }
        allNames.set(fullName, { ...entry, label: fullName })
      }
    })

    // Find all required parent subdomains and add them with zero address
    const requiredParents = new Set<string>()
    allNames.forEach((entry, name) => {
      const parts = name.split('.')
      // Check all intermediate parents
      for (let i = 1; i < parts.length - rootParent.split('.').length; i++) {
        const parentSubdomain = parts.slice(i).join('.')
        if (parentSubdomain !== rootParent && !allNames.has(parentSubdomain)) {
          requiredParents.add(parentSubdomain)
        }
      }
    })

    // Add zero address entries for missing parents
    requiredParents.forEach((parentSubdomain) => {
      allNames.set(parentSubdomain, {
        id: `zero-${Date.now()}-${Math.random()}`,
        address: '0x0000000000000000000000000000000000000000',
        label: parentSubdomain,
      })
    })

    // Group entries by their immediate parent and level
    const batches = new Map<string, Map<number, BatchEntry[]>>() // parentName -> level -> entries

    allNames.forEach((entry, fullName) => {
      const parts = fullName.split('.')
      const rootParentParts = rootParent.split('.')
      const level = parts.length - rootParentParts.length

      // Get immediate parent
      let immediateParent: string
      if (level === 1) {
        // This is a 3LD directly under root parent
        immediateParent = rootParent
      } else {
        // Get the parent (everything after the first label)
        immediateParent = parts.slice(1).join('.')
      }

      if (!batches.has(immediateParent)) {
        batches.set(immediateParent, new Map())
      }

      const parentBatches = batches.get(immediateParent)!
      if (!parentBatches.has(level)) {
        parentBatches.set(level, [])
      }

      parentBatches.get(level)!.push(entry)
    })

    // Convert to array and sort by level, then by parent name
    const result: Array<{
      parentName: string
      entries: BatchEntry[]
      level: number
    }> = []

    // Get all unique levels
    const allLevels = new Set<number>()
    batches.forEach((levelMap) => {
      levelMap.forEach((_, level) => allLevels.add(level))
    })

    // Sort levels ascending (3LD first, then 4LD, etc.)
    const sortedLevels = Array.from(allLevels).sort((a, b) => a - b)

    // For each level, add all batches at that level
    sortedLevels.forEach((level) => {
      const batchesAtLevel: Array<{
        parentName: string
        entries: BatchEntry[]
        level: number
      }> = []

      batches.forEach((levelMap, parentName) => {
        if (levelMap.has(level)) {
          const entries = levelMap.get(level)!
          // Sort entries alphabetically within the batch
          entries.sort((a, b) => a.label.localeCompare(b.label))
          batchesAtLevel.push({
            parentName,
            entries,
            level,
          })
        }
      })

      // Sort batches at this level alphabetically by parent name
      batchesAtLevel.sort((a, b) => a.parentName.localeCompare(b.parentName))
      result.push(...batchesAtLevel)
    })

    return result
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

    // Check if connected wallet is a Safe wallet
    const safeCheck = await checkIfSafeWallet()
    setIsSafeWallet(safeCheck)

    if (isUnsupportedL2Chain) {
      setError(
        `To batch name contracts on ${unsupportedL2Name}, change to the ${chain?.id === CHAINS.OPTIMISM || chain?.id === CHAINS.ARBITRUM || chain?.id === CHAINS.SCROLL || chain?.id === CHAINS.LINEA || chain?.id === CHAINS.BASE ? 'Ethereum Mainnet' : 'Sepolia'} network and use the Naming on L2 Chains option.`
      )
      return
    }

    // Check for validation errors first
    if (hasValidationErrors()) {
      setError('Please fix all validation errors before proceeding')
      toast({
        title: 'Validation Errors',
        description: 'Please fix all errors in the contract entries',
        variant: 'destructive',
      })
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
      // Process entries and group them into batches
      const batchGroups = processAndGroupEntriesForBatching(validEntries, parentName)

      batchGroups.forEach((batch, index) => {
      })

      // Get all processed entries for reverse resolution checks
      const allProcessedEntries: BatchEntry[] = []
      batchGroups.forEach((batch) => {
        allProcessedEntries.push(...batch.entries)
      })

      const steps: Step[] = []

      const operatorAccess = await checkOperatorAccess(parentName)
      // Step 1: Grant operator access
      if(!operatorAccess) {
        steps.push({
          title: 'Grant operator access',
          chainId: chain!.id,
          action: async () => {
            return await grantOperatorAccess()
          },
        })
      }

      // Count total real contracts and parent subdomains
      const realContracts = allProcessedEntries.filter((e) => {
        const normalizedAddress = e.address.toLowerCase().padEnd(42, '0')
        return (
          normalizedAddress !== '0x0000000000000000000000000000000000000000' &&
          e.address.toLowerCase() !== '0x0' &&
          e.address !== ''
        )
      }).length
      const parentSubdomains = allProcessedEntries.length - realContracts

      // Determine coin types based on selected L2 chains (same for all batches)
      const coinTypes: bigint[] = []
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
        const chainId = chainConfigs[chainName as keyof typeof chainConfigs]
        if (chainId) {
          coinTypes.push(BigInt(CONTRACTS[chainId].COIN_TYPE))
        }
      }

      const uniqueCoinTypes = [...new Set(coinTypes)]

      // Step 2+: Create a batch naming step for each group
      batchGroups.forEach((batch, index) => {
        const batchRealContracts = batch.entries.filter((e) => {
          const normalizedAddress = e.address.toLowerCase().padEnd(42, '0')
          return (
            normalizedAddress !== '0x0000000000000000000000000000000000000000' &&
            e.address.toLowerCase() !== '0x0' &&
            e.address !== ''
          )
        }).length
        const batchParentSubdomains = batch.entries.length - batchRealContracts

        const levelSuffix = batch.level === 1 ? '3LD' : batch.level === 2 ? '4LD' : batch.level === 3 ? '5LD' : `${batch.level + 2}LD`
        
        steps.push({
          title: `Creating ${batch.entries.length} subdomains under "${batch.parentName}" (${batchRealContracts} contract${batchRealContracts !== 1 ? 's' : ''})`,
          chainId: chain!.id,
          action: async () => {
            // Extract just the label part (remove parent from full name)
            const labels = batch.entries.map((e) => {
              // e.label is the full name like "label.parent.eth"
              // We need to extract just "label" part relative to batch.parentName
              const fullName = e.label
              const parentSuffix = `.${batch.parentName}`
              if (fullName.endsWith(parentSuffix)) {
                return fullName.slice(0, -parentSuffix.length)
              }
              return fullName
            })

            const addresses = batch.entries.map((e) => e.address as `0x${string}`)

            const pricing = await readContract(walletClient!, {
              address: config!.ENSCRIBE_V2_CONTRACT as `0x${string}`,
              abi: enscribeV2ContractABI,
              functionName: 'pricing',
              args: [],
            })

            let hash
            if (uniqueCoinTypes.length === 1 && uniqueCoinTypes[0] === 60n) {
              hash = await writeContract(walletClient!, {
                chain,
                address: config!.ENSCRIBE_V2_CONTRACT as `0x${string}`,
                abi: enscribeV2ContractABI,
                functionName: 'setNameBatch',
                args: [addresses, labels, batch.parentName],
                value: pricing as bigint,
              })
            } else {
              hash = await writeContract(walletClient!, {
                chain,
                address: config!.ENSCRIBE_V2_CONTRACT as `0x${string}`,
                abi: enscribeV2ContractABI,
                functionName: 'setNameBatch',
                args: [addresses, labels, batch.parentName, uniqueCoinTypes],
                value: pricing as bigint,
              })
            }

            if (!safeCheck) {
              await waitForTransactionReceipt(walletClient!, { hash })
            }
            return hash
          },
        })
      })

      // Step 3: Check each contract for reverse resolution on L1 (only for non-zero addresses and if not skipping L1)
      if (!skipL1Naming) {
        for (const entry of allProcessedEntries) {
          // Skip zero addresses (normalize to full address format)
          const normalizedAddress = entry.address.toLowerCase().padEnd(42, '0')
          if (
            normalizedAddress === '0x0000000000000000000000000000000000000000' ||
            entry.address.toLowerCase() === '0x0' ||
            entry.address === ''
          ) {
            continue
          }

          // First check if contract is ownable on L1
          const isOwnable = await checkIfOwnable(entry.address)
          
          // Only proceed if contract is ownable on L1 (meaning it's deployed on L1)
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
                    chain,
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
                  if (!safeCheck) {
                    await waitForTransactionReceipt(walletClient!, { hash: tx })
                  }
                  return tx
                },
              })
            }
          } else {
            // If not ownable, check if reverse claimable (for contracts that don't implement Ownable)
            const isReverseClaimable = await checkIfReverseClaimable(
              entry.address
            )
            if (isReverseClaimable) {
              const labelOnly = entry.label.split('.')[0]

              // Add reverse resolution for L1
              steps.push({
                title: `Set reverse record for ${labelOnly}`,
                chainId: chain!.id,
                action: async () => {
                  const tx = await writeContract(walletClient!, {
                    chain,
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
                  if (!safeCheck) {
                    await waitForTransactionReceipt(walletClient!, { hash: tx })
                  }
                  return tx
                },
              })
            }
          }
        }
      }

      // Step 4: Add L2 reverse resolution steps for selected L2 chains
      if (selectedL2ChainNames.length > 0) {
        const isL1Mainnet = chain?.id === CHAINS.MAINNET

        const stepChainConfigs = {
          Optimism: {
            chainId: isL1Mainnet ? CHAINS.OPTIMISM : CHAINS.OPTIMISM_SEPOLIA,
            chain: isL1Mainnet
              ? { id: CHAINS.OPTIMISM, name: 'Optimism' }
              : { id: CHAINS.OPTIMISM_SEPOLIA, name: 'Optimism Sepolia' },
          },
          Arbitrum: {
            chainId: isL1Mainnet ? CHAINS.ARBITRUM : CHAINS.ARBITRUM_SEPOLIA,
            chain: isL1Mainnet
              ? { id: CHAINS.ARBITRUM, name: 'Arbitrum' }
              : { id: CHAINS.ARBITRUM_SEPOLIA, name: 'Arbitrum Sepolia' },
          },
          Scroll: {
            chainId: isL1Mainnet ? CHAINS.SCROLL : CHAINS.SCROLL_SEPOLIA,
            chain: isL1Mainnet
              ? { id: CHAINS.SCROLL, name: 'Scroll' }
              : { id: CHAINS.SCROLL_SEPOLIA, name: 'Scroll Sepolia' },
          },
          Base: {
            chainId: isL1Mainnet ? CHAINS.BASE : CHAINS.BASE_SEPOLIA,
            chain: isL1Mainnet
              ? { id: CHAINS.BASE, name: 'Base' }
              : { id: CHAINS.BASE_SEPOLIA, name: 'Base Sepolia' },
          },
          Linea: {
            chainId: isL1Mainnet ? CHAINS.LINEA : CHAINS.LINEA_SEPOLIA,
            chain: isL1Mainnet
              ? { id: CHAINS.LINEA, name: 'Linea' }
              : { id: CHAINS.LINEA_SEPOLIA, name: 'Linea Sepolia' },
          },
        }

        const selectedL2Chains: Array<{
          name: string
          chainId: number
          chain: any
        }> = []

        for (const selectedChain of selectedL2ChainNames) {
          const config =
            stepChainConfigs[selectedChain as keyof typeof stepChainConfigs]
          if (config) {
            selectedL2Chains.push({ name: selectedChain, ...config })
          }
        }

        // Track if we need to switch back to L1 at the end
        let needsSwitchBackToL1 = false

        // For each L2 chain, check ownership for all contracts BEFORE creating steps
        for (const l2Chain of selectedL2Chains) {
          const l2Config = CONTRACTS[l2Chain.chainId]

          if (!l2Config || !l2Config.L2_REVERSE_REGISTRAR) {
            console.error(`${l2Chain.name} configuration missing`)
            continue
          }


          // Collect contracts that need reverse resolution on this L2
          const contractsForL2: Array<{
            address: string
            label: string
            labelOnly: string
          }> = []

          for (const entry of allProcessedEntries) {
            // Skip zero addresses (normalize to full address format)
            const normalizedAddress = entry.address.toLowerCase().padEnd(42, '0')
            if (
              normalizedAddress === '0x0000000000000000000000000000000000000000' ||
              entry.address.toLowerCase() === '0x0' ||
              entry.address === ''
            ) {
              continue
            }

            // Check if contract is ownable AND we're the owner on this L2
            const isOwnableOnL2 = await checkIfOwnableOnL2(
              entry.address,
              l2Chain.chainId
            )

            if (isOwnableOnL2) {
              const isOwnerOnL2 = await checkIfContractOwnerOnL2(
                entry.address,
                l2Chain.chainId
              )

              if (isOwnerOnL2) {
                const labelOnly = entry.label.split('.')[0]
                contractsForL2.push({
                  address: entry.address,
                  label: entry.label,
                  labelOnly,
                })
              } else {
              }
            } else {
            }
          }

          // Only create steps for contracts that are ownable AND owned on this L2
          if (contractsForL2.length > 0) {

            // Add individual steps for each contract
            let isFirstContract = true
            for (const contract of contractsForL2) {
              steps.push({
                title: `${isFirstContract ? `Switch to ${l2Chain.name} and set` : 'Set'} reverse record for ${contract.labelOnly}`,
                chainId: l2Chain.chainId,
                action: async () => {
                  // Switch to L2 chain if not already there
                  const currentChainId = await walletClient!.getChainId()
                  if (currentChainId !== l2Chain.chainId) {
                    await switchChain({ chainId: l2Chain.chainId })

                    // Wait for chain switch to complete
                    await new Promise((resolve) => setTimeout(resolve, 3000))

                    // Wait for the chain to actually change
                    let attempts = 0
                    while (attempts < 10) {
                      const newChainId = await walletClient!.getChainId()
                      if (newChainId === l2Chain.chainId) {
                        break
                      }
                      await new Promise((resolve) => setTimeout(resolve, 1000))
                      attempts++
                    }

                    if (attempts >= 10) {
                      throw new Error(
                        `Chain switch timeout - chain did not change to ${l2Chain.name}`
                      )
                    }
                  }

                  // Set reverse record on L2

                  const txn = await writeContract(walletClient!, {
                    chain: l2Chain.chain,
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
                    args: [contract.address as `0x${string}`, contract.label],
                  })

                  if (!safeCheck) {
                    await waitForTransactionReceipt(walletClient!, { hash: txn })
                  }
                  return txn
                },
              })

              isFirstContract = false
              needsSwitchBackToL1 = true
            }
          } else {
          }
        }

        // Don't add a separate "Switch back to L1" step
        // The chain switching will be handled in the revoke operator access step
      }

      // Final Step: Revoke operator access
      steps.push({
        title: 'Revoke operator access',
        chainId: chain!.id, // Add chainId for L1 transaction
        action: async () => {
          // Ensure we're back on L1 before revoking
          const currentChainId = await walletClient!.getChainId()
          if (currentChainId !== chain!.id) {
            await switchChain({ chainId: chain!.id })
            
            // Wait for chain switch to complete
            await new Promise((resolve) => setTimeout(resolve, 3000))

            // Wait for the chain to actually change
            let attempts = 0
            while (attempts < 10) {
              const newChainId = await walletClient!.getChainId()
              if (newChainId === chain!.id) {
                break
              }
              await new Promise((resolve) => setTimeout(resolve, 1000))
              attempts++
            }

            if (attempts >= 10) {
              throw new Error(
                `Chain switch timeout - chain did not change to ${chain?.name}`
              )
            }
          }
          return await revokeOperatorAccess()
        },
      })

      setModalSteps(steps)
      setModalTitle('Batch Naming')
      setModalSubtitle(
        safeCheck 
          ? `Transactions will be executed in your Safe wallet app`
          : `Naming ${allProcessedEntries.length} entries in ${batchGroups.length} batch${batchGroups.length !== 1 ? 'es' : ''} (${realContracts} contract${realContracts !== 1 ? 's' : ''}${parentSubdomains > 0 ? ` + ${parentSubdomains} subdomain${parentSubdomains !== 1 ? 's' : ''}` : ''})`
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
      
        <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <span>Parent Domain</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Batch Naming requires operator access of ENS name to create subnames and set forward resolutions. It can be revoked after naming completes.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
      

      {/* Contracts Table */}
      
        <label className="block text-gray-700 dark:text-gray-300">
          Contracts
        </label>
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800 space-y-3">
          {batchEntries.map((entry, index) => {
            // Pre-compute batch separator metadata
            let showBatchSeparator = false
            let batchLabel = ''
            if (parentName && index > 0) {
              const prevEntry = batchEntries[index - 1]
              let currFullName = entry.label
              if (entry.label && !entry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
                currFullName = `${entry.label}.${parentName}`
              }
              const currParts = currFullName.split('.')
              const parentParts = parentName.split('.')
              const currLevel = currParts.length - parentParts.length
              const currImmediateParent = currLevel === 1 ? parentName : currParts.slice(1).join('.')
              let prevFullName = prevEntry.label
              if (prevEntry.label && !prevEntry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
                prevFullName = `${prevEntry.label}.${parentName}`
              }
              const prevParts = prevFullName.split('.')
              const prevLevel = prevParts.length - parentParts.length
              const prevImmediateParent = prevLevel === 1 ? parentName : prevParts.slice(1).join('.')
              if (currLevel !== prevLevel || currImmediateParent !== prevImmediateParent) {
                showBatchSeparator = true
                batchLabel = `names under "${currImmediateParent}"`
              }
            } else if (parentName && index === 0 && entry.label) {
              let currFullName = entry.label
              if (entry.label && !entry.label.toLowerCase().endsWith(`.${parentName.toLowerCase()}`)) {
                currFullName = `${entry.label}.${parentName}`
              }
              const currParts = currFullName.split('.')
              const parentParts = parentName.split('.')
              const currLevel = currParts.length - parentParts.length
              const currImmediateParent = currLevel === 1 ? parentName : currParts.slice(1).join('.')
              batchLabel = `names under "${currImmediateParent}"`
              showBatchSeparator = true
            }
            const isAutoGenerated = entry.id.startsWith('zero-') &&
              entry.address === '0x0000000000000000000000000000000000000000'
            return (
              <BatchEntryRow
                key={entry.id}
                entry={entry}
                index={index}
                parentName={parentName}
                showBatchSeparator={showBatchSeparator}
                batchLabel={batchLabel}
                isAutoGenerated={isAutoGenerated}
                canRemove={batchEntries.length > 1 && !isAutoGenerated}
                focusedInputId={focusedInputId}
                shouldTruncateAddress={shouldTruncateAddress}
                truncatedAddresses={truncatedAddresses}
                onUpdate={updateEntry}
                onRemove={removeEntry}
                onFocus={(id) => setFocusedInputId(id)}
                onBlur={(id, address) => {
                  setFocusedInputId(null)
                  if (address) checkIfAddressNeedsTruncation(id, address)
                }}
                addressInputRef={(el) => {
                  addressInputRefs.current[entry.id] = el
                  if (el && entry.address) {
                    setTimeout(() => checkIfAddressNeedsTruncation(entry.id, entry.address), 0)
                  }
                }}
              />
            )
          })}
          
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
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
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
                    <Info className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Select which L2 chains to set coin types for. This will add the corresponding coin types for all contracts and add
                            additional steps to switch to each selected chain and set the primary name there as well.
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
            <CallDataPanel
              callDataList={callDataList}
              allCallData={allCallData}
              isCallDataOpen={isCallDataOpen}
              onToggle={() => setIsCallDataOpen(!isCallDataOpen)}
              copied={copied}
              onCopy={copyToClipboard}
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleBatchNaming}
        disabled={loading || !isConnected || !parentName || hasValidationErrors()}
        className="relative overflow-hidden w-full py-6 text-lg font-medium transition-all duration-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 focus:ring-4 focus:ring-blue-500/30 group disabled:opacity-50 disabled:cursor-not-allowed"
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
      <ENSDomainSelectionModal
        open={showENSModal}
        onOpenChange={setShowENSModal}
        fetchingENS={fetchingENS}
        userOwnedDomains={userOwnedDomains}
        enscribeDomain={enscribeDomain}
        onSelectDomain={(domain, type) => {
          setParentName(domain)
          setParentType(type)
          setShowENSModal(false)
        }}
      />


      {/* L2 Chain Selection Modal */}
      <L2ChainPickerDialog
        open={showL2Modal}
        onClose={() => setShowL2Modal(false)}
        chainOptions={L2_CHAIN_OPTIONS}
        selectedChains={selectedL2ChainNames}
        onToggleChain={(chainName) => {
          if (selectedL2ChainNames.includes(chainName)) {
            setSelectedL2ChainNames(selectedL2ChainNames.filter(c => c !== chainName))
          } else {
            setSelectedL2ChainNames([...selectedL2ChainNames, chainName])
          }
        }}
      />

      {/* Steps Modal */}
      <SetNameStepsModal
        open={modalOpen}
        onClose={(result) => {
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
            // Reset form after successful batch naming
            setBatchEntries([{ id: '1', address: '', label: '' }])
            setParentType('web3labs')
            setParentName(enscribeDomain)
            setSelectedL2ChainNames([])
            setSkipL1Naming(false)
            setError('')
            setIsAdvancedOpen(false)
            setCopied({})
            setAllCallData('')
            setIsCallDataOpen(false)
            setCallDataList([])
          }
        }}
        steps={modalSteps}
        title={modalTitle}
        subtitle={modalSubtitle}
        contractAddress={batchEntries.find(e => e.address && e.address !== '0x0000000000000000000000000000000000000000')?.address}
        ensName={batchEntries.find(e => e.label)?.label}
        isPrimaryNameSet={false}
        batchEntries={batchEntries.filter(e => e.address && e.address !== '0x0000000000000000000000000000000000000000' && e.address !== '0x0' && e.address !== '').map(e => ({ address: e.address, label: e.label }))}
        parentName={parentName}
      />
    </div>
    </div>
  )
}
