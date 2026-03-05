import { describe, expect, it, vi } from 'vitest'
import {
  NamespaceMcpClient,
  getAllowedNamespaceTools,
} from '@/lib/mcp/namespaceClient'

describe('namespace MCP client', () => {
  it('exposes expected allowlisted tools', () => {
    expect(getAllowedNamespaceTools()).toEqual([
      'get_profile_details',
      'get_names_for_address',
      'get_subnames_for_name',
      'get_name_history',
      'get_subgraph_records',
      'is_name_available',
      'get_name_price',
    ])
  })

  it('blocks calls to non-allowlisted tools', async () => {
    const client = new NamespaceMcpClient('https://example.com/mcp')
    await expect(
      client.callAllowedTool({
        toolName: 'delete_everything',
        toolArgs: {},
      }),
    ).rejects.toThrow('Namespace tool is not allowed: delete_everything')
  })

  it('normalizes structuredContent response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: '{"name":"vitalik.eth"}' }],
            structuredContent: { name: 'vitalik.eth', owner: '0xabc' },
            isError: false,
          },
        }),
        { status: 200 },
      ),
    )

    const client = new NamespaceMcpClient('https://example.com/mcp')
    const result = await client.callAllowedTool({
      toolName: 'get_profile_details',
      toolArgs: { name: 'vitalik.eth' },
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result).toEqual({
      source: 'namespace.ninja',
      externalTool: 'get_profile_details',
      data: { name: 'vitalik.eth', owner: '0xabc' },
      rawText: '{"name":"vitalik.eth"}',
    })
  })

  it('normalizes text-only JSON response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: '{"available":true}' }],
            isError: false,
          },
        }),
        { status: 200 },
      ),
    )

    const client = new NamespaceMcpClient('https://example.com/mcp')
    const result = await client.callAllowedTool({
      toolName: 'is_name_available',
      toolArgs: { name: 'example.eth' },
    })

    expect(result).toEqual({
      source: 'namespace.ninja',
      externalTool: 'is_name_available',
      data: { available: true },
      rawText: '{"available":true}',
    })
  })

  it('raises error when namespace tool returns isError=true', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: 'upstream failure' }],
            isError: true,
          },
        }),
        { status: 200 },
      ),
    )

    const client = new NamespaceMcpClient('https://example.com/mcp')
    await expect(
      client.callAllowedTool({
        toolName: 'get_name_history',
        toolArgs: { name: 'vitalik.eth' },
      }),
    ).rejects.toThrow('upstream failure')
  })
})

