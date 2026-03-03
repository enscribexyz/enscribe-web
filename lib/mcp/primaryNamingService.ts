import { randomUUID } from 'crypto'
import {
  encodeFunctionData,
  isAddress,
  namehash,
  parseAbi,
  parseTransaction,
  zeroAddress,
} from 'viem'
import { getEnsName, readContract } from 'viem/actions'
import { normalize } from 'viem/ens'
import { getPublicClient } from '@/lib/viemClient'
import { checkContractOwner, checkOwnable, checkReverseClaimable } from '@/utils/contractChecks'
import { CHAINS, CONTRACTS } from '@/utils/constants'
import {
  validateCallTargetAndSelectorForChain,
  type PolicyValidationResult,
} from '@/lib/mcp/policy'
import {
  createPrimaryNameOperationStore,
  type PrimaryNameOperationStore,
} from '@/lib/mcp/operationStore'

const ENS_REGISTRY_ABI = parseAbi([
  'function resolver(bytes32 node) view returns (address)',
])

const RESOLVER_ABI = parseAbi([
  'function addr(bytes32 node) view returns (address)',
  'function setAddr(bytes32 node, address a)',
  'function setName(bytes32 node, string name)',
])

const L1_REVERSE_REGISTRAR_ABI = parseAbi([
  'function setNameForAddr(address addr, address owner, address resolver, string name)',
])

const L2_REVERSE_REGISTRAR_ABI = parseAbi([
  'function nameForAddr(address addr) view returns (string)',
  'function setNameForAddr(address addr, string name)',
])

const MAINNET_ENS_CHAINS = new Set<number>([CHAINS.MAINNET, CHAINS.SEPOLIA])

export type PreflightInput = {
  chainId: number
  walletAddress: string
  contractAddress: string
  ensName: string
}

export type BuildPlanInput = PreflightInput & {
  allowForwardOnly?: boolean
}

export type SubmitSignedTxInput = {
  chainId: number
  signedTxs: string[]
  operationId?: string
}

export type StatusInput = {
  chainId: number
  txHashes?: string[]
  contractAddress?: string
  ensName?: string
}

type PlanStep = {
  id: string
  chainId: number
  to: `0x${string}`
  data: `0x${string}`
  value: '0x0'
  description: string
  method: string
}

type ResolutionSnapshot = {
  normalizedName: string
  nameNode: `0x${string}`
  resolverAddress: string
  forwardAddress: string | null
  reverseName: string | null
}

function requireAddress(value: string, field: string): `0x${string}` {
  if (!isAddress(value)) {
    throw new Error(`Invalid ${field}.`)
  }
  return value
}

function requireTxHash(value: string): `0x${string}` {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error('Invalid txHash.')
  }
  return value as `0x${string}`
}

function normalizeEnsName(value: string): string {
  if (typeof value !== 'string') {
    throw new Error('ENS name is required.')
  }
  const trimmed = value.trim().replace(/\.$/, '')
  if (!trimmed) {
    throw new Error('ENS name is required.')
  }
  return normalize(trimmed)
}

function ensureChainConfig(chainId: number) {
  const config = CONTRACTS[chainId]
  if (!config) {
    throw new Error(`Unsupported chainId: ${chainId}.`)
  }
  if (!config.ENS_REGISTRY || !config.PUBLIC_RESOLVER || !config.RPC_ENDPOINT) {
    throw new Error(`Chain ${chainId} is missing ENS configuration.`)
  }
  return config
}

function isMainnetEnsChain(chainId: number): boolean {
  return MAINNET_ENS_CHAINS.has(chainId)
}

