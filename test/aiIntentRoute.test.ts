import { describe, expect, it } from 'vitest'

import { parseIntentResponse } from '@/lib/ai/intentParser'

describe('ai-intent parseIntentResponse', () => {
  it('parses and normalizes ready set_primary_name intent', () => {
    const out = parseIntentResponse(
      JSON.stringify({
        status: 'ready',
        responseType: 'intent',
        assistantResponse: 'Ready to proceed.',
        intent: {
          action: 'set_primary_name',
          chainId: 11155111,
          contractAddress: '0x22D99F173af4Eb8a5909dd6E9319816531bB097b',
          ensName: 'McPTest1.abhi.eth.',
        },
      }),
    )

    expect(out.status).toBe('ready')
    expect(out.intent).toEqual({
      action: 'set_primary_name',
      chainId: 11155111,
      contractAddress: '0x22D99F173af4Eb8a5909dd6E9319816531bB097b',
      ensName: 'mcptest1.abhi.eth',
    })
  })

  it('parses ready set_batch_names_from_csv intent', () => {
    const out = parseIntentResponse(
      JSON.stringify({
        status: 'ready',
        responseType: 'intent',
        assistantResponse: 'Using the uploaded CSV on Sepolia.',
        intent: {
          action: 'set_batch_names_from_csv',
          chainId: 11155111,
        },
      }),
    )

    expect(out.status).toBe('ready')
    expect(out.intent).toEqual({
      action: 'set_batch_names_from_csv',
      chainId: 11155111,
    })
  })

  it('parses and normalizes ready namespace lookup intent', () => {
    const out = parseIntentResponse(
      JSON.stringify({
        status: 'ready',
        responseType: 'intent',
        assistantResponse: 'Running lookup.',
        intent: {
          action: 'namespace_lookup',
          toolName: 'ens_ns_get_names_for_address',
          arguments: {
            address: '0xDeB2Fd5BAdfbCD56c64a6BDBd5387d611394eB71',
            allowExpired: true,
          },
        },
      }),
    )

    expect(out.status).toBe('ready')
    expect(out.intent).toEqual({
      action: 'namespace_lookup',
      toolName: 'ens_ns_get_names_for_address',
      arguments: {
        address: '0xdeb2fd5badfbcd56c64a6bdbd5387d611394eb71',
        allowExpired: true,
      },
    })
  })

  it('rejects namespace lookup with unsupported tool', () => {
    expect(() =>
      parseIntentResponse(
        JSON.stringify({
          status: 'ready',
          responseType: 'intent',
          assistantResponse: 'Ready.',
          intent: {
            action: 'namespace_lookup',
            toolName: 'ens_ns_drop_database',
            arguments: {},
          },
        }),
      ),
    ).toThrow('Intent toolName is invalid.')
  })

  it('parses ready namespace_lookup_multi intent', () => {
    const out = parseIntentResponse(
      JSON.stringify({
        status: 'ready',
        responseType: 'intent',
        assistantResponse: 'Running lookups.',
        intent: {
          action: 'namespace_lookup_multi',
          calls: [
            {
              toolName: 'ens_ns_is_name_available',
              arguments: { name: 'example.eth.' },
            },
            {
              toolName: 'ens_ns_get_name_price',
              arguments: { name: 'example.eth', duration: '2 years' },
            },
          ],
        },
      }),
    )

    expect(out.intent).toEqual({
      action: 'namespace_lookup_multi',
      calls: [
        {
          toolName: 'ens_ns_is_name_available',
          arguments: { name: 'example.eth' },
        },
        {
          toolName: 'ens_ns_get_name_price',
          arguments: { name: 'example.eth', duration: '2 years' },
        },
      ],
    })
  })

  it('rejects namespace_lookup_multi with too many calls', () => {
    expect(() =>
      parseIntentResponse(
        JSON.stringify({
          status: 'ready',
          responseType: 'intent',
          assistantResponse: 'Running lookups.',
          intent: {
            action: 'namespace_lookup_multi',
            calls: [
              { toolName: 'ens_ns_is_name_available', arguments: { name: 'a.eth' } },
              { toolName: 'ens_ns_is_name_available', arguments: { name: 'b.eth' } },
              { toolName: 'ens_ns_is_name_available', arguments: { name: 'c.eth' } },
              { toolName: 'ens_ns_is_name_available', arguments: { name: 'd.eth' } },
            ],
          },
        }),
      ),
    ).toThrow('Intent has too many lookup calls.')
  })

  it('rejects name-price intent without duration', () => {
    expect(() =>
      parseIntentResponse(
        JSON.stringify({
          status: 'ready',
          responseType: 'intent',
          assistantResponse: 'Ready.',
          intent: {
            action: 'namespace_lookup',
            toolName: 'ens_ns_get_name_price',
            arguments: { name: 'example.eth' },
          },
        }),
      ),
    ).toThrow('Intent arguments.duration is invalid.')
  })

  it('accepts ready answer responses without intent payload', () => {
    const out = parseIntentResponse(
      JSON.stringify({
        status: 'ready',
        responseType: 'answer',
        assistantResponse: 'ENS maps human-readable names to onchain addresses and records.',
        intent: null,
      }),
    )

    expect(out.responseType).toBe('answer')
    expect(out.intent).toBeNull()
  })

  it('rejects answer responses that include intent payload', () => {
    expect(() =>
      parseIntentResponse(
        JSON.stringify({
          status: 'ready',
          responseType: 'answer',
          assistantResponse: 'This should be answer-only.',
          intent: {
            action: 'set_batch_names_from_csv',
            chainId: 11155111,
          },
        }),
      ),
    ).toThrow('Answer responses must set intent to null.')
  })
})
