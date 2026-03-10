import { describe, expect, it } from 'vitest'

import {
  groupEntriesForBatching,
  parseAndValidateBatchCsv,
  stripParentSuffix,
} from '@/lib/batchNaming'

describe('batch naming shared helpers', () => {
  it('parses CSV and infers parent domain', () => {
    const csvText = [
      'address,name',
      '0x22D99F173af4Eb8a5909dd6E9319816531bB097b,core.abhi.eth',
      '0x5b38da6a701c568545dcfcb03fcb875f56beddc4,vault.abhi.eth',
    ].join('\n')

    const out = parseAndValidateBatchCsv({ csvText })

    expect(out.inferredParentName).toBe('abhi.eth')
    expect(out.issues).toHaveLength(0)
    expect(out.entries).toHaveLength(2)
    expect(out.entries.every((entry) => !entry.addressError && !entry.labelError)).toBe(
      true,
    )
  })

  it('marks duplicate rows with validation errors', () => {
    const csvText = [
      'address,name',
      '0x22D99F173af4Eb8a5909dd6E9319816531bB097b,core.abhi.eth',
      '0x22D99F173af4Eb8a5909dd6E9319816531bB097b,core.abhi.eth',
    ].join('\n')

    const out = parseAndValidateBatchCsv({ csvText })
    const issues = out.issues.map((issue) => issue.message)

    expect(issues.some((message) => message.includes('Duplicate address'))).toBe(true)
  })

  it('groups entries by level and creates missing parent records', () => {
    const entries = [
      {
        id: '1',
        address: '0x22D99F173af4Eb8a5909dd6E9319816531bB097b',
        label: 'token.v1.abhi.eth',
      },
    ]

    const groups = groupEntriesForBatching(entries, 'abhi.eth', (fullName) => ({
      id: `zero-${fullName}`,
      address: '0x0000000000000000000000000000000000000000',
      label: fullName,
    }))

    const allLabels = groups.flatMap((group) => group.entries.map((entry) => entry.label))

    expect(allLabels).toContain('v1.abhi.eth')
    expect(allLabels).toContain('token.v1.abhi.eth')

    const tokenGroup = groups.find((group) =>
      group.entries.some((entry) => entry.label === 'token.v1.abhi.eth'),
    )

    expect(tokenGroup).toBeDefined()
    expect(stripParentSuffix('token.v1.abhi.eth', tokenGroup!.parentName)).toBe('token')
  })
})
