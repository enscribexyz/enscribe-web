import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/toaster'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import 'ethereum-identity-kit/css'
import {
  PencilLine,
  Clock,
  Menu,
  X,
  FileText,
  Info,
  File,
  Search,
  User,
  List,
  Tag,
} from 'lucide-react'
import ChainSelector from './ChainSelector'
import SearchModal from './SearchModal'
import { EnscribeLogo } from './EnscribeLogo'
import { ConnectErrorBoundary } from './ConnectErrorBoundary'
import { SidebarNav } from './navigation/SidebarNav'
import { useAccount } from 'wagmi'
import { useRouter, usePathname, useParams } from 'next/navigation'
import { useSelectedChain } from '@/hooks/useSelectedChain'

interface LayoutProps {
  children: React.ReactNode
}

const productLink = process.env.NEXT_PUBLIC_DOCS_SITE_URL

const ConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
)

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const { isConnected, chain, connector, address: walletAddress } = useAccount()
  const { selectedChain, setSelectedChain } = useSelectedChain()
  const [manuallyChanged, setManuallyChanged] = useState(false)
  const [prevConnected, setPrevConnected] = useState(false)
  const [prevChain, setPrevChain] = useState<number | undefined>()
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  const navigation = useMemo(
    () => [
      { name: 'Name Contract', href: '/nameContract', icon: FileText },
      { name: 'Batch Naming', href: '/batchNaming', icon: List },
      { name: 'Deploy Contract', href: '/deploy', icon: PencilLine },
      { name: 'Name Explorer', href: '/nameMetadata', icon: Tag },
      ...(isConnected
        ? [
            {
              name: 'My Account',
              href: `/explore/${chain?.id}/${walletAddress}`,
              icon: User,
            },
            { name: 'My Contracts', href: '/history', icon: Clock },
          ]
        : []),
    ],
    [isConnected, chain?.id, walletAddress],
  )

  // Initialize selectedChain from URL on first load only
  useEffect(() => {
    const chainIdParam = params?.chainId
    if (chainIdParam && typeof chainIdParam === 'string' && !manuallyChanged) {
      const chainIdFromUrl = parseInt(chainIdParam)
      if (!isNaN(chainIdFromUrl)) {
        setSelectedChain(chainIdFromUrl)
      }
    }
  }, [params?.chainId, manuallyChanged, setSelectedChain])

  useEffect(() => {
    const isExplorePage = pathname?.startsWith('/explore')
    const isNameContractPage = pathname === '/nameContract'

    if (!isExplorePage || isNameContractPage) return

    const chainIdParam = params?.chainId
    const urlChainId =
      chainIdParam && typeof chainIdParam === 'string'
        ? parseInt(chainIdParam)
        : undefined

    if (isConnected && !prevConnected && urlChainId && connector?.switchChain) {
      connector.switchChain({ chainId: urlChainId }).catch((err) => {
        console.error('Failed to switch chain on wallet connect:', err)
      })
    }

    if (!isConnected && prevConnected) {
      router.push('/')
    }

    const addressParam = params?.address
    if (
      isConnected &&
      chain?.id &&
      prevChain !== undefined &&
      chain.id !== prevChain &&
      addressParam
    ) {
      const address = addressParam as string
      window.location.href = `/explore/${chain.id}/${address}`
    }

    setPrevConnected(isConnected)
    setPrevChain(chain?.id)
  }, [
    isConnected,
    chain?.id,
    pathname,
    params?.chainId,
    params?.address,
    connector,
    prevConnected,
    prevChain,
  ])

  const sidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 h-14 flex items-center border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <EnscribeLogo size={28} />
            <span className="text-base font-semibold text-sidebar-foreground-active truncate">
              Enscribe
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="px-3 py-4">
          <SidebarNav items={navigation} />
        </nav>
      </div>

      {/* Footer links */}
      <div className="px-3 py-3 border-t border-sidebar-border flex gap-1 shrink-0">
        <Link
          href={productLink || '/'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover rounded-md transition-colors"
        >
          <Info className="w-4 h-4 shrink-0" />
          About
        </Link>
        <Link
          href={`${productLink}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover rounded-md transition-colors"
        >
          <File className="w-4 h-4 shrink-0" />
          Docs
        </Link>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar — fixed */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-sidebar z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </div>

      {/* Spacer for fixed sidebar */}
      <div className="hidden lg:block lg:w-64 shrink-0" />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-14 bg-card/80 backdrop-blur-md border-b border-border">
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo on mobile/tablet only */}
          <div className="hidden md:flex lg:hidden items-center">
            <Link href="/">
              <EnscribeLogo size={24} />
            </Link>
          </div>

          {/* Search bar */}
          <button
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2 flex-1 max-w-sm px-3 py-2 text-sm text-muted-foreground bg-muted hover:bg-accent hover:text-accent-foreground rounded-lg border border-border hover:border-ring transition-colors text-left"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span className="truncate">Search address or ENS name…</span>
          </button>

          <div className="flex-1" />

          {/* Chain selector — only when not connected */}
          {!isConnected && (
            <ChainSelector
              selectedChain={selectedChain}
              onChainChange={(chainId) => {
                setManuallyChanged(true)
                setSelectedChain(chainId)
                if (params?.chainId && params?.address) {
                  const address = params.address as string
                  window.location.href = `/explore/${chainId}/${address}`
                }
              }}
            />
          )}

          <ThemeToggle />

          <ConnectErrorBoundary>
            <div className="relative">
              {/* Mobile compact connect */}
              {!isConnected && (
                <button
                  onClick={() => {
                    const rkButton = document.querySelector(
                      '[data-testid="rk-connect-button"]',
                    ) as HTMLButtonElement | null
                    rkButton?.click()
                  }}
                  className="sm:hidden flex items-center justify-center px-3 h-9 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  Connect
                </button>
              )}
              <div className={!isConnected ? 'hidden sm:block' : ''}>
                <ConnectButton
                  accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }}
                  chainStatus={{ smallScreen: 'icon', largeScreen: 'full' }}
                  showBalance={{ smallScreen: false, largeScreen: true }}
                />
              </div>
            </div>
          </ConnectErrorBoundary>
        </header>

        <main className="flex-1 p-6 bg-background">
          {children}
        </main>
        <Toaster />
      </div>

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        selectedChain={selectedChain}
        setManuallyChanged={setManuallyChanged}
      />
    </div>
  )
}
