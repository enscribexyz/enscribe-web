'use client'

import React from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { Menu, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { ConnectErrorBoundary } from '@/components/ConnectErrorBoundary'

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
)

interface HeaderProps {
  onMenuClick: () => void
  onSearchClick: () => void
}

function getBreadcrumbs(pathname: string): string[] {
  const parts = pathname.split('/').filter(Boolean)
  // /dashboard/org-slug/contracts → ['Dashboard', 'org-slug', 'Contracts']
  return parts.map((part, i) => {
    if (i === 0) return 'Dashboard'
    if (i === 1) return part // org slug as-is
    return part.charAt(0).toUpperCase() + part.slice(1)
  })
}

export function DashboardHeader({ onMenuClick, onSearchClick }: HeaderProps) {
  const pathname = usePathname()
  const breadcrumbs = getBreadcrumbs(pathname ?? '')

  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-card/80 backdrop-blur-md border-b border-border">
      {/* Mobile hamburger */}
      <button
        className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        onClick={onMenuClick}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="text-border">/</span>}
            <span
              className={
                i === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''
              }
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Search trigger */}
      <button
        onClick={onSearchClick}
        className="flex items-center gap-2 ml-auto max-w-xs px-3 py-1.5 text-sm text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg border border-border hover:border-ring transition-colors"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-background border border-border rounded">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <ThemeToggle />

      <ConnectErrorBoundary>
        <ConnectButton
          accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
          chainStatus="icon"
          showBalance={false}
        />
      </ConnectErrorBoundary>

      <UserButton
        afterSignOutUrl="/"
        appearance={{
          elements: {
            avatarBox: 'w-8 h-8',
          },
        }}
      />
    </header>
  )
}
