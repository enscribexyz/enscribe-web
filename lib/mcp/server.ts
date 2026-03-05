import type { NextRequest } from 'next/server'
import { PrimaryNamingMcpService } from '@/lib/mcp/primaryNamingService'
import { NamespaceMcpClient } from '@/lib/mcp/namespaceClient'

type JsonRpcRequest = {
  id?: string | number | null
  jsonrpc?: string
  method?: string
  params?: Record<string, unknown>
}

type ToolSchema = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations?: Record<string, unknown>
}

const SERVER_INFO = {
  name: 'enscribe-primary-naming-mcp',
  version: '0.1.0',
}

const NAMESPACE_TOOL_PREFIX = 'ens_ns_'

const namespaceMcpClient = new NamespaceMcpClient()

const TOOLS: ToolSchema[] = [
  {
    name: 'ens_preflight_set_primary_name',
    description:
      'Read-only checks for eligibility and current ENS forward/reverse state before primary naming.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['chainId', 'walletAddress', 'contractAddress', 'ensName'],
      properties: {
        chainId: { type: 'number' },
        walletAddress: { type: 'string' },
        contractAddress: { type: 'string' },
        ensName: { type: 'string' },
      },
    },
  },
  {
    name: 'ens_build_primary_name_tx_plan',
    description:
      'Build unsigned transactions to set ENS forward resolution and primary name for a contract.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['chainId', 'walletAddress', 'contractAddress', 'ensName'],
      properties: {
        chainId: { type: 'number' },
        walletAddress: { type: 'string' },
        contractAddress: { type: 'string' },
        ensName: { type: 'string' },
        allowForwardOnly: { type: 'boolean' },
      },
    },
  },
  {
    name: 'ens_submit_signed_txs',
    description:
      'Broadcast pre-approved signed transactions for ENS primary naming. Enforces strict target/method policy.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['chainId', 'signedTxs'],
      properties: {
        chainId: { type: 'number' },
        signedTxs: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        },
        operationId: { type: 'string' },
      },
    },
  },
  {
    name: 'ens_get_primary_name_status',
    description:
      'Get transaction receipts and optional on-chain verification for forward/reverse mappings.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['chainId'],
      properties: {
        chainId: { type: 'number' },
        txHashes: {
          type: 'array',
          items: { type: 'string' },
        },
        contractAddress: { type: 'string' },
        ensName: { type: 'string' },
      },
    },
  },
  {
    name: 'ens_ns_get_profile_details',
    description:
      'Proxy to namespace.ninja ENS MCP: fetch owner/resolver/expiry/records for a name.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string' },
        textRecords: { type: 'array', items: { type: 'string' } },
        coinRecords: {
          type: 'array',
          items: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
        contentHash: { type: 'boolean' },
      },
    },
  },
  {
    name: 'ens_ns_get_names_for_address',
    description:
      'Proxy to namespace.ninja ENS MCP: list ENS names owned by an address.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['address'],
      properties: {
        address: { type: 'string' },
        searchString: { type: 'string' },
        allowExpired: { type: 'boolean' },
        allowDeleted: { type: 'boolean' },
        orderBy: {
          type: 'string',
          enum: ['expiryDate', 'name', 'labelName', 'createdAt'],
        },
        orderDirection: { type: 'string', enum: ['asc', 'desc'] },
        pageSize: { type: 'number' },
      },
    },
  },
  {
    name: 'ens_ns_get_subnames_for_name',
    description:
      'Proxy to namespace.ninja ENS MCP: list subnames (subdomains) under an ENS name.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string' },
        searchString: { type: 'string' },
        allowExpired: { type: 'boolean' },
        allowDeleted: { type: 'boolean' },
        orderBy: {
          type: 'string',
          enum: ['expiryDate', 'name', 'labelName', 'createdAt'],
        },
        orderDirection: { type: 'string', enum: ['asc', 'desc'] },
        pageSize: { type: 'number' },
      },
    },
  },
  {
    name: 'ens_ns_get_name_history',
    description:
      'Proxy to namespace.ninja ENS MCP: fetch history/events for an ENS name.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
  },
  {
    name: 'ens_ns_get_subgraph_records',
    description:
      'Proxy to namespace.ninja ENS MCP: list record keys associated with an ENS name.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
  },
  {
    name: 'ens_ns_is_name_available',
    description:
      'Proxy to namespace.ninja ENS MCP: check ENS name availability.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
  },
  {
    name: 'ens_ns_get_name_price',
    description:
      'Proxy to namespace.ninja ENS MCP: get ENS registration price for a duration.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'duration'],
      properties: {
        name: { type: 'string' },
        duration: { type: 'string' },
      },
    },
  },
]

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function asToolArgs(params: Record<string, unknown>): Record<string, unknown> {
  const raw = params.arguments
  if (!raw) return {}

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return asObject(parsed)
    } catch {
      return {}
    }
  }

  return asObject(raw)
}

