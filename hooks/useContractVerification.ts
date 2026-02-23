/**
 * TanStack Query wrapper around the verification API.
 * Replaces raw useEffect + fetch patterns in ENSDetails.tsx for verification data.
 */
import { useQuery } from '@tanstack/react-query'
import type { VerificationStatus } from '@/types'

async function fetchVerification(
  chainId: number,
  address: string,
): Promise<VerificationStatus> {
  const res = await fetch(`/api/v1/verification/${chainId}/${address}`)
  if (!res.ok) throw new Error(`Verification fetch failed: ${res.status}`)
  return res.json()
}

export function useContractVerification(
  address: string | undefined,
  chainId: number | undefined,
) {
  return useQuery({
    queryKey: ['contract-verification', address, chainId],
    queryFn: () => fetchVerification(chainId!, address!),
    enabled: Boolean(address && chainId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  })
}
