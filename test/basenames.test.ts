import { describe, it, expect } from 'vitest'
import { splitBasename } from '../utils/basenames'

describe('splitBasename', () => {
  it('normalizes and returns label/fqdn for base mainnet domains', () => {
    const result = splitBasename('MyContract.BASE.eth')

    expect(result).toEqual({
      label: 'mycontract',
      fqdn: 'mycontract.base.eth',
    })
  })

  it('supports basetest domains on Base Sepolia', () => {
    const result = splitBasename('example.basetest.eth')

    expect(result).toEqual({
      label: 'example',
      fqdn: 'example.basetest.eth',
    })
  })

  it('rejects domains without a Base suffix', () => {
    expect(() => splitBasename('wrongchain.eth')).toThrow(
      /must end with \.base\.eth or \.basetest\.eth/i,
    )
  })
})

