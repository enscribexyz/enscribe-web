import Link from 'next/link'
import {
  ArrowRight,
  Shield,
  Layers,
  Zap,
  Globe,
  Users,
  Code2,
} from 'lucide-react'

const features = [
  {
    icon: Globe,
    title: 'Namespace Management',
    description:
      'Delegate your ENS domain and manage all contract subnames from a single dashboard.',
  },
  {
    icon: Layers,
    title: 'Batch Operations',
    description:
      'Name dozens of contracts in a single transaction with our batching engine.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Invite your team to manage your contract namespace with role-based access.',
  },
  {
    icon: Shield,
    title: 'Manager Delegation',
    description:
      'Safely delegate naming permissions without transferring ENS ownership.',
  },
  {
    icon: Zap,
    title: 'Account Abstraction',
    description:
      'Batch multiple operations into a single signature with ERC-4337.',
  },
  {
    icon: Code2,
    title: 'Multi-chain Support',
    description:
      'Name contracts across Ethereum, Base, Optimism, Arbitrum, Linea, and Scroll.',
  },
]

const chains = [
  'Ethereum',
  'Base',
  'Optimism',
  'Arbitrum',
  'Linea',
  'Scroll',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                E
              </span>
            </div>
            <span className="text-sm font-semibold">Enscribe</span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Now supporting 6 chains
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The identity layer for
            <br />
            <span className="text-primary">smart contracts</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-lg text-muted-foreground">
            Manage your ENS namespace across all your deployments. Give every
            contract a human-readable name.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start for Free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="https://docs.enscribe.xyz"
              className="rounded-md border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Chains */}
      <section className="border-y border-border bg-muted/30 py-8">
        <div className="mx-auto max-w-5xl px-6">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Supported Networks
          </p>
          <div className="flex items-center justify-center gap-8">
            {chains.map((chain) => (
              <span
                key={chain}
                className="text-sm font-medium text-muted-foreground"
              >
                {chain}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Everything you need to manage contract identity
          </h2>
          <p className="mt-2 text-muted-foreground">
            From single naming to enterprise-scale batch operations.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border py-20">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to name your contracts?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Free for a single ENS domain. Start managing your contract identity
            today.
          </p>
          <Link
            href="/sign-up"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
              <span className="text-[10px] font-bold text-primary-foreground">
                E
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Enscribe</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="https://docs.enscribe.xyz" className="hover:text-foreground">
              Docs
            </Link>
            <Link href="https://x.com/enscribe_" className="hover:text-foreground">
              Twitter
            </Link>
            <Link href="https://github.com/enscribexyz" className="hover:text-foreground">
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
