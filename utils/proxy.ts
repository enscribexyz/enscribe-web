import { ETHERSCAN_API } from '@/utils/constants'

/**
 * Checks if a contract is a proxy contract using the Etherscan API
 * @param address The contract address to check
 * @param chainId The chain ID of the network
 * @returns Object containing isProxy flag and implementationAddress if it's a proxy
 */
export async function checkIfProxy(
  address: string,
  chainId: number,
): Promise<{
  isProxy: boolean
  implementationAddress?: string
}> {
  try {
    // Construct the API URL with chainId parameter
    const url = `${ETHERSCAN_API}&chainid=${chainId}&module=contract&action=getsourcecode&address=${address}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status === '1' && data.result && data.result.length > 0) {
      const contractInfo = data.result[0]

      // Check if it's identified as a proxy
      if (contractInfo.Proxy === '1' && contractInfo.Implementation) {
        return {
          isProxy: true,
          implementationAddress: contractInfo.Implementation,
        }
      }
    }

    return { isProxy: false }
  } catch (error) {
    console.error('Error checking if contract is proxy:', error)
    return { isProxy: false }
  }
}
