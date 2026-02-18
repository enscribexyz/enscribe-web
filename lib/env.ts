/**
 * Validated environment variables.
 *
 * Client-side vars (NEXT_PUBLIC_*) are safe to import from both server and client code.
 * Server-only vars (no NEXT_PUBLIC_ prefix) must only be used in API routes / Route Handlers.
 *
 * All vars are validated at module load time. Missing required vars throw an error
 * rather than silently failing with empty strings.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

// ─── Client-safe env vars ────────────────────────────────────────────────────

export const env = {
  // Feature flags
  ENABLE_TESTNETS: optionalEnv('NEXT_PUBLIC_ENABLE_TESTNETS', 'false') === 'true',

  // WalletConnect
  WALLETCONNECT_PROJECT_ID: requireEnv('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'),

  // Supabase (anon key is safe to expose client-side with proper RLS)
  SUPABASE_URL: optionalEnv('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_KEY: optionalEnv('NEXT_PUBLIC_SUPABASE_KEY'),

  // ENS APIs
  ENS_RAINBOW_API: optionalEnv(
    'NEXT_PUBLIC_ENS_RAINBOW_API',
    'https://api.ensrainbow.io/',
  ),
  ENS_NODE_API: optionalEnv(
    'NEXT_PUBLIC_ENS_NODE_API',
    'https://api.sepolia.ensnode.io/',
  ),

  // Sourcify
  SOURCIFY_URL: optionalEnv(
    'NEXT_PUBLIC_SOURCIFY_URL',
    'https://repo.sourcify.dev/',
  ),
  SOURCIFY_API: optionalEnv(
    'NEXT_PUBLIC_SOURCIFY_API',
    'https://sourcify.dev/server/v2/contract/',
  ),

  // Docs
  DOCS_SITE_URL: optionalEnv('NEXT_PUBLIC_DOCS_SITE_URL', 'https://enscribe.xyz'),

  // Events
  TOPIC0_SET_NAME: optionalEnv(
    'NEXT_PUBLIC_TOPIC0_SET_NAME',
    '0xbce672f287ca218b7a90c84485d9b40640252149f0e8c2932fe972e3fbc6fdc3',
  ),
} as const

// ─── Server-only env vars ─────────────────────────────────────────────────────
// These are used only in API routes / Route Handlers.
// Do NOT import this object in client components.

export const serverEnv = {
  // Etherscan API key — kept server-side to avoid exposing in client bundle
  ETHERSCAN_API: optionalEnv(
    'ETHERSCAN_API',
    // Fall back to NEXT_PUBLIC_ variant for backward compat during migration
    optionalEnv('NEXT_PUBLIC_ETHERSCAN_API', 'https://api.etherscan.io/v2/api?apikey='),
  ),

  // The Graph API key — server-side only
  GRAPH_API_KEY: optionalEnv('GRAPH_API_KEY', optionalEnv('NEXT_PUBLIC_GRAPH_API_KEY')),
} as const
