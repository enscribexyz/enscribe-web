import { useState, useEffect } from 'react'
import { type Address } from 'viem'
import { namehash, normalize } from 'viem/ens'
import { getParentNode, fetchOwnedDomains } from '@/utils/ens'
import ensRegistryABI from '../contracts/ENSRegistry'
import nameWrapperABI from '../contracts/NameWrapper'
import { useAccount, useWalletClient } from 'wagmi'
import { useToast } from '@/hooks/use-toast'
import parseJson from 'json-parse-safe'
import { CHAINS } from '../utils/constants'
import { useChainConfig } from '@/hooks/useChainConfig'
import { useSafeWallet } from '@/hooks/useSafeWallet'
import { getChainName } from '@/lib/chains'
import type { Step } from '@/types'
import { v4 as uuid } from 'uuid'
import {
  ConstructorArg,
  encodeConstructorArgs,
  fetchGeneratedName,
  getDeployedAddress,
  logMetric,
} from '@/utils/componentUtils'
import {
  getEnsAddress,
  readContract,
  waitForTransactionReceipt,
  writeContract,
} from 'viem/actions'
import enscribeContractABI from '../contracts/Enscribe'
import { isEmpty } from '@/utils/validation'
import { checkRecordExists } from '@/utils/contractChecks'

const OWNABLE_FUNCTION_SELECTORS = [
  '8da5cb5b', // owner()
  'f2fde38b', // transferOwnership(address)
]

const ADDR_REVERSE_NODE =
  '91d1777781884d03a6757a803996e38de2a42967fb37eeaca72729271025a9e2'

export const commonTypes = [
  'string',
  'uint8',
  'uint256',
  'address',
  'bool',
  'bytes',
  'bytes32',
  'string[]',
  'uint256[]',
  'tuple(address, uint256)',
]

const opType = 'deployandname'

export const checkIfOwnable = (bytecode: string): boolean => {
  return OWNABLE_FUNCTION_SELECTORS.every((selector) =>
    bytecode.includes(selector),
  )
}

export const checkIfReverseClaimable = (bytecode: string): boolean => {
  return bytecode.includes(ADDR_REVERSE_NODE)
}

