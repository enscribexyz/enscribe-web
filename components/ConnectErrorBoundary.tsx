import React from 'react'

interface State {
  hasError: boolean
  resetKey: number
  message?: string
}

/**
 * Error boundary around the RainbowKit ConnectButton.
 * Cleans up stale WalletConnect localStorage on known transient errors.
 */
export class ConnectErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, resetKey: 0 }
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    const message = String((error as Error)?.message || '')
    if (typeof window !== 'undefined') {
      try {
        if (
          message.includes('Proposal expired') ||
          message.includes('WalletConnect Core is already initialized')
        ) {
          const keysToClear: string[] = []
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
