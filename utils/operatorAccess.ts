import type { Chain, Client } from 'viem'
import { readContract, writeContract, waitForTransactionReceipt } from 'viem/actions'
import ensRegistryABI from '@/contracts/ENSRegistry'
import nameWrapperABI from '@/contracts/NameWrapper'
import { getParentNode } from '@/utils/ens'
import { CHAINS } from '@/utils/constants'

/**
 * Check if an enscribe contract has operator approval for a given name.
 * Works for both V1 (ENSCRIBE_CONTRACT) and V2 (ENSCRIBE_V2_CONTRACT).
 */
export async function checkOperatorApproval(params: {
  client: Client
  walletAddress: string
  enscribeContract: string
  ensRegistry: string
  nameWrapper: string
  name: string
  chainId: number
}): Promise<boolean> {
  const { client, walletAddress, enscribeContract, ensRegistry, nameWrapper, name, chainId } = params

  try {
    const parentNode = getParentNode(name)

    if (chainId === CHAINS.BASE || chainId === CHAINS.BASE_SEPOLIA) {
      return (await readContract(client, {
        address: ensRegistry as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'isApprovedForAll',
        args: [walletAddress, enscribeContract],
      })) as boolean
    } else {
      const isWrapped = (await readContract(client, {
        address: nameWrapper as `0x${string}`,
        abi: nameWrapperABI,
        functionName: 'isWrapped',
        args: [parentNode],
      })) as boolean

      if (isWrapped) {
        return (await readContract(client, {
          address: nameWrapper as `0x${string}`,
          abi: nameWrapperABI,
          functionName: 'isApprovedForAll',
          args: [walletAddress, enscribeContract],
        })) as boolean
      } else {
        return (await readContract(client, {
          address: ensRegistry as `0x${string}`,
          abi: ensRegistryABI,
          functionName: 'isApprovedForAll',
          args: [walletAddress, enscribeContract],
        })) as boolean
      }
    }
  } catch (err) {
    console.error('Approval check failed:', err)
    return false
  }
}

/**
 * Grant or revoke operator approval for an enscribe contract.
 * Returns the transaction hash, or a sentinel string for Safe wallets in fire-and-forget mode.
 *
 * @param fireAndForgetForSafe - When true (useDeployForm pattern), Safe wallet
 *   transactions are dispatched without awaiting. When false (useBatchNaming pattern),
 *   Safe wallet transactions are awaited but receipt is skipped.
 */
export async function setOperatorApproval(params: {
  walletClient: Client
  chain: Chain
  enscribeContract: string
  ensRegistry: string
  nameWrapper: string
  parentName: string
  walletAddress: string
  approved: boolean
  isSafeWallet: boolean
  fireAndForgetForSafe?: boolean
}): Promise<`0x${string}` | string | undefined> {
  const {
    walletClient, chain, enscribeContract, ensRegistry, nameWrapper,
    parentName, walletAddress, approved, isSafeWallet,
    fireAndForgetForSafe = false,
  } = params

  const parentNode = getParentNode(parentName)

  // Determine the target contract address and ABI based on chain and wrapped status
  let targetAddress: `0x${string}`
  let targetAbi: typeof ensRegistryABI | typeof nameWrapperABI

  if (chain.id === CHAINS.BASE || chain.id === CHAINS.BASE_SEPOLIA) {
    targetAddress = ensRegistry as `0x${string}`
    targetAbi = ensRegistryABI
  } else {
    const isWrapped = (await readContract(walletClient, {
      address: nameWrapper as `0x${string}`,
      abi: nameWrapperABI,
      functionName: 'isWrapped',
      args: [parentNode],
    })) as boolean

    targetAddress = isWrapped
      ? (nameWrapper as `0x${string}`)
      : (ensRegistry as `0x${string}`)
    targetAbi = isWrapped ? nameWrapperABI : ensRegistryABI
  }

  const writeParams = {
    chain,
    address: targetAddress,
    abi: targetAbi,
    functionName: 'setApprovalForAll' as const,
    args: [enscribeContract, approved],
    account: walletAddress as `0x${string}`,
  }

  if (isSafeWallet && fireAndForgetForSafe) {
    // Fire-and-forget: dispatch without awaiting (useDeployForm pattern)
    writeContract(walletClient, writeParams)
    return 'safe wallet'
  }

  const tx = await writeContract(walletClient, writeParams)

  if (!isSafeWallet) {
    await waitForTransactionReceipt(walletClient, { hash: tx })
  }

  return tx
}
