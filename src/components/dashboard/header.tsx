'use client'

import { usePathname } from 'next/navigation'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Search, Wallet, ChevronRight } from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { shortenAddress } from '@/src/lib/utils'

interface HeaderProps {
  onOpenCommandPalette: () => void
}

function getBreadcrumbs(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return [{ label: 'Overview' }]

  const crumbs: { label: string; href?: string }[] = []
  // First part is the orgSlug
  if (parts.length >= 1) {
    crumbs.push({ label: parts[0], href: `/${parts[0]}` })
  }
  if (parts.length >= 2) {
    const page = parts[1]
    const labels: Record<string, string> = {
      contracts: 'Contracts',
      assign: 'Assign Name',
      batch: 'Batch Assign',
      settings: 'Settings',
      activity: 'Activity',
    }
    crumbs.push({ label: labels[page] || page })
  }
  return crumbs
}

export function Header({ onOpenCommandPalette }: HeaderProps) {
  const pathname = usePathname()
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const breadcrumbs = getBreadcrumbs(pathname || '')

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                i === breadcrumbs.length - 1
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {crumb.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Command palette trigger */}
      <button
        onClick={onOpenCommandPalette}
        className="flex h-8 w-64 items-center gap-2 rounded-md border border-input bg-secondary px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span>&#8984;</span>K
        </kbd>
      </button>

      {/* Wallet connect */}
      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="flex h-8 items-center gap-2 rounded-md border border-input bg-secondary px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Wallet className="h-3.5 w-3.5 text-green-500" />
          {shortenAddress(address!)}
        </button>
      ) : (
        <button
          onClick={() => {
            const injectedConnector = connectors.find(
              (c) => c.id === 'injected',
            )
            if (injectedConnector) connect({ connector: injectedConnector })
          }}
          className="flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Wallet className="h-3.5 w-3.5" />
          Connect Wallet
        </button>
      )}
    </header>
  )
}