function toNamespaceToolName(localToolName: string): string | null {
  if (!localToolName.startsWith(NAMESPACE_TOOL_PREFIX)) return null
  return localToolName.slice(NAMESPACE_TOOL_PREFIX.length)
}

function resultMessage(payload: unknown) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload),
      },
    ],
    isError: false,
  }
}

function errorMessage(message: string) {
  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    isError: true,
  }
}

export async function handleMcpRequest(
  request: NextRequest,
  service: PrimaryNamingMcpService,
) {
  const body = (await request.json()) as JsonRpcRequest
  const id = body.id ?? null
  const method = body.method
  const params = asObject(body.params)

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2025-03-26',
        capabilities: {
          tools: {
            listChanged: false,
          },
        },
        serverInfo: SERVER_INFO,
      },
    }
  }

  if (method === 'ping' || method === 'notifications/initialized') {
    return {
      jsonrpc: '2.0',
      id,
      result: {},
    }
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: TOOLS,
      },
    }
  }

  if (method === 'tools/call') {
    const name = params.name
    const args = asToolArgs(params)

    try {
      if (name === 'ens_preflight_set_primary_name') {
        const out = await service.preflight({
          chainId: Number(args.chainId),
          walletAddress: String(args.walletAddress ?? ''),
          contractAddress: String(args.contractAddress ?? ''),
          ensName: String(args.ensName ?? ''),
        })
        return { jsonrpc: '2.0', id, result: resultMessage(out) }
      }

      if (name === 'ens_build_primary_name_tx_plan') {
        const out = await service.buildPlan({
          chainId: Number(args.chainId),
          walletAddress: String(args.walletAddress ?? ''),
          contractAddress: String(args.contractAddress ?? ''),
          ensName: String(args.ensName ?? ''),
          allowForwardOnly:
            args.allowForwardOnly === undefined
              ? undefined
              : Boolean(args.allowForwardOnly),
        })
        return { jsonrpc: '2.0', id, result: resultMessage(out) }
      }

      if (name === 'ens_submit_signed_txs') {
        const txs = Array.isArray(args.signedTxs)
          ? args.signedTxs.map((value) => String(value))
          : []

        const out = await service.submitSignedTxs({
          chainId: Number(args.chainId),
          signedTxs: txs,
          operationId:
            args.operationId === undefined ? undefined : String(args.operationId),
        })

        return { jsonrpc: '2.0', id, result: resultMessage(out) }
      }

      if (name === 'ens_get_primary_name_status') {
        const txHashes = Array.isArray(args.txHashes)
          ? args.txHashes.map((value) => String(value))
          : undefined

        const out = await service.getStatus({
          chainId: Number(args.chainId),
          txHashes,
          contractAddress:
            args.contractAddress === undefined
              ? undefined
              : String(args.contractAddress),
          ensName: args.ensName === undefined ? undefined : String(args.ensName),
        })

        return { jsonrpc: '2.0', id, result: resultMessage(out) }
      }

      if (typeof name === 'string') {
        const namespaceTool = toNamespaceToolName(name)
        if (namespaceTool) {
          const out = await namespaceMcpClient.callAllowedTool({
            toolName: namespaceTool,
            toolArgs: args,
          })
          return { jsonrpc: '2.0', id, result: resultMessage(out) }
        }
      }

      return {
        jsonrpc: '2.0',
        id,
        result: errorMessage(`Unknown tool: ${String(name)}`),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tool call failed.'

      return {
        jsonrpc: '2.0',
        id,
        result: errorMessage(message),
      }
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: {
      code: -32601,
      message: `Unsupported method: ${String(method)}`,
    },
  }
}
