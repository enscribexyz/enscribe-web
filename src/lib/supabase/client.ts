import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

// A proxy that returns itself for any property access or function call,
// and resolves to { data: null, error: null } for awaits.
// This lets all Supabase chaining patterns work without crashing.
function createNoopClient(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === 'then') return undefined // make it non-thenable at top level
      return (...args: any[]) => {
        // Return a thenable proxy so await works
        return new Proxy(
          {},
          {
            get(_t, p) {
              if (p === 'then') {
                // When awaited, resolve with empty result
                return (resolve: any) =>
                  resolve({ data: null, error: null })
              }
              // Allow further chaining (.eq(), .single(), .order(), .limit(), etc.)
              return (..._a: any[]) =>
                new Proxy(
                  {},
                  {
                    get(_t2, p2) {
                      if (p2 === 'then') {
                        return (resolve: any) =>
                          resolve({ data: null, error: null })
                      }
                      return (..._a2: any[]) =>
                        new Proxy(
                          {},
                          {
                            get(_t3, p3) {
                              if (p3 === 'then') {
                                return (resolve: any) =>
                                  resolve({ data: null, error: null })
                              }
                              return (..._a3: any[]) =>
                                new Proxy(
                                  {},
                                  {
                                    get(_t4, p4) {
                                      if (p4 === 'then') {
                                        return (resolve: any) =>
                                          resolve({
                                            data: null,
                                            error: null,
                                          })
                                      }
                                      return () => ({
                                        data: null,
                                        error: null,
                                      })
                                    },
                                  },
                                )
                            },
                          },
                        )
                    },
                  },
                )
            },
          },
        )
      }
    },
  }
  return new Proxy({}, handler)
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_KEY

  if (!url || !key) {
    return createNoopClient()
  }

  if (!_client) {
    _client = createBrowserClient(url, key)
  }
  return _client
}
