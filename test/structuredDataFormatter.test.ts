import { describe, expect, it } from 'vitest'

import {
  formatStructuredData,
  tryFormatJsonText,
} from '@/lib/ai/structuredDataFormatter'

describe('structuredDataFormatter', () => {
  it('formats nested objects and arrays as field/value lines', () => {
    const text = formatStructuredData({
      contract: {
        address: '0xabc',
        labels: ['alpha', 'beta'],
      },
    })

    expect(text).toContain('contract:')
    expect(text).toContain('  address: 0xabc')
    expect(text).toContain('  labels:')
    expect(text).toContain('    0: alpha')
    expect(text).toContain('    1: beta')
  })

  it('formats full json text payloads', () => {
    const text = tryFormatJsonText('{"status":"ok","count":2}')
    expect(text).toBe('status: ok\ncount: 2')
  })

  it('formats trailing json block while keeping prefix text', () => {
    const text = tryFormatJsonText('Result\n{"owner":"0xabc"}')
    expect(text).toBe('Result\nowner: 0xabc')
  })
})
