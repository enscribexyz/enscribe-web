import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/toaster'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import 'ethereum-identity-kit/css'
import {
  PencilSquareIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  UserIcon,
  QueueListIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import AddressSearch from './AddressSearch'
import ChainSelector from './ChainSelector'
import SearchModal from './SearchModal'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/router'

interface LayoutProps {
  children: React.ReactNode
}

const productLink = process.env.NEXT_PUBLIC_DOCS_SITE_URL

export default function Layout({ children }: LayoutProps) {
  const ConnectButton = dynamic(
    () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
    { ssr: false },
  )

  class ConnectErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; resetKey: number; message?: string }
  > {
    constructor(props: { children: React.ReactNode }) {
      super(props)
      this.state = { hasError: false, resetKey: 0 }
    }

    static getDerivedStateFromError(error: unknown) {
      return { hasError: true }
    }

    componentDidCatch(error: any) {
      const message = String(error?.message || '')
      // Clean up stale WalletConnect storage on known transient errors
      if (typeof window !== 'undefined') {
        try {
          if (
            message.includes('Proposal expired') ||
            message.includes('WalletConnect Core is already initialized')
          ) {
            const keysToClear = [] as string[]
            for (let i = 0; i < window.localStorage.length; i++) {
              const key = window.localStorage.key(i) || ''
              if (
                key.startsWith('wc@') ||
                key.toLowerCase().includes('walletconnect')
              ) {
                keysToClear.push(key)
              }
            }
            keysToClear.forEach((k) => window.localStorage.removeItem(k))
          }
        } catch {}
      }
      this.setState({ message })
    }

    handleRetry = () => {
      this.setState((s) => ({
        hasError: false,
        resetKey: s.resetKey + 1,
        message: undefined,
      }))
    }

    render() {
      if (this.state.hasError) {
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={this.handleRetry}
              className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
            >
              Retry Connect
            </button>
            {this.state.message && (
              <span className="text-xs opacity-70">{this.state.message}</span>
            )}
          </div>
        )
      }
      return <div key={this.state.resetKey}>{this.props.children}</div>
    }
  }
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const { isConnected, chain, connector, address: walletAddress } = useAccount()
  const [selectedChain, setSelectedChain] = useState<number>(1)
  const [manuallyChanged, setManuallyChanged] = useState(false)
  const [prevConnected, setPrevConnected] = useState(false)
  const [prevChain, setPrevChain] = useState<number | undefined>()
  const router = useRouter()

  const navigation = [
    { name: 'Name Contract', href: '/nameContract', icon: DocumentTextIcon },
    { name: 'Batch Naming', href: '/batchNaming', icon: QueueListIcon },
    { name: 'Deploy Contract', href: '/deploy', icon: PencilSquareIcon },
    { name: 'Name Metadata', href: '/nameMetadata', icon: TagIcon },
    ...(isConnected
      ? [
          {
            name: 'My Account',
            href: `/explore/${chain?.id}/${walletAddress}`,
            icon: UserIcon,
          },
          { name: 'My Contracts', href: '/history', icon: ClockIcon },
        ]
      : []),
  ]

  // Initialize selectedChain from URL on first load only
  useEffect(() => {
    if (
      router.isReady &&
      router.query.chainId &&
      typeof router.query.chainId === 'string' &&
      !manuallyChanged
    ) {
      const chainIdFromUrl = parseInt(router.query.chainId)
      if (!isNaN(chainIdFromUrl)) {
        console.log(`Initial sync with URL chainId: ${chainIdFromUrl}`)
        setSelectedChain(chainIdFromUrl)
      }
    }
  }, [router.isReady, router.query.chainId, manuallyChanged])

  useEffect(() => {
    const isExplorePage = router.pathname.startsWith('/explore')
    const isNameContractPage = router.pathname === '/nameContract'

    // Don't run this effect on nameContract page to avoid interfering with Optimism transactions
    if (!isExplorePage || isNameContractPage) return

    const urlChainId =
      router.query.chainId && typeof router.query.chainId === 'string'
        ? parseInt(router.query.chainId)
        : undefined

    // Handle wallet connection (wallet just connected)
    if (isConnected && !prevConnected && urlChainId && connector?.switchChain) {
      // User just connected wallet on explore page, switch wallet to match URL chain
      console.log(
        `Wallet connected on explore page. Switching wallet to chain ${urlChainId}`,
      )
      connector.switchChain({ chainId: urlChainId }).catch((err) => {
        console.error('Failed to switch chain on wallet connect:', err)
      })
    }

    // Handle wallet disconnection
    if (!isConnected && prevConnected) {
      // User just disconnected wallet on explore page, redirect to root
      console.log('Wallet disconnected on explore page. Redirecting to /')
      router.push('/')
    }

    // Handle wallet chain change (chain changed while connected)
    if (
      isConnected &&
      chain?.id &&
      prevChain !== undefined &&
      chain.id !== prevChain &&
      router.query.address
    ) {
      // User changed wallet chain while on explore page, perform hard refresh
      const address = router.query.address as string
      console.log(
        `Wallet chain changed from ${prevChain} to ${chain.id}. Performing hard refresh.`,
      )
      window.location.href = `/explore/${chain.id}/${address}`
    }

    // Update previous states for next comparison
    setPrevConnected(isConnected)
    setPrevChain(chain?.id)
  }, [
    isConnected,
    chain?.id,
    router.pathname,
    router.query.chainId,
    router.query.address,
    connector,
    prevConnected,
    prevChain,
  ])

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-200 transition-colors duration-200">
      {/* Sidebar for Large Screens - Fixed position */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-66 bg-gray-900 dark:bg-gray-800 text-white shadow-md z-10">
        {/* Main sidebar content with scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Logo and site name */}
          <div className="px-6 py-4 flex items-center space-x-2 border-b border-gray-700 dark:border-white">
            <Link href="/" legacyBehavior>
              <a className="flex items-center space-x-2">
                {/* Logo */}
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="32" height="32" rx="4" fill="#151A2D" />
                  <path
                    d="M10 12L6 16L10 20"
                    stroke="#4DB8E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22 12L26 16L22 20"
                    stroke="#4DB8E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 10L14 22"
                    stroke="#4DB8E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Text */}
                <h2 className="text-2xl font-bold text-white">Enscribe</h2>
              </a>
            </Link>
          </div>

          {/* Navigation menu */}
          <nav className="px-4 py-6">
            <ul className="space-y-2">
              {navigation.slice(0, 3).map((item) => (
                <li key={item.name}>
                  <Link href={item.href} legacyBehavior>
                    <a className="flex items-center p-3 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 rounded-md transition-colors">
                      <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                      {item.name}
                    </a>
                  </Link>
                </li>
              ))}
              
              {/* Divider */}
              {navigation.length > 3 && (
                <li className="py-2">
                  <div className="border-t border-gray-700 dark:border-gray-600"></div>
                </li>
              )}
              
              {navigation.slice(3).map((item) => (
                <li key={item.name}>
                  <Link href={item.href} legacyBehavior>
                    <a className="flex items-center p-3 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 rounded-md transition-colors">
                      <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                      {item.name}
                    </a>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Footer buttons - always visible at bottom */}
        <div className="px-4 py-4 flex space-x-4 bg-gray-900 dark:bg-gray-800 shadow-inner">
          <Link href={productLink || '/'} legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 p-3 rounded-md transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InformationCircleIcon className="w-5 h-5 mr-3 text-gray-400" />
              About
            </a>
          </Link>
          <Link href={productLink + '/docs'} legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900 p-3 rounded-md transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DocumentIcon className="w-5 h-5 mr-3 text-gray-400" />
              Docs
            </a>
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-66 bg-gray-900 dark:bg-gray-950 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:hidden flex flex-col h-full`}
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-700 dark:border-gray-800">
          <Link href="/" legacyBehavior>
            <a className="flex items-center space-x-2">
              {/* Logo */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="32" height="32" rx="4" fill="#151A2D" />
                <path
                  d="M10 12L6 16L10 20"
                  stroke="#4DB8E8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22 12L26 16L22 20"
                  stroke="#4DB8E8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M18 10L14 22"
                  stroke="#4DB8E8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {/* Text */}
              <h2 className="text-2xl font-bold text-white">Enscribe</h2>
            </a>
          </Link>
          <button onClick={() => setSidebarOpen(false)}>
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 py-6 flex-grow">
          <ul className="space-y-2">
            {navigation.slice(0, 3).map((item) => (
              <li key={item.name}>
                <Link href={item.href} legacyBehavior>
                  <a className="flex items-center p-3 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors">
                    <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                    {item.name}
                  </a>
                </Link>
              </li>
            ))}
            
            {/* Divider */}
            {navigation.length > 3 && (
              <li className="py-2">
                <div className="border-t border-gray-700 dark:border-gray-600"></div>
              </li>
            )}
            
            {navigation.slice(3).map((item) => (
              <li key={item.name}>
                <Link href={item.href} legacyBehavior>
                  <a className="flex items-center p-3 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition-colors">
                    <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                    {item.name}
                  </a>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Buttons */}
        <div className="mt-auto px-4 py-4 flex space-x-4">
          <Link href={productLink || '/'} target="_blank" legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 p-3 rounded-md transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InformationCircleIcon className="w-5 h-5 mr-3 text-gray-400" />
              About
            </a>
          </Link>
          <Link href={`${productLink}/docs`} target="_blank" legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-700 p-3 rounded-md transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DocumentIcon className="w-5 h-5 mr-3 text-gray-400" />
              Docs
            </a>
          </Link>
        </div>
      </div>

      {/* Static sidebar placeholder to create space for the fixed sidebar */}
      <div className="hidden lg:block lg:min-w-[240px] lg:w-66 flex-shrink-0"></div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col">
        {/* Top Navbar */}
        <header className="flex items-center p-4 bg-white dark:bg-gray-200 shadow-md">
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button onClick={() => setSidebarOpen(true)}>
              <Bars3Icon className="w-6 h-6 text-gray-900 dark:text-white" />
            </button>
          </div>

          {/* Logo for medium screens */}
          <div className="hidden md:flex lg:hidden items-center ml-2 mr-4">
            <Link href="/" legacyBehavior>
              <a className="flex items-center">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="32" height="32" rx="4" fill="#151A2D" />
                  <path
                    d="M10 12L6 16L10 20"
                    stroke="#4DB8E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M22 12L26 16L22 20"
                    stroke="#4DB8E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M18 10L14 22"
                    stroke="#4DB8E8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </Link>
          </div>

          {/* Address Search Component - Click to open modal */}
          <div className="flex-1 max-w-none sm:max-w-md mr-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-full flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-left"
            >
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Search address or ENS name
              </span>
            </button>
          </div>

          <div className="hidden sm:block flex-1"></div>

          {/* Chain Selector - only visible when wallet is not connected */}
          {!isConnected && (
            <div className="mr-2">
              <ChainSelector
                selectedChain={selectedChain}
                onChainChange={(chainId) => {
                  // Mark as manually changed to prevent auto-sync with URL
                  setManuallyChanged(true)
                  setSelectedChain(chainId)

                  // If there's a chainId in the URL, perform a hard refresh to new chain URL
                  if (router.query.chainId && router.query.address) {
                    const address = router.query.address as string
                    console.log(
                      `Hard refreshing to chain ${chainId} for address ${address}`,
                    )
                    window.location.href = `/explore/${chainId}/${address}`
                  }
                }}
              />
            </div>
          )}

          {/* Theme Toggle Button */}
          <div className="mr-2">
            <ThemeToggle />
          </div>

          {/* WalletConnect Button */}
          <ConnectErrorBoundary>
            <div className="relative">
              {/* Mobile compact button - visible only on mobile when not connected */}
              {!isConnected && (
                <button
                  onClick={() => {
                    // Find and click the actual RainbowKit connect button
                    const rkButton = document.querySelector(
                      '[data-testid="rk-connect-button"]',
                    ) as HTMLButtonElement
                    if (rkButton) {
                      rkButton.click()
                    }
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

              {/* Standard RainbowKit button - hidden on mobile when not connected, always visible when connected */}
              <div className={!isConnected ? 'hidden sm:block' : ''}>
                <ConnectButton
                  accountStatus={{
                    smallScreen: 'avatar',
                    largeScreen: 'full',
                  }}
                  chainStatus={{
                    smallScreen: 'icon',
                    largeScreen: 'full',
                  }}
                  showBalance={{
                    smallScreen: false,
                    largeScreen: true,
                  }}
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

      {/* Search Modal */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        selectedChain={selectedChain}
        setManuallyChanged={setManuallyChanged}
      />
    </div>
  )
}
