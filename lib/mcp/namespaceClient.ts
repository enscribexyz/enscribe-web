const NAMESPACE_MCP_URL = 'https://ens-mcp.namespace.ninja/mcp'

const ALLOWED_NAMESPACE_TOOLS = new Set([
  'get_profile_details',
  'get_names_for_address',
  'get_subnames_for_name',
  'get_name_history',
  'get_subgraph_records',
  'is_name_available',
  'get_name_price',
] as const)

export type AllowedNamespaceToolName = (typeof ALLOWED_NAMESPACE_TOOLS extends Set<
  infer T
>
  ? T
  : never) & string

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc?: string
  id?: number | string | null
  result?: unknown
  error?: {
    code?: number
    message?: string
  }
}

type NamespaceToolCallRawResult = {
  content?: Array<{
    type?: string
    text?: string
  }>
  structuredContent?: unknown
  isError?: boolean
}

export type NamespaceToolCallResult = {
  source: 'namespace.ninja'
  externalTool: AllowedNamespaceToolName
  data: unknown
  rawText?: string
}

function isAllowedNamespaceToolName(name: string): name is AllowedNamespaceToolName {
  return ALLOWED_NAMESPACE_TOOLS.has(name as AllowedNamespaceToolName)
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function extractTextContent(raw: NamespaceToolCallRawResult): string | undefined {
  const firstTextBlock = raw.content?.find(
    (item) => item?.type === 'text' && typeof item.text === 'string',
  )
  const text = firstTextBlock?.text?.trim()
  return text ? text : undefined
}

function normalizeNamespaceToolResult(args: {
  tool: AllowedNamespaceToolName
  raw: NamespaceToolCallRawResult
}): NamespaceToolCallResult {
  const rawText = extractTextContent(args.raw)

  if (args.raw.structuredContent !== undefined) {
    return {
      source: 'namespace.ninja',
      externalTool: args.tool,
      data: args.raw.structuredContent,
      rawText,
    }
  }

  if (rawText) {
    try {
      return {
        source: 'namespace.ninja',
        externalTool: args.tool,
        data: JSON.parse(rawText),
        rawText,
      }
    } catch {
      return {
        source: 'namespace.ninja',
        externalTool: args.tool,
        data: rawText,
        rawText,
      }
    }
  }

  return {
    source: 'namespace.ninja',
    externalTool: args.tool,
    data: null,
  }
}

export class NamespaceMcpClient {
  private requestId = 1

  constructor(
    private readonly baseUrl: string = NAMESPACE_MCP_URL,
    private readonly timeoutMs: number = 12000,
  ) {}

  private nextRequestId(): number {
    const current = this.requestId
    this.requestId += 1
    return current
  }

  private async postRpc(payload: JsonRpcRequest): Promise<JsonRpcResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(
          `Namespace MCP request failed with status ${response.status}.`,
        )
      }

      return (await response.json()) as JsonRpcResponse
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Namespace MCP request timed out.')
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  async initialize(): Promise<unknown> {
    const response = await this.postRpc({
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: {
          name: 'enscribe-web',
          version: '0.1.0',
        },
      },
    })

    if (response.error) {
      throw new Error(
        response.error.message || 'Namespace MCP initialize failed.',
      )
    }

    return response.result
  }

  async listTools(): Promise<unknown> {
    const response = await this.postRpc({
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method: 'tools/list',
      params: {},
    })

    if (response.error) {
      throw new Error(response.error.message || 'Namespace MCP tools/list failed.')
    }

    return response.result
  }

  async callAllowedTool(args: {
    toolName: string
    toolArgs: Record<string, unknown>
  }): Promise<NamespaceToolCallResult> {
    if (!isAllowedNamespaceToolName(args.toolName)) {
      throw new Error(`Namespace tool is not allowed: ${args.toolName}`)
    }

    const response = await this.postRpc({
      jsonrpc: '2.0',
      id: this.nextRequestId(),
      method: 'tools/call',
      params: {
        name: args.toolName,
        arguments: args.toolArgs,
      },
    })

    if (response.error) {
      throw new Error(
        response.error.message || `Namespace tool call failed: ${args.toolName}`,
      )
    }

    const result = asObject(response.result) as NamespaceToolCallRawResult
    if (result.isError === true) {
      const text = extractTextContent(result)
      throw new Error(text || `Namespace tool returned an error: ${args.toolName}`)
    }

    return normalizeNamespaceToolResult({
      tool: args.toolName,
      raw: result,
    })
  }
}

export function getAllowedNamespaceTools(): AllowedNamespaceToolName[] {
  return Array.from(ALLOWED_NAMESPACE_TOOLS)
}

