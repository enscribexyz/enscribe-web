import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { handleMcpRequest } from '@/lib/mcp/server'
import { PrimaryNamingMcpService } from '@/lib/mcp/primaryNamingService'

function buildMcpRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('MCP namespace tool integration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists namespaced ENS proxy tools', async () => {
    const response = await handleMcpRequest(
      buildMcpRequest({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
      new PrimaryNamingMcpService(),
    )

    const tools = (response as { result?: { tools?: Array<{ name: string }> } })
      .result?.tools
    expect(tools).toBeDefined()
    expect(tools?.some((tool) => tool.name === 'ens_ns_get_profile_details')).toBe(
      true,
    )
    expect(
      tools?.some((tool) => tool.name === 'ens_ns_get_names_for_address'),
    ).toBe(true)
    expect(
      tools?.some((tool) => tool.name === 'ens_ns_get_subnames_for_name'),
    ).toBe(true)
    expect(tools?.some((tool) => tool.name === 'ens_ns_get_name_history')).toBe(
      true,
    )
    expect(
      tools?.some((tool) => tool.name === 'ens_ns_get_subgraph_records'),
    ).toBe(true)
    expect(tools?.some((tool) => tool.name === 'ens_ns_is_name_available')).toBe(
      true,
    )
    expect(tools?.some((tool) => tool.name === 'ens_ns_get_name_price')).toBe(
      true,
    )
    expect(
      tools?.some((tool) => tool.name === 'ens_preflight_batch_naming_from_csv'),
    ).toBe(true)
    expect(
      tools?.some((tool) => tool.name === 'ens_build_batch_naming_tx_plan'),
    ).toBe(true)
  })

  it('proxies namespace tool calls and returns normalized output', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [{ type: 'text', text: '{"ownerAddress":"0xabc"}' }],
            structuredContent: {
              ownerAddress: '0xabc',
            },
            isError: false,
          },
        }),
        { status: 200 },
      ),
    )

    const response = await handleMcpRequest(
      buildMcpRequest({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'ens_ns_get_profile_details',
          arguments: {
            name: 'vitalik.eth',
          },
        },
      }),
      new PrimaryNamingMcpService(),
    )

    const contentText = (
      response as { result?: { content?: Array<{ text?: string }> } }
    ).result?.content?.[0]?.text
    expect(contentText).toBeDefined()

    const payload = JSON.parse(contentText as string) as {
      source: string
      externalTool: string
      data: unknown
    }
    expect(payload).toEqual({
      source: 'namespace.ninja',
      externalTool: 'get_profile_details',
      data: { ownerAddress: '0xabc' },
      rawText: '{"ownerAddress":"0xabc"}',
    })
  })

  it('returns MCP tool error for blocked namespaced tools', async () => {
    const response = await handleMcpRequest(
      buildMcpRequest({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'ens_ns_drop_database',
          arguments: {},
        },
      }),
      new PrimaryNamingMcpService(),
    )

    const result = response as {
      result?: {
        isError?: boolean
        content?: Array<{ text?: string }>
      }
    }

    expect(result.result?.isError).toBe(true)
    expect(result.result?.content?.[0]?.text).toContain(
      'Namespace tool is not allowed: drop_database',
    )
  })
})
