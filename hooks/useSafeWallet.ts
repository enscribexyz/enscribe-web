/**
 * Detects if the current wallet connector is a Safe multisig.
 * Replaces the `checkIfSafeWallet` wrapper copy-pasted in 4 components.
 */
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { checkIfSafe } from '@/components/componentUtils'

export function useSafeWallet(): boolean {
  const { connector } = useAccount()
  const [isSafe, setIsSafe] = useState(false)

  useEffect(() => {
    if (!connector) {
      setIsSafe(false)
      return
    }

    checkIfSafe(connector).then(setIsSafe).catch(() => setIsSafe(false))
  }, [connector])

  return isSafe
}
