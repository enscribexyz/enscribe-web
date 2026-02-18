/**
 * TanStack Query wrapper around getENS with 5-minute staleTime.
 * Replaces raw useEffect + fetch patterns for ENS reverse resolution.
 */
import { useQuery } from '@tanstack/react-query'
import { getENS } from '@/utils/ens'

export function useENSResolution(address: string | undefined, chainId: number | undefined) {
  return useQuery({
    queryKey: ['ens-resolution', address, chainId],
    queryFn: () => getENS(address!, chainId!),
    enabled: Boolean(address && chainId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}
