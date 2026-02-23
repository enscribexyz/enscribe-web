// encodeConstructorArgs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
// import { ethers } from 'ethers';
import {
  ConstructorArg,
  encodeConstructorArgs,
} from '../utils/componentUtils'

describe('encodeConstructorArgsViem', () => {
  const mockSetError = vi.fn()

  beforeEach(() => {
    mockSetError.mockClear()
  })

  it('correctly encodes valid args', () => {
    const bytecode = '0x600160005260206000f3'
    const args: ConstructorArg[] = [
      {
        type: 'string',
        value: 'hello',
        label: '',
        isCustom: false,
        isTuple: false,
      },
      {
        type: 'uint256',
        value: '123',
        label: '',
        isCustom: false,
        isTuple: false,
      },
    ]

    const result = encodeConstructorArgs(bytecode, args, mockSetError)
    const expected =
      '0x600160005260206000f30000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000007b000000000000000000000000000000000000000000000000000000000000000568656c6c6f000000000000000000000000000000000000000000000000000000'

    expect(result).toBe(expected)
    expect(mockSetError).not.toHaveBeenCalled()
  })

  it('handles invalid JSON and sets error', () => {
    const bytecode = '0xdeadbeef'
    const args: ConstructorArg[] = [
      {
        type: 'uint256',
        value: 'not-a-number',
        label: 'amount',
        isTuple: false,
        isCustom: false,
      },
    ]

    const result = encodeConstructorArgs(bytecode, args, mockSetError)

    expect(result).toBe(bytecode)
    expect(mockSetError).toHaveBeenCalledOnce()
    expect(mockSetError).toHaveBeenCalledWith(
      'Error encoding constructor arguments. Please check your inputs.',
    )
  })

  it('encodes array inputs correctly', () => {
    const bytecode = '0xabc123'
    const args: ConstructorArg[] = [
      {
        type: 'uint256[]',
        value: '[1,2,3]',
        label: '',
        isCustom: false,
        isTuple: false,
      },
    ]

    const result = encodeConstructorArgs(bytecode, args, mockSetError)
    const expected =
      '0xabc12300000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003'

    expect(result).toBe(expected)
    expect(mockSetError).not.toHaveBeenCalled()
  })
})
