'use client'

import React from 'react'
import Image from 'next/image'
import { getChainOption } from '@/lib/chains'
import { cn } from '@/lib/utils'

interface ChainBadgeProps {
  chainId: number
  className?: string
}

export function ChainBadge({ chainId, className }: ChainBadgeProps) {
  const chain = getChainOption(chainId)

  if (!chain) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground',
          className,
        )}
      >
        Chain {chainId}
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground',
        chain.isTestnet && 'bg-warning/10 text-warning',
        className,
      )}
    >
      <Image
        src={chain.logo}
        alt={chain.name}
        width={14}
        height={14}
        className="rounded-full"
      />
      {chain.name}
    </span>
  )
}
