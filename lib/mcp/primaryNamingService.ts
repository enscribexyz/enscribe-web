import { randomUUID } from 'crypto'
import {
  encodeFunctionData,
  isAddress,
  keccak256,
  namehash,
  parseAbi,
  parseTransaction,
  toHex,
  toBytes,
  zeroAddress,
} from 'viem'
import { getEnsAddress, getEnsName, readContract } from 'viem/actions'
import { normalize } from 'viem/ens'
import { L2_CHAIN_NAMES, type L2ChainName } from '@/lib/chains'
import { getL2ChainId } from '@/lib/l2ChainConfig'
import { getPublicClient } from '@/lib/viemClient'
import {
  checkContractOwner,
  checkContractOwnerOnL2,
  checkOwnable,
  checkOwnableOnL2,
  checkReverseClaimable,
} from '@/utils/contractChecks'
import { CHAINS, CONTRACTS } from '@/utils/constants'
import { checkOperatorApproval } from '@/utils/operatorAccess'
import {
  groupEntriesForBatching,
  isZeroAddressLike,
  parseAndValidateBatchCsv,
  stripParentSuffix,
} from '@/lib/batchNaming'
import {
  validateCallTargetAndSelectorForChain,
  type PolicyValidationResult,
} from '@/lib/mcp/policy'
import {
  createPrimaryNameOperationStore,
  type PrimaryNameOperationStore,
} from '@/lib/mcp/operationStore'

const ENS_REGISTRY_ABI = parseAbi([
  'function owner(bytes32 node) view returns (address)',
  'function resolver(bytes32 node) view returns (address)',
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
  'function setApprovalForAll(address operator, bool approved)',
])