export function useDeployForm() {
  const { address: walletAddress, isConnected, chain } = useAccount()
  const { data: walletClient } = useWalletClient()

  const config = useChainConfig()
  const enscribeDomain = config?.ENSCRIBE_DOMAIN!
  const chainId = chain?.id!
  const isSafeWallet = useSafeWallet()

  const { toast } = useToast()

  const [bytecode, setBytecode] = useState('')
  const [label, setLabel] = useState('')
  const [parentType, setParentType] = useState<'web3labs' | 'own'>('web3labs')
  const [parentName, setParentName] = useState(enscribeDomain)
  const [fetchingENS, setFetchingENS] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [deployedAddress, setDeployedAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [isValidBytecode, setIsValidBytecode] = useState(true)
  const [isOwnable, setIsOwnable] = useState(false)
  const [isReverseClaimable, setIsReverseClaimable] = useState(false)
  const [isReverseSetter, setIsReverseSetter] = useState(false)

  const [operatorAccess, setOperatorAccess] = useState(false)
  const [ensNameTaken, setEnsNameTaken] = useState(false)
  const [args, setArgs] = useState<ConstructorArg[]>([])
  const [abiText, setAbiText] = useState('')
  const [recordExists, setRecordExists] = useState(true)
  const [accessLoading, setAccessLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalSteps, setModalSteps] = useState<Step[]>([])
  const [modalTitle, setModalTitle] = useState('')
  const [modalSubtitle, setModalSubtitle] = useState('')

  const [userOwnedDomains, setUserOwnedDomains] = useState<string[]>([])
  const [showENSModal, setShowENSModal] = useState(false)
  const corelationId = uuid()

  // Unsupported L2 gating (Optimism, Arbitrum, Scroll including Sepolia)
  const isUnsupportedL2Chain = [
    CHAINS.OPTIMISM, CHAINS.OPTIMISM_SEPOLIA,
    CHAINS.ARBITRUM, CHAINS.ARBITRUM_SEPOLIA,
    CHAINS.SCROLL, CHAINS.SCROLL_SEPOLIA,
  ].includes((chain?.id as number) || -1)

  const unsupportedL2Name = getChainName(chain?.id ?? 0)

  useEffect(() => {
    if (parentType === 'web3labs' && config?.ENSCRIBE_DOMAIN) {
      setParentName(config?.ENSCRIBE_DOMAIN)
    }
  }, [config, parentType])

  useEffect(() => {
    setBytecode('')
    setLabel('')
    setParentType('web3labs')
    setParentName(enscribeDomain)
    setAbiText('')
    setError('')
    setLoading(false)
    setDeployedAddress('')
    setTxHash('')
    setModalOpen(false)
    setModalSteps([])
    setModalTitle('')
    setModalSubtitle('')
    setUserOwnedDomains([])
    setShowENSModal(false)
    setIsOwnable(false)
    setIsReverseClaimable(false)
    setRecordExists(false)
    setArgs([])
    setOperatorAccess(false)
    setEnsNameTaken(false)
  }, [chain?.id, isConnected])

  useEffect(() => {
    if (bytecode.length > 0) {
      setIsOwnable(checkIfOwnable(bytecode))
      setIsReverseClaimable(checkIfReverseClaimable(bytecode))
      setIsValidBytecode(
        checkIfOwnable(bytecode) || checkIfReverseClaimable(bytecode),
      )
    }
  }, [bytecode])

  const populateName = async () => {
    const name = await fetchGeneratedName()
    setLabel(name)
  }

  const addArg = () =>
    setArgs([...args, { type: 'string', value: '', isCustom: false }])

  const updateArg = (index: number, updated: Partial<ConstructorArg>) => {
    const newArgs = [...args]
    newArgs[index] = { ...newArgs[index], ...updated }
    setArgs(newArgs)
  }

  const removeArg = (index: number) => {
    const newArgs = [...args]
    newArgs.splice(index, 1)
    setArgs(newArgs)
  }

  const handleAbiInput = (text: string) => {
    if (text.trim().length === 0) {
      setArgs([])
      setError('')
      return
    }

    try {
      const { value: parsed, error } = parseJson(text)

      if (error || !parsed) {
        setArgs([])
        setError('Invalid ABI JSON. Please paste a valid ABI array.')
      } else {
        parseConstructorInputs(parsed)
        setError('')
      }
    } catch (err) {
      console.error('Invalid ABI JSON:', err)
      setArgs([])
      setError('Invalid ABI JSON. Please paste a valid ABI array.')
    }
  }

  const parseConstructorInputs = (abi: any[]) => {
    try {
      const constructor = abi.find((item) => item.type === 'constructor')
      if (!constructor || !constructor.inputs) {
        setArgs([])
        return
      }

      const generatedArgs = constructor.inputs.map((input: any) => {
        let type = input.type

        // Handle tuples (structs)
        if (type === 'tuple' && input.components) {
          const componentTypes = input.components
            .map((c: any) => c.type)
            .join(',')
          type = `tuple(${componentTypes})`
        }

        // Handle arrays (including tuple arrays)
        if (type.includes('[]')) {
          if (input.components) {
            const componentTypes = input.components
              .map((c: any) => c.type)
              .join(',')
            type = `tuple(${componentTypes})[]`
          }
        }

        return {
          type,
          value: '',
          isCustom: !commonTypes.includes(type),
          isTuple: type.startsWith('tuple'),
          label: input.name || '',
        }
      })

      setArgs(generatedArgs)
    } catch (err) {}
  }

  const fetchUserOwnedDomains = async () => {
    if (!walletAddress || !config?.SUBGRAPH_API) return
    try {
      setFetchingENS(true)
      const domains = await fetchOwnedDomains(walletAddress, config.SUBGRAPH_API, {
        chainId: chain?.id,
      })
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
    if (!walletClient) return

    // Validate label and parent name before checking
    if (!label.trim()) {
      setError('Label cannot be empty')
      setEnsNameTaken(false)
      return
    }
    if (!parentName.trim()) {
      setError('Parent name cannot be empty')
      setEnsNameTaken(false)
      return
    }

    if (label.includes('.')) {
      setError("Can't include '.' in label name")
      return
    }

    let resolvedAddress
    try {
      const fullEnsName = `${label}.${parentName}`
      resolvedAddress = await getEnsAddress(walletClient, {
        name: normalize(fullEnsName),
      })
    } catch (err) {
      console.error('Error checking ENS name:', err)
      setError('')
      setEnsNameTaken(false)
    } finally {
      if (resolvedAddress) {
        setEnsNameTaken(true)
        setError('ENS name already used, please change label')
      } else {
        setEnsNameTaken(false)
        setError('')
      }
    }
  }

  const recordExist = async (name: string): Promise<boolean> => {
    if (!walletClient || !config?.ENS_REGISTRY) return false
    return checkRecordExists(walletClient, config.ENS_REGISTRY, name)
  }

  const checkOperatorAccess = async (name: string): Promise<boolean> => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_CONTRACT ||
      !name
    )
      return false

    try {
      // First check if the record exists
      if (!(await recordExist(name))) return false

      const parentNode = getParentNode(name)

      if (chain?.id == CHAINS.BASE || chain?.id == CHAINS.BASE_SEPOLIA) {
        return (await readContract(walletClient, {
          address: config.ENS_REGISTRY as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'isApprovedForAll',
          args: [walletAddress, config.ENSCRIBE_CONTRACT],
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
            args: [walletAddress, config.ENSCRIBE_CONTRACT],
          })) as boolean
        } else {
          //Unwrapped Names
          return (await readContract(walletClient, {
            address: config.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'isApprovedForAll',
            args: [walletAddress, config.ENSCRIBE_CONTRACT],
          })) as boolean
        }
      }
    } catch (err) {
      console.error('Approval check failed:', err)
      return false
    }
  }

  // Check record existence and operator access when parentName changes
  useEffect(() => {
    const checkParentNameAccess = async () => {
      if (!walletClient || !config?.ENS_REGISTRY || !parentName) {
        setRecordExists(false)
        setOperatorAccess(false)
        return
      }

      try {
        // Check if record exists
        const exist = await recordExist(parentName)
        setRecordExists(exist)

        // Check operator access
        const approved = await checkOperatorAccess(parentName)
        setOperatorAccess(approved)

      } catch (err) {
        console.error('Error checking parent name access:', err)
        setRecordExists(false)
        setOperatorAccess(false)
      }
    }

    checkParentNameAccess()
  }, [parentName, walletClient, config?.ENS_REGISTRY])

  const revokeOperatorAccess = async () => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_CONTRACT ||
      !getParentNode(parentName)
    )
      return

    setAccessLoading(true)

    try {
      const parentNode = getParentNode(parentName)
      if (!(await recordExist(parentName))) return

      let tx

      if (chain?.id == CHAINS.BASE || chain?.id == CHAINS.BASE_SEPOLIA) {
        if (isSafeWallet) {
          writeContract(walletClient, {
            address: config.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'setApprovalForAll',
            args: [config.ENSCRIBE_CONTRACT, false],
            account: walletAddress,
          })
          tx = 'safe wallet'
        } else {
          tx = await writeContract(walletClient, {
            address: config.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'setApprovalForAll',
            args: [config.ENSCRIBE_CONTRACT, false],
            account: walletAddress,
          })

          const txReceipt = await waitForTransactionReceipt(walletClient, {
            hash: tx,
          })
        }
      } else {
        const isWrapped = await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })

        if (isSafeWallet) {
          if (isWrapped) {
            writeContract(walletClient, {
              address: config.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, false],
              account: walletAddress,
            })
          } else {
            writeContract(walletClient, {
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, false],
              account: walletAddress,
            })
          }
          tx = 'safe wallet'
        } else {
          tx = isWrapped
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
          const txReceipt = await waitForTransactionReceipt(walletClient, {
            hash: tx,
          })
        }
      }

      let contractType
      if (isOwnable) {
        contractType = 'Ownable'
      } else if (isReverseClaimable) {
        contractType = 'ReverseClaimer'
      } else {
        contractType = 'ReverseSetter'
      }
      await logMetric(
        corelationId,
        Date.now(),
        chainId,
        '',
        walletAddress,
        `${label}.${parentName}`,
        'revoke::setApprovalForAll',
        tx,
        contractType,
        opType,
      )

      toast({
        title: 'Access Revoked',
        description: `Operator role of ${parentName} revoked from Enscribe Contract`,
      })
      setOperatorAccess(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Revoke access failed',
      })
    } finally {
      setAccessLoading(false)
    }
  }

  const grantOperatorAccess = async () => {
    if (
      !walletClient ||
      !walletAddress ||
      !config?.ENS_REGISTRY ||
      !config?.ENSCRIBE_CONTRACT ||
      !getParentNode(parentName)
    )
      return

    setAccessLoading(true)

    try {
      const parentNode = getParentNode(parentName)
      if (!(await recordExist(parentName))) return

      let tx

      if (chain?.id == CHAINS.BASE || chain?.id == CHAINS.BASE_SEPOLIA) {
        if (isSafeWallet) {
          writeContract(walletClient, {
            address: config.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'setApprovalForAll',
            args: [config.ENSCRIBE_CONTRACT, true],
            account: walletAddress,
          })
          tx = 'safe wallet'
        } else {
          tx = await writeContract(walletClient, {
            address: config.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'setApprovalForAll',
            args: [config.ENSCRIBE_CONTRACT, true],
            account: walletAddress,
          })

          const txReceipt = await waitForTransactionReceipt(walletClient, {
            hash: tx,
          })
        }
      } else {
        const isWrapped = (await readContract(walletClient, {
          address: config.NAME_WRAPPER as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isWrapped',
          args: [parentNode],
        })) as boolean

        if (isSafeWallet) {
          if (isWrapped) {
            writeContract(walletClient, {
              address: config.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, true],
              account: walletAddress,
            })
          } else {
            writeContract(walletClient, {
              address: config.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'setApprovalForAll',
              args: [config.ENSCRIBE_CONTRACT, true],
              account: walletAddress,
            })
          }
          tx = 'safe wallet' as `0x${string}`
        } else {
          tx = isWrapped
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
          const txReceipt = await waitForTransactionReceipt(walletClient, {
            hash: tx,
          })
        }
      }

      let contractType
      if (isOwnable) {
        contractType = 'Ownable'
      } else if (isReverseClaimable) {
        contractType = 'ReverseClaimer'
      } else {
        contractType = 'ReverseSetter'
      }
      await logMetric(
        corelationId,
        Date.now(),
        chainId,
        '',
        walletAddress,
        `${label}.${parentName}`,
        'grant::setApprovalForAll',
        tx,
        contractType,
        opType,
      )

      toast({
        title: 'Access Granted',
        description: `Operator role of ${parentName} given to Enscribe Contract`,
      })
      setOperatorAccess(true)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err?.message || 'Grant access failed',
      })
    } finally {
      setAccessLoading(false)
    }
  }

  const deployContract = async () => {
    if (!walletClient || !walletAddress) {
      return
    }
    if (isUnsupportedL2Chain) {
      setError(
        `Deploying Contract with Primary Name for ${unsupportedL2Name} is not currently supported`,
      )
      return
    }
    if (!label.trim()) {
      setError('Label cannot be empty')
      return
    }
    if (label.includes('.')) {
      setError("Can't include '.' in label name")
      return
    }
    if (!parentName.trim()) {
      setError('Parent name cannot be empty')
      return
    }

    if (isReverseSetter) {
      const argsContainContractNameMatchingLabel =
        args.length > 0 &&
        args.find((arg) => arg.value == label + '.' + parentName) != undefined
      if (!argsContainContractNameMatchingLabel) {
        setError(
          'Contract name argument passed to a ReverseSetter contract should match label combined with parent name.',
        )
        return
      }
    }

    if (ensNameTaken) {
      setError('ENS name already used, please change label')
      return
    }
    if (!isValidBytecode) {
      setError(
        'Invalid contract bytecode. It does not extend Ownable/ReverseClaimable.',
      )
      return
    }

    if (!config) {
      console.error('Unsupported network')
      setError('Unsupported network')
    } else {
      setError('')
    }

    let deployedAddr = ''

    try {
      setLoading(true)
      setError('')
      setTxHash('')

      if (!walletClient) {
        alert('Please connect your wallet first.')
        setLoading(false)
        return
      }

      const labelNormalized = normalize(label)
      const parentNameNormalized = normalize(parentName)
      const parentNode = getParentNode(parentNameNormalized)

      const finalBytecode = encodeConstructorArgs(bytecode, args, setError)
      const steps: Step[] = []


      const txCost = (await readContract(walletClient, {
        address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
        abi: enscribeContractABI,
        functionName: 'pricing',
        args: [],
      })) as bigint

      let name = `${labelNormalized}.${parentNameNormalized}`

      if (isOwnable) {
        if (parentType === 'web3labs') {
          steps.push({
            title: 'Deploy and Set Primary Name',
            action: async () => {
              // const txn = await namingContract.setNameAndDeploy(finalBytecode, label, parentName, parentNode, {
              //     value: txCost
              // })
              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeploy',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txn = 'safe wallet' as `0x${string}`
                try {await logMetric(
                  corelationId,
                  Date.now(),
                  chainId,
                  '', // Will be updated in SetNameStepsModal
                  walletAddress,
                  name,
                  'setNameAndDeploy',
                  txn,
                  'Ownable',
                  opType,
                )} catch (err) {
                  setError('Failed to log metric')
                }
                return txn
              } else {
                const txn = await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeploy',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })

                const txReceipt = await waitForTransactionReceipt(
                  walletClient,
                  {
                    hash: txn,
                  },
                )
                const deployedContractAddress =
                  await getDeployedAddress(txReceipt)
                if (deployedContractAddress) {
                  try { await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    deployedContractAddress,
                    walletAddress,
                    name,
                    'setNameAndDeploy',
                    txn,
                    'Ownable',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              }
            },
          })
        } else if (
          chain?.id == CHAINS.BASE ||
          chain?.id == CHAINS.BASE_SEPOLIA
        ) {
          const isApprovedForAll = (await readContract(walletClient, {
            address: config?.ENS_REGISTRY as `0x${string}`,
            abi: ensRegistryABI,
            functionName: 'isApprovedForAll',
            args: [walletAddress, config?.ENSCRIBE_CONTRACT],
          })) as boolean

          if (!isApprovedForAll) {
            steps.push({
              title: 'Give operator access',
              action: async () => {
                if (isSafeWallet) {
                  await writeContract(walletClient, {
                    address: config?.ENS_REGISTRY as `0x${string}`,
                    abi: ensRegistryABI,
                    functionName: 'setApprovalForAll',
                    args: [config?.ENSCRIBE_CONTRACT, true],
                    account: walletAddress,
                  })
                  const txn = 'safe wallet'
                  try {await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    '',
                    walletAddress,
                    name,
                    'setApprovalForAll',
                    txn,
                    'Ownable',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                  return txn
                } else {
                  const txn = await writeContract(walletClient, {
                    address: config?.ENS_REGISTRY as `0x${string}`,
                    abi: ensRegistryABI,
                    functionName: 'setApprovalForAll',
                    args: [config?.ENSCRIBE_CONTRACT, true],
                    account: walletAddress,
                  })
                  const txReceipt = await waitForTransactionReceipt(
                    walletClient,
                    {
                      hash: txn,
                    },
                  )
                  try {await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    '',
                    walletAddress,
                    name,
                    'setApprovalForAll',
                    txReceipt.transactionHash,
                    'Ownable',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                  return txn
                }
            },
          })
          }

          steps.push({
            title: 'Deploy and Set primary Name',
            action: async () => {
              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeploy',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txn = 'safe wallet' as `0x${string}`
                try {await logMetric(
                  corelationId,
                  Date.now(),
                  chainId,
                  '', // Will be updated in SetNameStepsModal
                  walletAddress,
                  name,
                  'setNameAndDeploy',
                  txn,
                  'Ownable',
                  opType,
                )} catch (err) {
                  setError('Failed to log metric')
                }
                return txn
              } else {
                const txn = await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeploy',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txReceipt = await waitForTransactionReceipt(
                  walletClient,
                  {
                    hash: txn,
                  },
                )
                const deployedContractAddress =
                  await getDeployedAddress(txReceipt)
                if (deployedContractAddress) {
                  try {await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    deployedContractAddress,
                    walletAddress,
                    name,
                    'setNameAndDeploy',
                    txReceipt.transactionHash,
                    'Ownable',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              }
            },
          })
        } else {
          const isWrapped = (await readContract(walletClient, {
            address: config?.NAME_WRAPPER as `0x${string}`,
            abi: nameWrapperABI,
            functionName: 'isWrapped',
            args: [parentNode],
          })) as boolean

          if (isWrapped) {
            // Wrapped Names
            const isApprovedForAll = (await readContract(walletClient, {
              address: config?.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'isApprovedForAll',
              args: [walletAddress, config?.ENSCRIBE_CONTRACT],
            })) as boolean

            if (!isApprovedForAll) {
              steps.push({
                title: 'Give operator access',
                action: async () => {
                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config?.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txn = 'safe wallet' as `0x${string}`
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txn,
                      'Ownable',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  } else {
                    const txn = await writeContract(walletClient, {
                      address: config?.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txReceipt = await waitForTransactionReceipt(
                      walletClient,
                      {
                        hash: txn,
                      },
                    )
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txReceipt.transactionHash,
                      'Ownable',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  }
                },
              })
            }
          } else {
            //Unwrapped Names
            const isApprovedForAll = (await readContract(walletClient, {
              address: config?.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'isApprovedForAll',
              args: [walletAddress, config?.ENSCRIBE_CONTRACT],
            })) as boolean

            if (!isApprovedForAll) {
              steps.push({
                title: 'Give operator access',
                action: async () => {
                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config?.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txn = 'safe wallet' as `0x${string}`
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txn,
                      'Ownable',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  } else {
                    const txn = await writeContract(walletClient, {
                      address: config?.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txReceipt = await waitForTransactionReceipt(
                      walletClient,
                      {
                        hash: txn,
                      },
                    )
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txReceipt.transactionHash,
                      'Ownable',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  }
                },
              })
            }
          }

          steps.push({
            title: 'Deploy and Set primary Name',
            action: async () => {
              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeploy',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txn = 'safe wallet' as `0x${string}`
                try {await logMetric(
                  corelationId,
                  Date.now(),
                  chainId,
                  '', // Will be updated in SetNameStepsModal
                  walletAddress,
                  name,
                  'setNameAndDeploy',
                  txn,
                  'Ownable',
                  opType,
                )} catch (err) {
                  setError('Failed to log metric')
                }
                return txn
              } else {
                const txn = await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeploy',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txReceipt = await waitForTransactionReceipt(
                  walletClient,
                  {
                    hash: txn,
                  },
                )
                const deployedContractAddress =
                  await getDeployedAddress(txReceipt)
                if (deployedContractAddress) {
                  try {await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    deployedContractAddress,
                    walletAddress,
                    name,
                    'setNameAndDeploy',
                    txReceipt.transactionHash,
                    'Ownable',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              }
            },
          })
        }

        setModalTitle('Deploy Contract and set Primary Name')
        setModalSubtitle(
          isSafeWallet
            ? 'Transactions will be executed in your Safe wallet app'
            : 'Running each step to finish naming this contract',
        )
        setModalSteps(steps)
        setModalOpen(true)
      } else if (isReverseClaimable) {
        if (isReverseSetter) {
          // step 1: Get operator access
          const isWrapped = (await readContract(walletClient, {
            address: config?.NAME_WRAPPER as `0x${string}`,
            abi: nameWrapperABI,
            functionName: 'isWrapped',
            args: [parentNode],
          })) as boolean

          if (isWrapped) {
            // Wrapped Names
            const isApprovedForAll = (await readContract(walletClient, {
              address: config?.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'isApprovedForAll',
              args: [walletAddress, config?.ENSCRIBE_CONTRACT],
            })) as boolean

            if (!isApprovedForAll) {
              steps.push({
                title: 'Give operator access',
                action: async () => {
                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config?.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txn = 'safe wallet' as `0x${string}`
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txn,
                      'ReverseSetter',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  } else {
                    const txn = await writeContract(walletClient, {
                      address: config?.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txReceipt = await waitForTransactionReceipt(
                      walletClient,
                      {
                        hash: txn,
                      },
                    )
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txReceipt.transactionHash,
                      'ReverseSetter',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  }
                },
              })
            }
          } else {
            //Unwrapped Names
            const isApprovedForAll = (await readContract(walletClient, {
              address: config?.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'isApprovedForAll',
              args: [walletAddress, config?.ENSCRIBE_CONTRACT],
            })) as boolean

            if (!isApprovedForAll) {
              steps.push({
                title: 'Give operator access',
                action: async () => {
                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config?.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txn = 'safe wallet' as `0x${string}`
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txn,
                      'ReverseSetter',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  } else {
                    const txn = await writeContract(walletClient, {
                      address: config?.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })

                    const txReceipt = await waitForTransactionReceipt(
                      walletClient,
                      {
                        hash: txn,
                      },
                    )
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txReceipt.transactionHash,
                      'ReverseSetter',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  }
                },
              })
            }
          }

          // step 2: set name & deploy contract via enscribe contract
          steps.push({
            title: 'Set name & Deploy contract',
            action: async () => {
              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeployReverseSetter',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txn = 'safe wallet'
                try {await logMetric(
                  corelationId,
                  Date.now(),
                  chainId,
                  '', // Will be updated in SetNameStepsModal
                  walletAddress,
                  name,
                  'setNameAndDeployReverseSetter',
                  txn,
                  'ReverseSetter',
                  opType,
                )} catch (err) {
                  setError('Failed to log metric')
                }
                return txn
              } else {
                const txn = await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeployReverseSetter',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                setTxHash(txn)

                const txReceipt = await waitForTransactionReceipt(
                  walletClient,
                  {
                    hash: txn,
                  },
                )
                const deployedContractAddress =
                  await getDeployedAddress(txReceipt)
                if (deployedContractAddress) {
                  setDeployedAddress(deployedContractAddress)
                  try {await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    deployedContractAddress,
                    walletAddress,
                    name,
                    'setNameAndDeployReverseSetter',
                    txReceipt.transactionHash,
                    'ReverseSetter',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              }
            },
          })
        } else {
          // default ReverseClaimable flow
          // step 1: Get operator access
          const isWrapped = (await readContract(walletClient, {
            address: config?.NAME_WRAPPER as `0x${string}`,
            abi: nameWrapperABI,
            functionName: 'isWrapped',
            args: [parentNode],
          })) as boolean

          if (isWrapped) {
            // Wrapped Names
            const isApprovedForAll = (await readContract(walletClient, {
              address: config?.NAME_WRAPPER as `0x${string}`,
              abi: nameWrapperABI,
              functionName: 'isApprovedForAll',
              args: [walletAddress, config?.ENSCRIBE_CONTRACT],
            })) as boolean

            if (!isApprovedForAll) {
              steps.push({
                title: 'Give operator access',
                action: async () => {
                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config?.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txn = 'safe wallet' as `0x${string}`
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txn,
                      'ReverseClaimer',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  } else {
                    const txn = await writeContract(walletClient, {
                      address: config?.NAME_WRAPPER as `0x${string}`,
                      abi: nameWrapperABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txReceipt = await waitForTransactionReceipt(
                      walletClient,
                      {
                        hash: txn,
                      },
                    )
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txReceipt.transactionHash,
                      'ReverseClaimer',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  }
                },
              })
            }
          } else {
            //Unwrapped Names
            const isApprovedForAll = (await readContract(walletClient, {
              address: config?.ENS_REGISTRY as `0x${string}`,
              abi: ensRegistryABI,
              functionName: 'isApprovedForAll',
              args: [walletAddress, config?.ENSCRIBE_CONTRACT],
            })) as boolean

            if (!isApprovedForAll) {
              steps.push({
                title: 'Give operator access',
                action: async () => {
                  if (isSafeWallet) {
                    await writeContract(walletClient, {
                      address: config?.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txn = 'safe wallet' as `0x${string}`
                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txn,
                      'ReverseClaimer',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  } else {
                    const txn = await writeContract(walletClient, {
                      address: config?.ENS_REGISTRY as `0x${string}`,
                      abi: ensRegistryABI,
                      functionName: 'setApprovalForAll',
                      args: [config?.ENSCRIBE_CONTRACT, true],
                      account: walletAddress,
                    })
                    const txReceipt = await waitForTransactionReceipt(
                      walletClient,
                      {
                        hash: txn,
                      },
                    )

                    try {await logMetric(
                      corelationId,
                      Date.now(),
                      chainId,
                      '',
                      walletAddress,
                      name,
                      'setApprovalForAll',
                      txReceipt.transactionHash,
                      'ReverseClaimer',
                      opType,
                    )} catch (err) {
                      setError('Failed to log metric')
                    }
                    return txn
                  }
                },
              })
            }
          }

          // step 2: set name & deploy contract via enscribe contract
          steps.push({
            title: 'Set name & Deploy contract',
            action: async () => {
              if (isSafeWallet) {
                await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeployReverseClaimer',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                const txn = 'safe wallet' as `0x${string}`
                try {await logMetric(
                  corelationId,
                  Date.now(),
                  chainId,
                  '', // Will be updated in SetNameStepsModal
                  walletAddress,
                  name,
                  'setNameAndDeployReverseClaimer',
                  txn,
                  'ReverseClaimer',
                  opType,
                )} catch (err) {
                  setError('Failed to log metric')
                }
                return txn
              } else {
                const txn = await writeContract(walletClient, {
                  address: config?.ENSCRIBE_CONTRACT as `0x${string}`,
                  abi: enscribeContractABI,
                  functionName: 'setNameAndDeployReverseClaimer',
                  args: [
                    finalBytecode,
                    labelNormalized,
                    parentNameNormalized,
                    parentNode,
                  ],
                  value: txCost,
                  account: walletAddress,
                })
                setTxHash(txn)

                const txReceipt = await waitForTransactionReceipt(
                  walletClient,
                  {
                    hash: txn as `0x${string}`,
                  },
                )
                const deployedContractAddress =
                  await getDeployedAddress(txReceipt)
                if (deployedContractAddress) {
                  setDeployedAddress(deployedContractAddress)
                  try {await logMetric(
                    corelationId,
                    Date.now(),
                    chainId,
                    deployedContractAddress,
                    walletAddress,
                    name,
                    'setNameAndDeployReverseClaimer',
                    txReceipt.transactionHash,
                    'ReverseClaimer',
                    opType,
                  )} catch (err) {
                    setError('Failed to log metric')
                  }
                }
                return txn
              }
            },
          })
        }

        setModalTitle('Deploy Contract and set Primary Name')
        setModalSubtitle(
          isSafeWallet
            ? 'Transactions will be executed in your Safe wallet app'
            : 'Complete each step to finish naming this contract',
        )
        setModalSteps(steps)
        setModalOpen(true)
      }
    } catch (err: any) {
      if (!isEmpty(deployedAddr)) {
        setError(
          "Your contract was deployed but the name wasn\'t set properly. Please use the 'Name Existing Contract' page to set the name of the contract. If you attempt to retry on this page, your contract will get deployed again with a different address.",
        )
      }
      setError(err?.code || 'Error deploying contract')
    } finally {
      setLoading(false)
    }
  }

  return {
    // Wallet/Chain state
    isConnected,
    chain,
    walletAddress,
    enscribeDomain,
    isSafeWallet,

    // Form state
    bytecode,
    setBytecode,
    label,
    setLabel,
    parentType,
    setParentType,
    parentName,
    setParentName,
    fetchingENS,
    txHash,
    deployedAddress,
    error,
    setError,
    loading,
    showENSModal,
    setShowENSModal,
    isValidBytecode,
    setIsValidBytecode,
    isOwnable,
    setIsOwnable,
    isReverseClaimable,
    setIsReverseClaimable,
    isReverseSetter,
    setIsReverseSetter,
    operatorAccess,
    setOperatorAccess,
    recordExists,
    setRecordExists,
    accessLoading,
    args,
    setArgs,
    abiText,
    setAbiText,
    modalOpen,
    setModalOpen,
    modalSteps,
    modalTitle,
    modalSubtitle,
    userOwnedDomains,
    isUnsupportedL2Chain,
    unsupportedL2Name,

    // Functions
    populateName,
    addArg,
    updateArg,
    removeArg,
    isEmpty,
    handleAbiInput,
    checkENSReverseResolution,
    recordExist,
    checkOperatorAccess,
    revokeOperatorAccess,
    grantOperatorAccess,
    deployContract,
    fetchUserOwnedDomains,
  }
}
