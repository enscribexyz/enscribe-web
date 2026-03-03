import { NextRequest, NextResponse } from 'next/server'
import { handleMcpRequest } from '@/lib/mcp/server'
import { PrimaryNamingMcpService } from '@/lib/mcp/primaryNamingService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const service = new PrimaryNamingMcpService()

export async function POST(req: NextRequest) {
  try {
    const response = await handleMcpRequest(req, service)
    return NextResponse.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid MCP request.'

    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message,
        },
      },
      { status: 400 },
    )
  }
}
