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
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()

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

  return (
    <div className="flex min-h-screen bg-background transition-colors duration-200">
      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-66 bg-gray-900 dark:bg-gray-800 text-white shadow-md z-10">
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 flex items-center space-x-2 border-b border-gray-700 dark:border-white">
            <Link href="/" className="flex items-center space-x-2">
              <EnscribeLogo size={32} />
              <h2 className="text-2xl font-bold text-white">Enscribe</h2>
            </Link>
          </div>

          <nav className="px-4 py-6">
            <SidebarNav items={navigation} />
          </nav>
        </div>

        <div className="px-4 py-4 flex space-x-4 bg-gray-900 dark:bg-gray-800 shadow-inner">
          <Link
            href={productLink || '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 p-3 rounded-md transition-colors"
          >
            <Info className="w-5 h-5 mr-3 text-gray-400" />
            About
          </Link>
          <Link
            href={`${productLink}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 p-3 rounded-md transition-colors"
          >
            <File className="w-5 h-5 mr-3 text-gray-400" />
            Docs
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-66 bg-gray-900 dark:bg-gray-800 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:hidden flex flex-col h-full`}
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-700 dark:border-gray-800">
          <Link href="/" className="flex items-center space-x-2">
            <EnscribeLogo size={32} />
            <h2 className="text-2xl font-bold text-white">Enscribe</h2>
          </Link>
          <button onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <nav className="px-4 py-6 flex-grow">
          <SidebarNav
            items={navigation}
            linkClassName="flex items-center p-3 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors"
          />
        </nav>

        <div className="mt-auto px-4 py-4 flex space-x-4">
          <Link
            href={productLink || '/'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 p-3 rounded-md transition-colors"
          >
            <Info className="w-5 h-5 mr-3 text-gray-400" />
            About
          </Link>
          <Link
            href={`${productLink}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 p-3 rounded-md transition-colors"
          >
            <File className="w-5 h-5 mr-3 text-gray-400" />
            Docs
          </Link>
        </div>
      </div>

      {/* Static placeholder to reserve space for fixed sidebar */}
      <div className="hidden lg:block lg:min-w-[240px] lg:w-66 flex-shrink-0" />

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Top Navbar */}
        <header className="flex items-center p-4 bg-white dark:bg-gray-200 shadow-md">
          <div className="lg:hidden">
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
          </div>

          {/* Logo for medium screens */}
          <div className="hidden md:flex lg:hidden items-center ml-2 mr-4">
            <Link href="/">
              <EnscribeLogo size={24} />
            </Link>
          </div>

          {/* Search trigger */}
          <div className="flex-1 max-w-none sm:max-w-md mr-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-left"
            >
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Search address or ENS name
              </span>
            </button>
          </div>

          <div className="hidden sm:block flex-1" />

          {/* Chain selector — only when wallet is not connected */}
          {!isConnected && (
            <div className="mr-2">
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
            </div>
          )}

          <div className="mr-2">
            <ThemeToggle />
          </div>

          <ConnectErrorBoundary>
            <div className="relative">
              {!isConnected && (
                <button
                  onClick={() => {
                    const rkButton = document.querySelector(
                      '[data-testid="rk-connect-button"]',
                    ) as HTMLButtonElement | null
                    rkButton?.click()
                  }}
                  className="sm:hidden flex flex-col items-center justify-center px-3 py-2 bg-[#0E76FD] hover:bg-[#0E76FD]/90 text-white rounded-xl text-xs font-semibold transition-all duration-200 min-w-[64px] h-10 shadow-sm border border-transparent"
                  style={{
                    background:
                      'linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0) 100%),rgb(56, 152, 255)',
                    boxShadow:
                      '0px 2px 2px rgba(0, 0, 0, 0), inset 0px 1px 0px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <span className="leading-tight">Connect</span>
                  <span className="leading-tight">Wallet</span>
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

        <main className="flex-1 p-6 bg-white dark:bg-gray-100 transition-colors duration-200">
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