const NAME_WRAPPER_ABI = parseAbi([
  'function isWrapped(bytes32 node) view returns (bool)',
  'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry) returns (bytes32)',
  'function setApprovalForAll(address operator, bool approved)',
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

const ENSCRIBE_V2_ABI = parseAbi([
  'function pricing() view returns (uint256)',
  'function setNameBatch(address[] contractAddresses, string[] labels, string parentName) payable returns (bool)',
  'function setNameBatch(address[] contractAddresses, string[] labels, string parentName, uint256[] coinTypes) payable returns (bool)',
])

const MAINNET_ENS_CHAINS = new Set<number>([CHAINS.MAINNET, CHAINS.SEPOLIA])
const BATCH_UNSUPPORTED_CHAINS = new Set<number>([
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
])

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

export type BatchCsvNamingInput = {
  chainId: number
  walletAddress: string
  csvText: string
  parentName?: string
  skipL1Naming?: boolean
  selectedL2ChainNames?: string[]
}

type PlanStep = {
  id: string
  chainId: number
  to: `0x${string}`
  data: `0x${string}`
  value: `0x${string}`
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

type EnsNameParts = {
  label: string
  parentName: string
  parentNode: `0x${string}`
  labelHash: `0x${string}`
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
  try {
    const normalized = normalize(trimmed)
    if (typeof normalized === 'string' && normalized.trim()) {
      return normalized
    }
  } catch {
    // Fall back to ASCII validation below.
  }

  // Graceful fallback for plain ASCII ENS names if normalization library fails.
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(trimmed)) {
    return trimmed.toLowerCase()
  }

  throw new Error('ENS name normalization failed.')
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
  nameParts: EnsNameParts
} {
  const config = ensureChainConfig(input.chainId)
  const walletAddress = requireAddress(input.walletAddress, 'walletAddress')
  const contractAddress = requireAddress(input.contractAddress, 'contractAddress')
  const normalizedName = normalizeEnsName(input.ensName)
  const labels = normalizedName.split('.').filter(Boolean)
  if (labels.length < 2) {
    throw new Error('ENS name must include at least one parent label.')
  }

  const label = labels[0]
  const parentName = labels.slice(1).join('.')
  const nameNode = namehash(normalizedName)
  const parentNode = namehash(parentName)
  const labelHash = keccak256(toBytes(label))

  return {
    config,
    walletAddress,
    contractAddress,
    normalizedName,
    nameNode,
    nameParts: {
      label,
      parentName,
      parentNode,
      labelHash,
    },
  }
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

async function getNodeOwner(args: {
  chainId: number
  ensRegistry: string
  node: `0x${string}`
}): Promise<string> {
  const client = getPublicClient(args.chainId)
  if (!client) throw new Error(`No RPC client for chain ${args.chainId}.`)

  const owner = (await readContract(client, {
    address: args.ensRegistry as `0x${string}`,
    abi: ENS_REGISTRY_ABI,
    functionName: 'owner',
    args: [args.node],
  })) as string

  return owner
}

async function isParentWrapped(args: {
  chainId: number
  nameWrapper: string
  parentNode: `0x${string}`
}): Promise<boolean> {
  if (!isAddress(args.nameWrapper)) return false

  const client = getPublicClient(args.chainId)
  if (!client) return false

  try {
    return (await readContract(client, {
      address: args.nameWrapper as `0x${string}`,
      abi: NAME_WRAPPER_ABI,
      functionName: 'isWrapped',
      args: [args.parentNode],
    })) as boolean
  } catch {
    return false
  }
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
  const client = getPublicClient(args.chainId)
  if (!client) throw new Error(`No RPC client for chain ${args.chainId}.`)

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

  // Fallback: some names may resolve through wildcard/universal resolution even
  // when the node resolver in registry is unset. This avoids false negatives in
  // "already set" detection.
  let fallbackForwardAddress: string | null = null
  if (!forwardAddress && resolverAddress === zeroAddress) {
    try {
      const resolved = await getEnsAddress(client, {
        name: args.normalizedName,
      })
      if (resolved && isAddress(resolved) && resolved !== zeroAddress) {
        fallbackForwardAddress = resolved
      }
    } catch {
      // ignore fallback errors and keep null
    }
  }

  return {
    normalizedName: args.normalizedName,
    nameNode: args.nameNode,
    resolverAddress,
    forwardAddress: forwardAddress ?? fallbackForwardAddress,
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

type PreparedBatchInput = {
  chainId: number
  walletAddress: `0x${string}`
  config: (typeof CONTRACTS)[number]
  parentName: string
  csvIssues: Array<{ rowNumber: number; field: 'row' | 'address' | 'name'; message: string }>
  validEntries: Array<{
    id: string
    address: string
    label: string
    addressError?: string
    labelError?: string
  }>
  groupedEntries: Array<{
    parentName: string
    entries: Array<{
      id: string
      address: string
      label: string
      addressError?: string
      labelError?: string
    }>
    level: number
  }>
  skipL1Naming: boolean
  selectedL2ChainNames: L2ChainName[]
  uniqueCoinTypes: bigint[]
  hasOperatorAccess: boolean
}

function normalizeSelectedL2Chains(values?: string[]): L2ChainName[] {
  if (!Array.isArray(values)) {
    return []
  }

  const allowed = new Set<string>(L2_CHAIN_NAMES)
  const out: L2ChainName[] = []

  for (const value of values) {
    if (!allowed.has(value)) {
      continue
    }
    if (out.includes(value as L2ChainName)) {
      continue
    }
    out.push(value as L2ChainName)
  }

  return out
}

function isUnsupportedBatchChain(chainId: number): boolean {
  return BATCH_UNSUPPORTED_CHAINS.has(chainId)
}

function sanitizeEnvAddress(value: string | undefined): string {
  if (!value) {
    return ''
  }
  const trimmed = value.trim()
  return trimmed.replace(/^['"]|['"]$/g, '')
}

function resolveBatchEnscribeV2Address(chainId: number, configured: string): string {
  const fromConfig = sanitizeEnvAddress(configured)
  if (isAddress(fromConfig)) {
    return fromConfig
  }

  const envCandidatesByChain: Record<number, string[]> = {
    [CHAINS.MAINNET]: ['NEXT_PUBLIC_ENSCRIBE_V2_CONTRACT', 'ENSCRIBE_V2_CONTRACT'],
    [CHAINS.SEPOLIA]: [
      'NEXT_PUBLIC_ENSCRIBE_V2_CONTRACT_SEPOLIA',
      'ENSCRIBE_V2_CONTRACT_SEPOLIA',
    ],
  }

  const candidateKeys = envCandidatesByChain[chainId] ?? []
  for (const key of candidateKeys) {
    const candidate = sanitizeEnvAddress(process.env[key])
    if (isAddress(candidate)) {
      return candidate
    }
  }

  return fromConfig
}

export class PrimaryNamingMcpService {
  constructor(
    private readonly operationStore: PrimaryNameOperationStore =
      createPrimaryNameOperationStore(),
  ) {}

  private async prepareBatchInput(input: BatchCsvNamingInput): Promise<PreparedBatchInput> {
    const baseConfig = ensureChainConfig(input.chainId)
    const enscribeV2Address = resolveBatchEnscribeV2Address(
      input.chainId,
      baseConfig.ENSCRIBE_V2_CONTRACT,
    )
    const config = {
      ...baseConfig,
      ENSCRIBE_V2_CONTRACT: enscribeV2Address,
    }
    const walletAddress = requireAddress(input.walletAddress, 'walletAddress')

    if (isUnsupportedBatchChain(input.chainId)) {
      throw new Error(
        `Batch naming from AI is only supported when connected to Ethereum Mainnet (1) or Sepolia (11155111). Received chainId ${input.chainId}.`,
      )
    }

    if (!input.csvText || !input.csvText.trim()) {
      throw new Error('csvText is required.')
    }

    if (!isAddress(config.ENSCRIBE_V2_CONTRACT)) {
      throw new Error(
        `ENSCRIBE_V2_CONTRACT is not configured for chainId ${input.chainId}.`,
      )
    }

    const parsed = parseAndValidateBatchCsv({
      csvText: input.csvText,
      parentName: input.parentName,
      idPrefix: 'batch',
    })

    const parentName = parsed.inferredParentName
    if (!parentName) {
      throw new Error(
        'Could not determine a parent domain from CSV rows. Include full ENS names under a common parent.',
      )
    }

    const validEntries = parsed.entries.filter(
      (entry) =>
        !entry.addressError &&
        !entry.labelError &&
        Boolean(entry.address) &&
        Boolean(entry.label) &&
        isAddress(entry.address),
    )

    const groupedEntries = groupEntriesForBatching(validEntries, parentName, (name) => ({
      id: `zero-${name}`,
      address: zeroAddress,
      label: name,
    }))

    const skipL1Naming = Boolean(input.skipL1Naming)
    const selectedL2ChainNames = normalizeSelectedL2Chains(input.selectedL2ChainNames)

    const coinTypes: bigint[] = []
    if (!skipL1Naming) {
      coinTypes.push(60n)
    }

    const isL1Mainnet = input.chainId === CHAINS.MAINNET
    for (const chainName of selectedL2ChainNames) {
      const l2ChainId = getL2ChainId(chainName, isL1Mainnet)
      const coinType = CONTRACTS[l2ChainId]?.COIN_TYPE
      if (!coinType) {
        continue
      }
      coinTypes.push(BigInt(coinType))
    }

    const uniqueCoinTypes = [...new Set(coinTypes)]
    const client = getPublicClient(input.chainId)
    const hasOperatorAccess =
      client &&
      isAddress(config.ENSCRIBE_V2_CONTRACT) &&
      isAddress(config.ENS_REGISTRY) &&
      Boolean(parentName)
        ? await checkOperatorApproval({
            client,
            walletAddress,
            enscribeContract: config.ENSCRIBE_V2_CONTRACT,
            ensRegistry: config.ENS_REGISTRY,
            nameWrapper: config.NAME_WRAPPER,
            name: parentName,
            chainId: input.chainId,
          })
        : false

    return {
      chainId: input.chainId,
      walletAddress,
      config,
      parentName,
      csvIssues: parsed.issues,
      validEntries,
      groupedEntries,
      skipL1Naming,
      selectedL2ChainNames,
      uniqueCoinTypes,
      hasOperatorAccess,
    }
  }

  async preflightBatchNaming(input: BatchCsvNamingInput) {
    const prepared = await this.prepareBatchInput(input)

    return {
      chainId: prepared.chainId,
      walletAddress: prepared.walletAddress,
      parentName: prepared.parentName,
      issueCount: prepared.csvIssues.length,
      issues: prepared.csvIssues,
      totalRows: prepared.validEntries.length + prepared.csvIssues.length,
      validEntries: prepared.validEntries.length,
      batchCount: prepared.groupedEntries.length,
      skipL1Naming: prepared.skipL1Naming,
      selectedL2ChainNames: prepared.selectedL2ChainNames,
      coinTypes: prepared.uniqueCoinTypes.map((coinType) => coinType.toString()),
      hasOperatorAccess: prepared.hasOperatorAccess,
      canProceed:
        prepared.csvIssues.length === 0 &&
        prepared.validEntries.length > 0 &&
        prepared.groupedEntries.length > 0,
      warnings:
        prepared.csvIssues.length > 0
          ? ['CSV contains validation issues. Fix them before signing transactions.']
          : [],
    }
  }

  async buildBatchNamingPlan(input: BatchCsvNamingInput) {
    const prepared = await this.prepareBatchInput(input)
    if (prepared.csvIssues.length > 0) {
      const firstIssue = prepared.csvIssues[0]
      throw new Error(`CSV validation failed at row ${firstIssue.rowNumber}: ${firstIssue.message}`)
    }

    if (prepared.validEntries.length === 0 || prepared.groupedEntries.length === 0) {
      throw new Error('No valid CSV rows available for batch naming.')
    }

    const pricing = (await readContract(getPublicClient(input.chainId)!, {
      address: prepared.config.ENSCRIBE_V2_CONTRACT as `0x${string}`,
      abi: ENSCRIBE_V2_ABI,
      functionName: 'pricing',
      args: [],
    })) as bigint

    const pricingHex = toHex(pricing) as `0x${string}`
    const steps: PlanStep[] = []

    const parentNode = namehash(prepared.parentName)
    const parentWrapped = await isParentWrapped({
      chainId: prepared.chainId,
      nameWrapper: prepared.config.NAME_WRAPPER,
      parentNode,
    })
    const approvalTarget = parentWrapped
      ? prepared.config.NAME_WRAPPER
      : prepared.config.ENS_REGISTRY

    if (!prepared.hasOperatorAccess) {
      steps.push({
        id: 'grant-operator-access',
        chainId: prepared.chainId,
        to: approvalTarget as `0x${string}`,
        data: encodeFunctionData({
          abi: parentWrapped ? NAME_WRAPPER_ABI : ENS_REGISTRY_ABI,
          functionName: 'setApprovalForAll',
          args: [prepared.config.ENSCRIBE_V2_CONTRACT as `0x${string}`, true],
        }),
        value: '0x0',
        description: `Grant operator access on ${prepared.parentName}`,
        method: 'setApprovalForAll(address,bool)',
      })
    }

    for (let index = 0; index < prepared.groupedEntries.length; index++) {
      const batch = prepared.groupedEntries[index]
      const labels = batch.entries.map((entry) =>
        stripParentSuffix(entry.label, batch.parentName),
      )
      const addresses = batch.entries.map((entry) => entry.address as `0x${string}`)
      const usesDefaultCoinType =
        prepared.uniqueCoinTypes.length === 1 && prepared.uniqueCoinTypes[0] === 60n

      const data = usesDefaultCoinType
        ? encodeFunctionData({
            abi: ENSCRIBE_V2_ABI,
            functionName: 'setNameBatch',
            args: [addresses, labels, batch.parentName],
          })
        : encodeFunctionData({
            abi: ENSCRIBE_V2_ABI,
            functionName: 'setNameBatch',
            args: [addresses, labels, batch.parentName, prepared.uniqueCoinTypes],
          })

      steps.push({
        id: `set-name-batch-${index + 1}`,
        chainId: prepared.chainId,
        to: prepared.config.ENSCRIBE_V2_CONTRACT as `0x${string}`,
        data,
        value: pricingHex,
        description: `Set ${batch.entries.length} subname(s) under ${batch.parentName}`,
        method: 'setNameBatch',
      })
    }

    const l1Client = getPublicClient(prepared.chainId)
    if (!prepared.skipL1Naming && l1Client && isAddress(prepared.config.REVERSE_REGISTRAR)) {
      const allEntries = prepared.groupedEntries.flatMap((batch) => batch.entries)
      for (const entry of allEntries) {
        if (!entry.address || isZeroAddressLike(entry.address)) {
          continue
        }

        const isOwnable = await checkOwnable(l1Client, entry.address)
        let canSetReverse = false
        if (isOwnable) {
          canSetReverse = await checkContractOwner(
            l1Client,
            entry.address,
            prepared.walletAddress,
            prepared.config.ENS_REGISTRY,
          )
        } else {
          canSetReverse = await checkReverseClaimable(
            l1Client,
            entry.address,
            prepared.walletAddress,
            prepared.config.ENS_REGISTRY,
          )
        }

        if (!canSetReverse) {
          continue
        }

        steps.push({
          id: `set-reverse-l1-${entry.address.toLowerCase()}`,
          chainId: prepared.chainId,
          to: prepared.config.REVERSE_REGISTRAR as `0x${string}`,
          data: encodeFunctionData({
            abi: L1_REVERSE_REGISTRAR_ABI,
            functionName: 'setNameForAddr',
            args: [
              entry.address as `0x${string}`,
              prepared.walletAddress,
              prepared.config.PUBLIC_RESOLVER as `0x${string}`,
              entry.label,
            ],
          }),
          value: '0x0',
          description: `Set reverse record for ${entry.label}`,
          method: 'setNameForAddr(address,address,address,string)',
        })
      }
    }

    if (prepared.selectedL2ChainNames.length > 0) {
      const isL1Mainnet = prepared.chainId === CHAINS.MAINNET
      const allEntries = prepared.groupedEntries.flatMap((batch) => batch.entries)

      for (const l2Name of prepared.selectedL2ChainNames) {
        const l2ChainId = getL2ChainId(l2Name, isL1Mainnet)
        const l2Config = CONTRACTS[l2ChainId]
        if (!l2Config || !isAddress(l2Config.L2_REVERSE_REGISTRAR)) {
          continue
        }

        for (const entry of allEntries) {
          if (!entry.address || isZeroAddressLike(entry.address)) {
            continue
          }

          const ownableOnL2 = await checkOwnableOnL2(entry.address, l2ChainId)
          if (!ownableOnL2) {
            continue
          }

          const ownerOnL2 = await checkContractOwnerOnL2(
            entry.address,
            l2ChainId,
            prepared.walletAddress,
          )
          if (!ownerOnL2) {
            continue
          }

          steps.push({
            id: `set-reverse-${l2ChainId}-${entry.address.toLowerCase()}`,
            chainId: l2ChainId,
            to: l2Config.L2_REVERSE_REGISTRAR as `0x${string}`,
            data: encodeFunctionData({
              abi: L2_REVERSE_REGISTRAR_ABI,
              functionName: 'setNameForAddr',
              args: [entry.address as `0x${string}`, entry.label],
            }),
            value: '0x0',
            description: `Set ${l2Name} reverse record for ${entry.label}`,
            method: 'setNameForAddr(address,string)',
          })
        }
      }
    }

    steps.push({
      id: 'revoke-operator-access',
      chainId: prepared.chainId,
      to: approvalTarget as `0x${string}`,
      data: encodeFunctionData({
        abi: parentWrapped ? NAME_WRAPPER_ABI : ENS_REGISTRY_ABI,
        functionName: 'setApprovalForAll',
        args: [prepared.config.ENSCRIBE_V2_CONTRACT as `0x${string}`, false],
      }),
      value: '0x0',
      description: `Revoke operator access on ${prepared.parentName}`,
      method: 'setApprovalForAll(address,bool)',
    })

    const operationId = randomUUID()
    await this.operationStore.onPlanCreated({
      operationId,
      chainId: prepared.chainId,
      contractAddress: prepared.validEntries[0].address,
      ensName: prepared.parentName,
      createdAt: new Date().toISOString(),
    })

    return {
      operationId,
      chainId: prepared.chainId,
      parentName: prepared.parentName,
      entryCount: prepared.validEntries.length,
      batchCount: prepared.groupedEntries.length,
      plan: steps,
      isNoop: steps.length === 0,
      preflight: await this.preflightBatchNaming(input),
      notes:
        steps.length === 0
          ? ['No on-chain writes were generated for the provided CSV rows.']
          : [],
      next: {
        statusTool: 'ens_get_primary_name_status',
      },
    }
  }

  async preflight(input: PreflightInput) {
    const {
      config,
      walletAddress,
      contractAddress,
      normalizedName,
      nameNode,
      nameParts,
    } =
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

    const [nameNodeOwner, parentWrapped] = await Promise.all([
      getNodeOwner({
        chainId: input.chainId,
        ensRegistry: config.ENS_REGISTRY,
        node: nameNode,
      }),
      isParentWrapped({
        chainId: input.chainId,
        nameWrapper: config.NAME_WRAPPER,
        parentNode: nameParts.parentNode,
      }),
    ])

    const subnameExists =
      isAddress(nameNodeOwner) && nameNodeOwner !== zeroAddress

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
      subname: {
        exists: subnameExists,
        owner: nameNodeOwner,
        label: nameParts.label,
        parentName: nameParts.parentName,
        parentNode: nameParts.parentNode,
        labelHash: nameParts.labelHash,
        parentWrapped,
      },
      warnings,
    }
  }

  async buildPlan(input: BuildPlanInput) {
    const preflight = await this.preflight(input)
    const config = ensureChainConfig(input.chainId)
    const notes: string[] = []

    if (
      !preflight.canSetPrimaryName &&
      !preflight.reverseResolution.alreadySet &&
      !input.allowForwardOnly
    ) {
      throw new Error(
        'Primary name cannot be set by current wallet/contract permissions. Set allowForwardOnly=true to generate forward-only plan.',
      )
    }

    const steps: PlanStep[] = []
    const willCreateSubname = !preflight.subname?.exists

    // Step 1: Create subname (if missing). For wrapped parents, call NameWrapper.
    if (willCreateSubname && preflight.subname) {
      if (preflight.subname.parentWrapped) {
        if (!isAddress(config.NAME_WRAPPER)) {
          throw new Error('NameWrapper is not configured for this chain.')
        }

        steps.push({
          id: 'create-subname-wrapped',
          chainId: input.chainId,
          to: config.NAME_WRAPPER as `0x${string}`,
          data: encodeFunctionData({
            abi: NAME_WRAPPER_ABI,
            functionName: 'setSubnodeRecord',
            args: [
              preflight.subname.parentNode as `0x${string}`,
              preflight.subname.label,
              preflight.walletAddress as `0x${string}`,
              config.PUBLIC_RESOLVER as `0x${string}`,
              BigInt(0),
              0,
              BigInt(0),
            ],
          }),
          value: '0x0',
          method:
            'setSubnodeRecord(bytes32,string,address,address,uint64,uint32,uint64)',
          description: `Create subname ${preflight.ensName}`,
        })
      } else {
        steps.push({
          id: 'create-subname',
          chainId: input.chainId,
          to: config.ENS_REGISTRY as `0x${string}`,
          data: encodeFunctionData({
            abi: ENS_REGISTRY_ABI,
            functionName: 'setSubnodeRecord',
            args: [
              preflight.subname.parentNode as `0x${string}`,
              preflight.subname.labelHash as `0x${string}`,
              preflight.walletAddress as `0x${string}`,
              config.PUBLIC_RESOLVER as `0x${string}`,
              BigInt(0),
            ],
          }),
          value: '0x0',
          method: 'setSubnodeRecord(bytes32,bytes32,address,address,uint64)',
          description: `Create subname ${preflight.ensName}`,
        })
      }
    }

    // Step 2: Set forward resolution (skip as no-op if already set).
    if (!preflight.forwardResolution.alreadySet) {
      const canSetForwardResolver =
        isAddress(preflight.resolverAddress) &&
        preflight.resolverAddress !== zeroAddress

      if (canSetForwardResolver || willCreateSubname) {
        const forwardResolver = canSetForwardResolver
          ? (preflight.resolverAddress as `0x${string}`)
          : (config.PUBLIC_RESOLVER as `0x${string}`)

        steps.push({
          id: 'set-forward-resolution',
          chainId: input.chainId,
          to: forwardResolver,
          data: encodeFunctionData({
            abi: RESOLVER_ABI,
            functionName: 'setAddr',
            args: [preflight.nameNode, preflight.contractAddress],
          }),
          value: '0x0',
          method: 'setAddr(bytes32,address)',
          description: `Set forward resolution for ${preflight.ensName} -> ${preflight.contractAddress}`,
        })
      } else {
        notes.push(
          'Forward resolution appears unset but resolver is missing. Forward step was skipped; create/configure resolver on the ENS node first.',
        )
      }
    } else {
      notes.push('Forward resolution already set. Skipping forward step.')
    }

    // Step 3: Set reverse resolution (skip as no-op if already set).
    if (!preflight.reverseResolution.alreadySet && preflight.canSetPrimaryName) {
      if (preflight.recommendedPath === 'ownable') {
        if (isMainnetEnsChain(input.chainId)) {
          if (!isAddress(config.REVERSE_REGISTRAR)) {
            throw new Error('Reverse registrar is not configured for this chain.')
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
                config.PUBLIC_RESOLVER as `0x${string}`,
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
          notes.push(
            'Reverse-claimer path requires a resolver on the ENS node. Reverse step was skipped.',
          )
        } else {
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
    } else if (preflight.reverseResolution.alreadySet) {
      notes.push('Reverse resolution already set. Skipping reverse step.')
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
      notes: [
        ...(steps.length === 0
          ? ['No on-chain writes required. Forward and reverse mappings already match.']
          : []),
        ...notes,
      ],
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
