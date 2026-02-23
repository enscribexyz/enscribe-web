import { namehash } from 'viem'
import { readContract } from 'viem/actions'
import type { Client } from 'viem'
import ownableContractABI from '@/contracts/Ownable'
import ensRegistryABI from '@/contracts/ENSRegistry'
import { getParentNode } from '@/utils/ens'
import { isAddressEmpty, isValidAddress } from '@/utils/validation'
import { getPublicClient } from '@/lib/viemClient'

/**
 * Check if a contract implements Ownable (has an owner() function).
 */
export async function checkOwnable(
  client: Client,
  contractAddress: string,
): Promise<boolean> {
  if (isAddressEmpty(contractAddress) || !isValidAddress(contractAddress)) {
    return false
  }
  try {
    await readContract(client, {
      address: contractAddress as `0x${string}`,
      abi: ownableContractABI,
      functionName: 'owner',
      args: [],
    })
    return true
  } catch {
    return false
  }
}

/**
 * Check if the given wallet is the owner of a contract.
 * Falls back to checking ENS reverse node ownership if Ownable fails.
 */
export async function checkContractOwner(
  client: Client,
  contractAddress: string,
  walletAddress: string,
  ensRegistry: string,
): Promise<boolean> {
  if (isAddressEmpty(contractAddress) || !isValidAddress(contractAddress)) {
    return false
  }
  try {
    const ownerAddress = (await readContract(client, {
      address: contractAddress as `0x${string}`,
      abi: ownableContractABI,
      functionName: 'owner',
      args: [],
    })) as `0x${string}`
    return ownerAddress.toLowerCase() === walletAddress.toLowerCase()
  } catch {
    const addrLabel = contractAddress.slice(2).toLowerCase()
    const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
    try {
      const resolvedAddr = (await readContract(client, {
        address: ensRegistry as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'owner',
        args: [reversedNode],
      })) as string
      return resolvedAddr.toLowerCase() === walletAddress.toLowerCase()
    } catch {
      return false
    }
  }
}

/**
 * Check if the wallet can claim reverse resolution for a contract address.
 */
export async function checkReverseClaimable(
  client: Client,
  contractAddress: string,
  walletAddress: string,
  ensRegistry: string,
): Promise<boolean> {
  if (isAddressEmpty(contractAddress) || !isValidAddress(contractAddress)) {
    return false
  }
  try {
    const addrLabel = contractAddress.slice(2).toLowerCase()
    const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
    const resolvedAddr = (await readContract(client, {
      address: ensRegistry as `0x${string}`,
      abi: ensRegistryABI,
      functionName: 'owner',
      args: [reversedNode],
    })) as `0x${string}`
    return resolvedAddr.toLowerCase() === walletAddress.toLowerCase()
  } catch {
    return false
  }
}

/**
 * Check if a contract is ownable on a specific L2 chain.
 */
export async function checkOwnableOnL2(
  contractAddress: string,
  l2ChainId: number,
): Promise<boolean> {
  if (isAddressEmpty(contractAddress) || !isValidAddress(contractAddress)) {
    return false
  }
  try {
    const l2Client = getPublicClient(l2ChainId)
    if (!l2Client) return false

    await readContract(l2Client, {
      address: contractAddress as `0x${string}`,
      abi: ownableContractABI,
      functionName: 'owner',
      args: [],
    })
    return true
  } catch {
    return false
  }
}

/**
 * Check if the wallet is the owner of a contract on a specific L2 chain.
 */
export async function checkContractOwnerOnL2(
  contractAddress: string,
  l2ChainId: number,
  walletAddress: string,
): Promise<boolean> {
  if (isAddressEmpty(contractAddress) || !isValidAddress(contractAddress)) {
    return false
  }
  try {
    const l2Client = getPublicClient(l2ChainId)
    if (!l2Client) return false

    const ownerAddress = (await readContract(l2Client, {
      address: contractAddress as `0x${string}`,
      abi: ownableContractABI,
      functionName: 'owner',
      args: [],
    })) as `0x${string}`
    return ownerAddress.toLowerCase() === walletAddress.toLowerCase()
  } catch {
    return false
  }
}

/**
 * Check if an ENS record exists for a given name.
 */
export async function checkRecordExists(
  client: Client,
  ensRegistry: string,
  name: string,
): Promise<boolean> {
  try {
    const parentNode = getParentNode(name)
    return (await readContract(client, {
      address: ensRegistry as `0x${string}`,
      abi: ensRegistryABI,
      functionName: 'recordExists',
      args: [parentNode],
    })) as boolean
  } catch {
    return false
  }
}
