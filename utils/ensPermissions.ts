/**
 * Permission checks run during form filling so users learn upfront whether
 * the connected wallet can actually perform the tx — instead of waiting for
 * a simulate/broadcast revert.
 *
 * Two distinct checks:
 *
 *  1. `checkEnsNameManager` — for creating a new subname under a parent.
 *     "Manager" is wrapped-vs-unwrapped aware:
 *       - unwrapped: ENSRegistry.owner(node)
 *       - wrapped:   NameWrapper.ownerOf(uint256(node))
 *     (Detected by registry.owner(node) === NameWrapper address.)
 *
 *  2. `checkResolverWritePermission` — for overriding records on an existing
 *     name. The Public Resolver's isAuthorised() allows: node owner,
 *     resolver-level isApprovedForAll, or per-node isApprovedFor.
 */
import type { Client } from 'viem'
import { readContract } from 'viem/actions'
import ensRegistryABI from '@/contracts/ENSRegistry'
import nameWrapperABI from '@/contracts/NameWrapper'
import publicResolverABI from '@/contracts/PublicResolver'
import { getParentNode } from './ens'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export type ManagerCheckStatus =
  | 'ok'
  | 'not-manager'
  | 'no-owner'
  | 'invalid-name'
  | 'error'

export type ManagerCheck = {
  status: ManagerCheckStatus
  isManager: boolean
  manager: string | null
  isWrapped: boolean
}

export async function checkEnsNameManager(params: {
  client: Client
  name: string
  walletAddress: string
  ensRegistry: string
  nameWrapper: string
}): Promise<ManagerCheck> {
  const { client, name, walletAddress, ensRegistry, nameWrapper } = params

  const node = getParentNode(name)
  if (!node) {
    return {
      status: 'invalid-name',
      isManager: false,
      manager: null,
      isWrapped: false,
    }
  }

  try {
    const registryOwner = (await readContract(client, {
      address: ensRegistry as `0x${string}`,
      abi: ensRegistryABI,
      functionName: 'owner',
      args: [node],
    })) as `0x${string}`

    const isWrapped =
      !!nameWrapper &&
      registryOwner.toLowerCase() === nameWrapper.toLowerCase()

    let manager: string = registryOwner
    if (isWrapped) {
      try {
        manager = (await readContract(client, {
          address: nameWrapper as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'ownerOf',
          args: [BigInt(node)],
        })) as `0x${string}`
      } catch {
        manager = ZERO_ADDRESS
      }
    }

    if (!manager || manager.toLowerCase() === ZERO_ADDRESS) {
      return {
        status: 'no-owner',
        isManager: false,
        manager: null,
        isWrapped,
      }
    }

    const isManager = manager.toLowerCase() === walletAddress.toLowerCase()
    return {
      status: isManager ? 'ok' : 'not-manager',
      isManager,
      manager,
      isWrapped,
    }
  } catch (err) {
    console.error('checkEnsNameManager failed:', err)
    return {
      status: 'error',
      isManager: false,
      manager: null,
      isWrapped: false,
    }
  }
}

export type ResolverPermissionStatus =
  | 'ok'
  | 'not-authorized'
  | 'no-resolver'
  | 'invalid-name'
  | 'error'

export type ResolverPermissionCheck = {
  status: ResolverPermissionStatus
  canWrite: boolean
  owner: string | null
  resolver: string | null
}

export async function checkResolverWritePermission(params: {
  client: Client
  name: string
  walletAddress: string
  ensRegistry: string
  nameWrapper: string
}): Promise<ResolverPermissionCheck> {
  const { client, name, walletAddress, ensRegistry, nameWrapper } = params

  const node = getParentNode(name)
  if (!node) {
    return {
      status: 'invalid-name',
      canWrite: false,
      owner: null,
      resolver: null,
    }
  }

  try {
    const resolver = (await readContract(client, {
      address: ensRegistry as `0x${string}`,
      abi: ensRegistryABI,
      functionName: 'resolver',
      args: [node],
    })) as `0x${string}`

    if (!resolver || resolver.toLowerCase() === ZERO_ADDRESS) {
      return { status: 'no-resolver', canWrite: false, owner: null, resolver: null }
    }

    const managerCheck = await checkEnsNameManager({
      client,
      name,
      walletAddress,
      ensRegistry,
      nameWrapper,
    })

    // Wallet owns the node — always authorized.
    if (managerCheck.isManager) {
      return {
        status: 'ok',
        canWrite: true,
        owner: managerCheck.manager,
        resolver,
      }
    }

    // If we couldn't determine an owner, we can't proceed further.
    if (!managerCheck.manager) {
      return {
        status: managerCheck.status === 'no-owner' ? 'not-authorized' : 'error',
        canWrite: false,
        owner: null,
        resolver,
      }
    }

    // Try resolver-level isApprovedForAll first.
    try {
      const approvedForAll = (await readContract(client, {
        address: resolver,
        abi: publicResolverABI,
        functionName: 'isApprovedForAll',
        args: [managerCheck.manager, walletAddress],
      })) as boolean
      if (approvedForAll) {
        return {
          status: 'ok',
          canWrite: true,
          owner: managerCheck.manager,
          resolver,
        }
      }
    } catch {
      // Resolver may not implement isApprovedForAll — fall through.
    }

    // Then try per-node isApprovedFor.
    try {
      const approvedFor = (await readContract(client, {
        address: resolver,
        abi: publicResolverABI,
        functionName: 'isApprovedFor',
        args: [managerCheck.manager, node, walletAddress],
      })) as boolean
      if (approvedFor) {
        return {
          status: 'ok',
          canWrite: true,
          owner: managerCheck.manager,
          resolver,
        }
      }
    } catch {
      // Resolver may not implement isApprovedFor.
    }

    return {
      status: 'not-authorized',
      canWrite: false,
      owner: managerCheck.manager,
      resolver,
    }
  } catch (err) {
    console.error('checkResolverWritePermission failed:', err)
    return { status: 'error', canWrite: false, owner: null, resolver: null }
  }
}

export function shortAddress(addr?: string | null): string {
  if (!addr) return ''
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
