import { describe, expect, it } from 'vitest'
import { encodeFunctionData, parseAbi, toFunctionSelector } from 'viem'
import { validateCallTargetAndSelector } from '@/lib/mcp/policy'

const resolver = '0x00000000000000000000000000000000000000aa'
const reverseRegistrar = '0x00000000000000000000000000000000000000bb'

const policy = new Map<string, Set<string>>([
  [
    resolver.toLowerCase(),
    new Set([
      toFunctionSelector('function setAddr(bytes32 node, address a)'),
      toFunctionSelector('function setName(bytes32 node, string name)'),
    ]),
  ],
  [
    reverseRegistrar.toLowerCase(),
    new Set([
      toFunctionSelector(
        'function setNameForAddr(address addr, address owner, address resolver, string name)',
      ),
    ]),
  ],
])

describe('primary naming policy validation', () => {
  it('accepts setAddr on allowed resolver target', () => {
    const data = encodeFunctionData({
      abi: parseAbi(['function setAddr(bytes32 node, address a)']),
      functionName: 'setAddr',
      args: [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x00000000000000000000000000000000000000cc',
      ],
    })

    const result = validateCallTargetAndSelector({
      to: resolver,
      data,
      policy,
    })

    expect(result).toEqual({ ok: true })
  })

  it('rejects selector mismatch for allowed target', () => {
    const data = encodeFunctionData({
      abi: parseAbi(['function owner() view returns (address)']),
      functionName: 'owner',
      args: [],
    })

    const result = validateCallTargetAndSelector({
      to: resolver,
      data,
      policy,
    })

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({
      reason: 'Function selector is not allowed for this target contract.',
    })
  })

  it('rejects unknown target contract', () => {
    const data = toFunctionSelector('function setAddr(bytes32 node, address a)')

    const result = validateCallTargetAndSelector({
      to: '0x00000000000000000000000000000000000000dd',
      data,
      policy,
    })

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({
      reason: 'Target contract is not allowed by policy.',
    })
  })

  it('rejects empty calldata', () => {
    const result = validateCallTargetAndSelector({
      to: resolver,
      data: '0x',
      policy,
    })

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({
      reason: 'Missing or invalid calldata.',
    })
  })
})