function compareName(a: string | null, b: string): boolean {
  if (!a) return false
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function validateChainAndAddresses(input: PreflightInput): {
  config: (typeof CONTRACTS)[number]
  walletAddress: `0x${string}`
  contractAddress: `0x${string}`
  normalizedName: string
  nameNode: `0x${string}`
} {
  const config = ensureChainConfig(input.chainId)
  const walletAddress = requireAddress(input.walletAddress, 'walletAddress')
  const contractAddress = requireAddress(input.contractAddress, 'contractAddress')
  const normalizedName = normalizeEnsName(input.ensName)
  const nameNode = namehash(normalizedName)

  return { config, walletAddress, contractAddress, normalizedName, nameNode }
}

async function getResolverAddress(args: {
  chainId: number
  ensRegistry: string
  node: `0x${string}`
}): Promise<string> {
  const client = getPublicClient(args.chainId)
  if (!client) throw new Error(`No RPC client for chain ${args.chainId}.`)

  const resolverAddress = (await readContract(client, {
    address: args.ensRegistry as `0x${string}`,
    abi: ENS_REGISTRY_ABI,
    functionName: 'resolver',
    args: [args.node],
  })) as string

  return resolverAddress
}

async function getForwardAddress(args: {
  chainId: number
  resolverAddress: string
  node: `0x${string}`
}): Promise<string | null> {
  if (!isAddress(args.resolverAddress) || args.resolverAddress === zeroAddress) {
    return null
  }

  const client = getPublicClient(args.chainId)
  if (!client) return null

  try {
    const addr = (await readContract(client, {
      address: args.resolverAddress as `0x${string}`,
      abi: RESOLVER_ABI,
      functionName: 'addr',
      args: [args.node],
    })) as string

    if (!isAddress(addr) || addr === zeroAddress) {
      return null
    }

    return addr
  } catch {
    return null
  }
}

async function getReverseName(args: {
  chainId: number
  contractAddress: `0x${string}`
  l2ReverseRegistrar: string
}): Promise<string | null> {
  const client = getPublicClient(args.chainId)
  if (!client) return null

  if (isMainnetEnsChain(args.chainId)) {
    try {
      const name = await getEnsName(client, { address: args.contractAddress })
      return name ?? null
    } catch {
      return null
    }
  }

  if (!isAddress(args.l2ReverseRegistrar)) {
    return null
  }

  try {
    const name = (await readContract(client, {
      address: args.l2ReverseRegistrar as `0x${string}`,
      abi: L2_REVERSE_REGISTRAR_ABI,
      functionName: 'nameForAddr',
      args: [args.contractAddress],
    })) as string

    if (!name) return null
    return name
  } catch {
    return null
  }
}

async function getResolutionSnapshot(args: {
  chainId: number
  ensRegistry: string
  l2ReverseRegistrar: string
  nameNode: `0x${string}`
  normalizedName: string
  contractAddress: `0x${string}`
}): Promise<ResolutionSnapshot> {
  const resolverAddress = await getResolverAddress({
    chainId: args.chainId,
    ensRegistry: args.ensRegistry,
    node: args.nameNode,
  })

  const forwardAddress = await getForwardAddress({
    chainId: args.chainId,
    resolverAddress,
    node: args.nameNode,
  })

  const reverseName = await getReverseName({
    chainId: args.chainId,
    contractAddress: args.contractAddress,
    l2ReverseRegistrar: args.l2ReverseRegistrar,
  })

  return {
    normalizedName: args.normalizedName,
    nameNode: args.nameNode,
    resolverAddress,
    forwardAddress,
    reverseName,
  }
}

function canUseReverseClaimerPath(args: {
  chainId: number
  isReverseClaimable: boolean
}): boolean {
  // Minimal server supports reverse-claimer flow on L1-style ENS chains.
  return isMainnetEnsChain(args.chainId) && args.isReverseClaimable
}

function validatePolicyOrThrow(result: PolicyValidationResult): void {
  if (!result.ok) {
    throw new Error(result.reason)
  }
}

export class PrimaryNamingMcpService {
  constructor(
    private readonly operationStore: PrimaryNameOperationStore =
      createPrimaryNameOperationStore(),
  ) {}

  async preflight(input: PreflightInput) {
    const { config, walletAddress, contractAddress, normalizedName, nameNode } =
      validateChainAndAddresses(input)

    const client = getPublicClient(input.chainId)
    if (!client) {
      throw new Error(`No RPC client available for chainId ${input.chainId}.`)
    }

    const [isOwnable, isContractOwner, isReverseClaimable] = await Promise.all([
      checkOwnable(client, contractAddress),
      checkContractOwner(
        client,
        contractAddress,
        walletAddress,
        config.ENS_REGISTRY,
      ),
      checkReverseClaimable(
        client,
        contractAddress,
        walletAddress,
        config.ENS_REGISTRY,
      ),
    ])

    const snapshot = await getResolutionSnapshot({
      chainId: input.chainId,
      ensRegistry: config.ENS_REGISTRY,
      l2ReverseRegistrar: config.L2_REVERSE_REGISTRAR,
      nameNode,
      normalizedName,
      contractAddress,
    })

    const canSetViaOwnable = isOwnable && isContractOwner
    const canSetViaReverseClaimer = canUseReverseClaimerPath({
      chainId: input.chainId,
      isReverseClaimable,
    })

    const warnings: string[] = []

    if (snapshot.resolverAddress === zeroAddress) {
      warnings.push(
        'ENS name does not have a resolver set. Forward resolution cannot be updated until resolver is configured.',
      )
    }

    if (isReverseClaimable && !canSetViaReverseClaimer) {
      warnings.push(
        'Reverse-claimer path is only enabled on Mainnet/Sepolia in this minimal MCP implementation.',
      )
    }

    const recommendedPath = canSetViaOwnable
      ? 'ownable'
      : canSetViaReverseClaimer
        ? 'reverse-claimer'
        : 'none'

    return {
      chainId: input.chainId,
      contractAddress,
      walletAddress,
      ensName: normalizedName,
      nameNode,
      resolverAddress: snapshot.resolverAddress,
      isOwnable,
      isContractOwner,
      isReverseClaimable,
      canSetPrimaryName: canSetViaOwnable || canSetViaReverseClaimer,
      recommendedPath,
      forwardResolution: {
        currentAddress: snapshot.forwardAddress,
        alreadySet:
          snapshot.forwardAddress?.toLowerCase() === contractAddress.toLowerCase(),
      },
      reverseResolution: {
        currentName: snapshot.reverseName,
        alreadySet: compareName(snapshot.reverseName, normalizedName),
      },
      warnings,
    }
  }

  async buildPlan(input: BuildPlanInput) {
    const preflight = await this.preflight(input)
    const config = ensureChainConfig(input.chainId)

    if (!preflight.canSetPrimaryName && !input.allowForwardOnly) {
      throw new Error(
        'Primary name cannot be set by current wallet/contract permissions. Set allowForwardOnly=true to generate forward-only plan.',
      )
    }

    const steps: PlanStep[] = []

    if (!preflight.forwardResolution.alreadySet) {
      if (!isAddress(preflight.resolverAddress) || preflight.resolverAddress === zeroAddress) {
        throw new Error(
          'Resolver is not configured for this ENS name. Cannot generate forward-resolution transaction.',
        )
      }

      steps.push({
        id: 'set-forward-resolution',
        chainId: input.chainId,
        to: preflight.resolverAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: RESOLVER_ABI,
          functionName: 'setAddr',
          args: [preflight.nameNode, preflight.contractAddress],
        }),
        value: '0x0',
        method: 'setAddr(bytes32,address)',
        description: `Set forward resolution for ${preflight.ensName} -> ${preflight.contractAddress}`,
      })
    }

    if (!preflight.reverseResolution.alreadySet && preflight.canSetPrimaryName) {
      if (preflight.recommendedPath === 'ownable') {
        if (isMainnetEnsChain(input.chainId)) {
          if (!isAddress(config.REVERSE_REGISTRAR)) {
            throw new Error('Reverse registrar is not configured for this chain.')
          }
          if (!isAddress(preflight.resolverAddress) || preflight.resolverAddress === zeroAddress) {
            throw new Error(
              'A valid resolver is required to set primary name on this chain.',
            )
          }

          steps.push({
            id: 'set-primary-name-ownable',
            chainId: input.chainId,
            to: config.REVERSE_REGISTRAR as `0x${string}`,
            data: encodeFunctionData({
              abi: L1_REVERSE_REGISTRAR_ABI,
              functionName: 'setNameForAddr',
              args: [
                preflight.contractAddress,
                preflight.walletAddress,
                preflight.resolverAddress as `0x${string}`,
                preflight.ensName,
              ],
            }),
            value: '0x0',
            method: 'setNameForAddr(address,address,address,string)',
            description: `Set ${preflight.ensName} as primary name for ${preflight.contractAddress}`,
          })
        } else {
          if (!isAddress(config.L2_REVERSE_REGISTRAR)) {
            throw new Error('L2 reverse registrar is not configured for this chain.')
          }

          steps.push({
            id: 'set-primary-name-l2-ownable',
            chainId: input.chainId,
            to: config.L2_REVERSE_REGISTRAR as `0x${string}`,
            data: encodeFunctionData({
              abi: L2_REVERSE_REGISTRAR_ABI,
              functionName: 'setNameForAddr',
              args: [preflight.contractAddress, preflight.ensName],
            }),
            value: '0x0',
            method: 'setNameForAddr(address,string)',
            description: `Set ${preflight.ensName} as L2 primary name for ${preflight.contractAddress}`,
          })
        }
      } else if (preflight.recommendedPath === 'reverse-claimer') {
        if (!isAddress(preflight.resolverAddress) || preflight.resolverAddress === zeroAddress) {
          throw new Error(
            'Reverse-claimer path requires a valid resolver for the ENS name.',
          )
        }

        const reverseNode = namehash(
          `${preflight.contractAddress.slice(2).toLowerCase()}.addr.reverse`,
        )

        steps.push({
          id: 'set-primary-name-reverse-claimer',
          chainId: input.chainId,
          to: preflight.resolverAddress as `0x${string}`,
          data: encodeFunctionData({
            abi: RESOLVER_ABI,
            functionName: 'setName',
            args: [reverseNode, preflight.ensName],
          }),
          value: '0x0',
          method: 'setName(bytes32,string)',
          description: `Set reverse record ${preflight.contractAddress} -> ${preflight.ensName}`,
        })
      }
    }

    const operationId = randomUUID()

    await this.operationStore.onPlanCreated({
      operationId,
      chainId: input.chainId,
      contractAddress: preflight.contractAddress,
      ensName: preflight.ensName,
      createdAt: new Date().toISOString(),
    })

    return {
      operationId,
      chainId: input.chainId,
      plan: steps,
      preflight,
      isNoop: steps.length === 0,
      notes:
        steps.length === 0
          ? ['No on-chain writes required. Forward and reverse mappings already match.']
          : [],
      next: {
        submitTool: 'ens_submit_signed_txs',
        statusTool: 'ens_get_primary_name_status',
      },
    }
  }

  async submitSignedTxs(input: SubmitSignedTxInput) {
    const config = ensureChainConfig(input.chainId)
    if (!input.signedTxs.length) {
      throw new Error('signedTxs cannot be empty.')
    }

    const client = getPublicClient(input.chainId)
    if (!client) {
      throw new Error(`No RPC client available for chainId ${input.chainId}.`)
    }

    const txHashes: `0x${string}`[] = []

    for (const rawTx of input.signedTxs) {
      if (!rawTx || !rawTx.startsWith('0x')) {
        throw new Error('Each signed transaction must be a 0x-prefixed serialized blob.')
      }

      const parsed = parseTransaction(rawTx as `0x${string}`)

      if (parsed.chainId !== undefined && Number(parsed.chainId) !== input.chainId) {
        throw new Error(
          `Signed tx chainId mismatch. Expected ${input.chainId}, got ${String(parsed.chainId)}.`,
        )
      }

      if (!parsed.to) {
        throw new Error('Contract creation transactions are not allowed by this MCP tool.')
      }

      if (!parsed.data) {
        throw new Error('Transaction calldata is required.')
      }

      const policyResult = validateCallTargetAndSelectorForChain({
        chainId: input.chainId,
        to: parsed.to,
        data: parsed.data,
      })
      validatePolicyOrThrow(policyResult)

      if (parsed.value && parsed.value > 0n) {
        throw new Error('Non-zero ETH value transfers are not allowed by this MCP tool.')
      }

      // Optional sanity check that chain config exists for all target policy addresses.
      if (!config.PUBLIC_RESOLVER || !config.REVERSE_REGISTRAR) {
        throw new Error('Chain config is incomplete for primary naming.')
      }

      const hash = await client.sendRawTransaction({
        serializedTransaction: rawTx as `0x${string}`,
      })
      txHashes.push(hash)
    }

    const operationId = input.operationId ?? randomUUID()

    await this.operationStore.onTxSubmitted({
      operationId,
      txHashes,
      submittedAt: new Date().toISOString(),
    })

    return {
      operationId,
      chainId: input.chainId,
      txHashes,
      next: {
        statusTool: 'ens_get_primary_name_status',
      },
    }
  }

  async getStatus(input: StatusInput) {
    const config = ensureChainConfig(input.chainId)
    const client = getPublicClient(input.chainId)

    if (!client) {
      throw new Error(`No RPC client available for chainId ${input.chainId}.`)
    }

    const txStatuses: Array<{
      hash: string
      state: 'pending' | 'success' | 'reverted' | 'unknown'
      blockNumber?: string
      error?: string
    }> = []

    for (const hash of input.txHashes ?? []) {
      try {
        const receipt = await client.getTransactionReceipt({
          hash: requireTxHash(hash),
        })

        txStatuses.push({
          hash,
          state: receipt.status === 'success' ? 'success' : 'reverted',
          blockNumber: receipt.blockNumber.toString(),
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        txStatuses.push({
          hash,
          state: message.includes('not found') ? 'pending' : 'unknown',
          error: message,
        })
      }
    }

    let verification:
      | {
          ensName: string
          contractAddress: `0x${string}`
          forwardMatches: boolean
          reverseMatches: boolean
          resolverAddress: string
          currentForwardAddress: string | null
          currentReverseName: string | null
        }
      | undefined

    if (input.contractAddress && input.ensName) {
      const contractAddress = requireAddress(input.contractAddress, 'contractAddress')
      const normalizedName = normalizeEnsName(input.ensName)
      const nameNode = namehash(normalizedName)

      const snapshot = await getResolutionSnapshot({
        chainId: input.chainId,
        ensRegistry: config.ENS_REGISTRY,
        l2ReverseRegistrar: config.L2_REVERSE_REGISTRAR,
        nameNode,
        normalizedName,
        contractAddress,
      })

      verification = {
        ensName: normalizedName,
        contractAddress,
        forwardMatches:
          snapshot.forwardAddress?.toLowerCase() === contractAddress.toLowerCase(),
        reverseMatches: compareName(snapshot.reverseName, normalizedName),
        resolverAddress: snapshot.resolverAddress,
        currentForwardAddress: snapshot.forwardAddress,
        currentReverseName: snapshot.reverseName,
      }
    }

    const hasPendingTx = txStatuses.some((tx) => tx.state === 'pending')
    const hasFailedTx = txStatuses.some((tx) => tx.state === 'reverted')
    const verificationComplete =
      verification?.forwardMatches === true && verification.reverseMatches === true

    return {
      chainId: input.chainId,
      txStatuses,
      verification,
      summary: {
        hasPendingTx,
        hasFailedTx,
        verificationComplete,
        status: verificationComplete
          ? 'completed'
          : hasFailedTx
            ? 'failed'
            : hasPendingTx
              ? 'pending'
              : txStatuses.length > 0
                ? 'confirmed'
                : 'idle',
      },
    }
  }
}
