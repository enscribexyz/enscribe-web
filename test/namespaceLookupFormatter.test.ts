import { describe, expect, it } from 'vitest'

import { formatNamespaceLookupMessage } from '@/lib/ai/namespaceLookupFormatter'

describe('namespaceLookupFormatter', () => {
  it('formats availability responses', () => {
    const text = formatNamespaceLookupMessage('ens_ns_is_name_available', {
      source: 'namespace.ninja',
      data: { available: true },
    })

    expect(text).toContain('[source: namespace.ninja]')
    expect(text).toContain('Availability: Available')
  })

  it('formats names list and expiring soon summary', () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

    const text = formatNamespaceLookupMessage('ens_ns_get_names_for_address', {
      data: {
        names: [
          { name: 'alpha.eth', expiryDate: nextWeek },
          { name: 'beta.eth', expiryDate: nextYear },
        ],
      },
    })

    expect(text).toContain('Owned names: 2')
    expect(text).toContain('alpha.eth')
    expect(text).toContain('beta.eth')
    expect(text).toContain('Expiring in next 30 days: 1')
  })

  it('falls back to json when formatter cannot extract shape', () => {
    const text = formatNamespaceLookupMessage('ens_ns_get_name_history', {
      weird: 'shape',
    })

    expect(text).toContain('Lookup result (ens_ns_get_name_history):')
    expect(text).toContain('"weird": "shape"')
  })
})
