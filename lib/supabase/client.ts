import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY

function createNoopProxy(): ReturnType<typeof createBrowserClient> {
  const handler: ProxyHandler<object> = {
    get: (_target, prop) => {
      if (prop === 'then') return undefined
      return new Proxy(() => ({ data: null, error: null }), handler)
    },
    apply: () => ({ data: null, error: null }),
  }
  return new Proxy({}, handler) as ReturnType<typeof createBrowserClient>
}

export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    return createNoopProxy()
  }

  return createBrowserClient(supabaseUrl, supabaseKey)
}
