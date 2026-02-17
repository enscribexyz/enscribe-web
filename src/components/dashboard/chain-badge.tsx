'use client'

import { cn } from '@/src/lib/utils'
import { getChainName } from '@/src/lib/blockchain/chains'
import { isTestnet } from '@/src/lib/utils'

const chainColors: Record<number, string> = {
  1: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  11155111: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  10: 'bg-red-500/10 text-red-400 border-red-500/20',
  11155420: 'bg-red-500/10 text-red-400 border-red-500/20',
  42161: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  421614: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  8453: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  84532: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  59144: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  59141: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  534352: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  534351: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

interface ChainBadgeProps {
  chainId: number
  className?: string
  showTestnet?: boolean
}

export function ChainBadge({
  chainId,
  className,
  showTestnet = true,
}: ChainBadgeProps) {
  const name = getChainName(chainId)
  const shortName = name.replace(' Mainnet', '').replace(' Testnet', '')
  const colors =
    chainColors[chainId] || 'bg-muted text-muted-foreground border-border'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {shortName}
      {showTestnet && isTestnet(chainId) && (
        <span className="text-[10px] opacity-60">test</span>
      )}
    </span>
  )
}
