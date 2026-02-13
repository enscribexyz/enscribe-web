import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/toaster'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import 'ethereum-identity-kit/css'
import {
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
  Squares2X2Icon,
  InformationCircleIcon,
  DocumentIcon,
  MagnifyingGlassIcon,
  UserIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import ChainSelector from './ChainSelector'
import SearchModal from './SearchModal'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/router'

interface LayoutProps {
  children: React.ReactNode
}

const productLink = process.env.NEXT_PUBLIC_DOCS_SITE_URL
type TaskMode = 'operate' | 'discover' | 'account'
type NavItem = {
  name: string
  shortName?: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

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
  const [taskMode, setTaskMode] = useState<TaskMode>('operate')

  const primaryNavigation: NavItem[] = [
    {
      name: 'Identity Workspace',
      shortName: 'Workspace',
      href: '/workspace',
      icon: Squares2X2Icon,
    },
  ]

  const secondaryNavigation: NavItem[] = [
    {
      name: 'Name Explorer',
      shortName: 'Explorer',
      href: '/nameMetadata',
      icon: TagIcon,
    },
  ]

  const monitoringNavigation: NavItem[] = [
    {
      name: 'My Contracts',
      shortName: 'Contracts',
      href: '/history',
      icon: ClockIcon,
    },
  ]

  const accountNavigation: NavItem[] = isConnected
    ? [
        {
          name: 'My Account',
          shortName: 'Account',
          href:
            chain?.id && walletAddress
              ? `/explore/${chain.id}/${walletAddress}`
              : '/explore',
          icon: UserIcon,
        },
      ]
    : []

  const inferTaskMode = (pathname: string): TaskMode => {
    if (
      pathname === '/' ||
      pathname === '/workspace' ||
      pathname === '/nameContract' ||
      pathname === '/batchNaming' ||
      pathname === '/deploy'
    ) {
      return 'operate'
    }

    if (pathname === '/nameMetadata') {
      return 'discover'
    }

    return 'account'
  }

  const modeOptions: Array<{ id: TaskMode; label: string }> = [
    { id: 'operate', label: 'Operate' },
    { id: 'discover', label: 'Discover' },
    { id: 'account', label: 'Account' },
  ]

  const navigationSections = useMemo(
    () => {
      const byMode: Record<
        TaskMode,
        Array<{ key: string; label: string; items: NavItem[] }>
      > = {
        operate: [
          { key: 'workflows', label: 'Workflows', items: primaryNavigation },
        ],
        discover: [
          {
            key: 'explore',
            label: 'Explore & Inventory',
            items: [...secondaryNavigation, ...monitoringNavigation],
          },
        ],
        account: [
          { key: 'inventory', label: 'Inventory', items: monitoringNavigation },
          { key: 'account', label: 'Wallet', items: accountNavigation },
        ],
      }

      return byMode[taskMode].filter((section) => section.items.length > 0)
    },
    [
      taskMode,
      primaryNavigation,
      secondaryNavigation,
      monitoringNavigation,
      accountNavigation,
    ],
  )

  const isNavItemActive = (href: string) => {
    if (href.startsWith('/explore/')) {
      return router.pathname.startsWith('/explore')
    }

    return router.pathname === href
  }

  const allNavigationItems = useMemo(
    () => [
      ...primaryNavigation,
      ...secondaryNavigation,
      ...monitoringNavigation,
      ...accountNavigation,
    ],
    [
      primaryNavigation,
      secondaryNavigation,
      monitoringNavigation,
      accountNavigation,
    ],
  )

  const staticRouteLabels: Record<string, string> = {
    '/': 'Home',
    '/workspace': 'Identity Workspace',
    '/nameContract': 'Name Contract',
    '/batchNaming': 'Batch Naming',
    '/deploy': 'Deploy Contract',
    '/nameMetadata': 'Name Explorer',
    '/history': 'My Contracts',
  }

  const currentPageLabel =
    allNavigationItems.find((item) => isNavItemActive(item.href))?.name ||
    staticRouteLabels[router.pathname] ||
    'Dashboard'

  const breadcrumbs = useMemo(() => {
    const modeLabel = taskMode.charAt(0).toUpperCase() + taskMode.slice(1)
    const address =
      typeof router.query.address === 'string' ? router.query.address : ''
    const addressLabel =
      address.length > 10
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : address || 'Address'

    if (router.pathname.startsWith('/explore/') && address) {
      return [
        { label: 'Home', href: '/' },
        { label: 'Account', href: '/history' },
        { label: addressLabel },
      ]
    }

    return [
      { label: 'Home', href: '/' },
      { label: modeLabel },
      { label: currentPageLabel },
    ]
  }, [taskMode, currentPageLabel, router.pathname, router.query.address])

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
    setTaskMode(inferTaskMode(router.pathname))
  }, [router.pathname])

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
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-66 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white shadow-md z-10">
        {/* Main sidebar content with scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Logo and site name */}
          <div className="px-6 py-4 flex items-center space-x-2 border-b border-slate-700/70">
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

          <div className="px-4 pt-4">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-800/90 p-1">
              {modeOptions.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setTaskMode(mode.id)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                    taskMode === mode.id
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'text-slate-300 hover:bg-slate-700/80'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation menu */}
          <nav className="px-4 py-6">
            {navigationSections.length === 0 && (
              <p className="px-3 text-sm text-slate-400">
                Connect your wallet to view account tools.
              </p>
            )}
            <ul className="space-y-4">
              {navigationSections.map((section) => (
                <li key={section.key}>
                  <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                    {section.label}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const active = isNavItemActive(item.href)

                      return (
                        <li key={item.name}>
                          <Link href={item.href} legacyBehavior>
                            <a
                              className={`flex items-center rounded-xl p-3 transition-colors ${
                                active
                                  ? 'bg-cyan-500/15 text-cyan-200'
                                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                              }`}
                            >
                              <item.icon
                                className={`mr-3 w-5 h-5 ${
                                  active ? 'text-cyan-200' : 'text-slate-400'
                                }`}
                              />
                              {item.name}
                            </a>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Footer buttons - always visible at bottom */}
        <div className="px-4 py-4 flex space-x-4 bg-slate-900 shadow-inner border-t border-slate-700/60">
          <Link href={productLink || '/'} legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-slate-300 hover:bg-slate-800 p-3 rounded-xl transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InformationCircleIcon className="w-5 h-5 mr-3 text-slate-400" />
              About
            </a>
          </Link>
          <Link href={productLink + '/docs'} legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-slate-300 hover:bg-slate-800 p-3 rounded-xl transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DocumentIcon className="w-5 h-5 mr-3 text-slate-400" />
              Docs
            </a>
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-66 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform lg:hidden flex flex-col h-full`}
      >
        <div className="px-6 py-4 flex items-center justify-between border-b border-slate-700/70">
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

        <div className="px-4 pt-4">
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-800/90 p-1">
            {modeOptions.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTaskMode(mode.id)}
                className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                  taskMode === mode.id
                    ? 'bg-cyan-500/20 text-cyan-100'
                    : 'text-slate-300 hover:bg-slate-700/80'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="px-4 py-6 flex-grow">
          {navigationSections.length === 0 && (
            <p className="px-3 text-sm text-slate-400">
              Connect your wallet to view account tools.
            </p>
          )}
          <ul className="space-y-4">
            {navigationSections.map((section) => (
              <li key={section.key}>
                <p className="px-3 pb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  {section.label}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const active = isNavItemActive(item.href)

                    return (
                      <li key={item.name}>
                        <Link href={item.href} legacyBehavior>
                          <a
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center rounded-xl p-3 transition-colors ${
                              active
                                ? 'bg-cyan-500/15 text-cyan-200'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                            }`}
                          >
                            <item.icon
                              className={`mr-3 w-5 h-5 ${
                                active ? 'text-cyan-200' : 'text-slate-400'
                              }`}
                            />
                            {item.name}
                          </a>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Buttons */}
        <div className="mt-auto px-4 py-4 flex space-x-4">
          <Link href={productLink || '/'} target="_blank" legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-slate-300 hover:bg-slate-800 p-3 rounded-xl transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <InformationCircleIcon className="w-5 h-5 mr-3 text-slate-400" />
              About
            </a>
          </Link>
          <Link href={`${productLink}/docs`} target="_blank" legacyBehavior>
            <a
              className="flex items-center justify-center w-1/2 text-slate-300 hover:bg-slate-800 p-3 rounded-xl transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <DocumentIcon className="w-5 h-5 mr-3 text-slate-400" />
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
        <header className="flex items-center gap-2 p-4 border-b border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70 backdrop-blur-sm shadow-sm">
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
          <div className="flex-1 min-w-0 sm:min-w-[220px] max-w-[360px] mr-2">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="h-10 w-full flex items-center gap-2 px-4 bg-white/90 dark:bg-slate-800/70 border border-slate-300 dark:border-slate-600 rounded-xl hover:border-slate-400 dark:hover:border-slate-500 transition-colors text-left"
            >
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
              <span className="min-w-0 truncate whitespace-nowrap text-gray-500 dark:text-gray-400 text-sm">
                Search address or ENS name
              </span>
              <kbd className="ml-auto hidden md:inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-300 px-1 text-[10px] text-slate-500 dark:border-slate-500 dark:text-slate-300">
                /
              </kbd>
            </button>
          </div>

          <div className="hidden xl:block">
            <span className="rounded-full border border-slate-300 bg-slate-100/80 px-3 py-1 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {currentPageLabel}
            </span>
          </div>

          <div className="hidden sm:block flex-1"></div>

          {router.pathname !== '/workspace' && (
            <div className="hidden md:block mr-2">
              <Link href="/workspace" legacyBehavior>
                <a className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white/90 px-4 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:bg-slate-700">
                  Workspace
                </a>
              </Link>
            </div>
          )}

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

        <main className="flex-1 p-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 transition-colors duration-200">
          <div className="mx-auto w-full max-w-7xl mb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={`${crumb.label}-${index}`}>
                  {crumb.href ? (
                    <Link href={crumb.href} legacyBehavior>
                      <a className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                        {crumb.label}
                      </a>
                    </Link>
                  ) : (
                    <span className="text-slate-700 dark:text-slate-200">
                      {crumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && <span>/</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
          {React.isValidElement(children)
            ? React.cloneElement(children as React.ReactElement<any>, {
                selectedChain,
              })
            : children}
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
