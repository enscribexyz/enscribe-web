import { isAddress, toFunctionSelector } from 'viem'
import { CONTRACTS, type NetworkConfig } from '@/utils/constants'

export type TargetSelectorPolicy = Map<string, Set<string>>

export type PolicyValidationResult =
  | { ok: true }
  | { ok: false; reason: string }

const ZERO_VALUE = '0x'

const SELECTORS = {
  setSubnodeRecordRegistry: toFunctionSelector(
    'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
  ),
  setSubnodeRecordWrapper: toFunctionSelector(
    'function setSubnodeRecord(bytes32 parentNode, string label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry)',
  ),
  setAddr: toFunctionSelector('function setAddr(bytes32 node, address a)'),
  setName: toFunctionSelector('function setName(bytes32 node, string name)'),
  setNameForAddrL1: toFunctionSelector(
    'function setNameForAddr(address addr, address owner, address resolver, string name)',
  ),
  setNameForAddrL2: toFunctionSelector(
    'function setNameForAddr(address addr, string name)',
  ),
} as const

function normalizeAddress(addr: string): string {
  return addr.toLowerCase()
}

function maybeSetAddressPolicy(
  policy: TargetSelectorPolicy,
  target: string,
  selectors: readonly string[],
): void {
  if (!isAddress(target)) return
  policy.set(normalizeAddress(target), new Set(selectors))
}

export function buildPrimaryNamePolicy(config: NetworkConfig): TargetSelectorPolicy {
  const policy = new Map<string, Set<string>>()

  maybeSetAddressPolicy(policy, config.ENS_REGISTRY, [
    SELECTORS.setSubnodeRecordRegistry,
  ])
  maybeSetAddressPolicy(policy, config.NAME_WRAPPER, [
    SELECTORS.setSubnodeRecordWrapper,
  ])
  maybeSetAddressPolicy(policy, config.PUBLIC_RESOLVER, [
    SELECTORS.setAddr,
    SELECTORS.setName,
  ])
  maybeSetAddressPolicy(policy, config.REVERSE_REGISTRAR, [
    SELECTORS.setNameForAddrL1,
  ])
  maybeSetAddressPolicy(policy, config.L2_REVERSE_REGISTRAR, [
    SELECTORS.setNameForAddrL2,
  ])

  return policy
}

export function buildPrimaryNamePolicyForChain(
  chainId: number,
): TargetSelectorPolicy {
  const config = CONTRACTS[chainId]
  if (!config) {
    return new Map()
  }
  return buildPrimaryNamePolicy(config)
}

export function validateCallTargetAndSelector(args: {
  to: string
  data: string
  policy: TargetSelectorPolicy
}): PolicyValidationResult {
  const { to, data, policy } = args

  if (!isAddress(to)) {
    return { ok: false, reason: 'Invalid target address.' }
  }

  if (!data || data === ZERO_VALUE || !data.startsWith('0x') || data.length < 10) {
    return { ok: false, reason: 'Missing or invalid calldata.' }
  }

  const allowedSelectors = policy.get(normalizeAddress(to))
  if (!allowedSelectors) {
    return { ok: false, reason: 'Target contract is not allowed by policy.' }
  }

  const selector = data.slice(0, 10).toLowerCase()
  if (!allowedSelectors.has(selector)) {
    return {
      ok: false,
      reason: 'Function selector is not allowed for this target contract.',
    }
  }

  return { ok: true }
}

export function validateCallTargetAndSelectorForChain(args: {
  chainId: number
  to: string
  data: string
}): PolicyValidationResult {
  const policy = buildPrimaryNamePolicyForChain(args.chainId)
  return validateCallTargetAndSelector({
    to: args.to,
    data: args.data,
    policy,
  })
}
