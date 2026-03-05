import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPENAI_RESPONSES_API = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4o-mini'

const SYSTEM_PROMPT = [
  'You are an ENS naming intent assistant for Enscribe.',
  'Scope is strictly ENS naming for contracts.',
  'Never ask for walletAddress. The app provides it.',
  'Required fields for set_primary_name: chainId, contractAddress, ensName.',
  'If required fields are missing, return status=need_info and place exactly one short follow-up question in assistantResponse.',
  'If the user asks unrelated or nonsense requests, return status=out_of_scope.',
  'If all required fields are present, return status=ready.',
  'Return JSON only, matching the response schema.',
].join(' ')

type IntentStatus = 'need_info' | 'ready' | 'out_of_scope'

type IntentConversationMessage = {
  role: 'user' | 'assistant'
  text: string
}

type ResponsesApiOutputItem = {
  type?: string
  content?: Array<{
    type?: string
    text?: string
  }>
}

type ResponsesApiPayload = {
  output_text?: string
  output?: ResponsesApiOutputItem[]
}

type IntentResponse = {
  status: IntentStatus
  assistantResponse: string
  intent: {
    action: 'set_primary_name'
    chainId: number
    contractAddress: `0x${string}`
    ensName: string
  } | null
}

type IntentRequestBody = {
  prompt?: unknown
  messages?: unknown
}

function extractOutputText(payload: ResponsesApiPayload): string {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim()
  }

  const textChunks: string[] = []
  for (const item of payload.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        textChunks.push(content.text)
      }
    }
  }

  return textChunks.join('\n').trim()
}

function parseIntentResponse(rawText: string): IntentResponse {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error('Intent model returned non-JSON output.')
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Intent model returned invalid object.')
  }

  const candidate = parsed as Partial<IntentResponse>
  const status = candidate.status
  const assistantResponse = candidate.assistantResponse
  const intent = candidate.intent

  if (
    status !== 'need_info' &&
    status !== 'ready' &&
    status !== 'out_of_scope'
  ) {
    throw new Error('Intent model returned invalid status.')
  }

  if (typeof assistantResponse !== 'string' || !assistantResponse.trim()) {
    throw new Error('Intent model returned invalid assistantResponse.')
  }

  let normalizedIntent: IntentResponse['intent'] = null
  // Only enforce strict intent payload validation once the model claims readiness.
  if (status === 'ready') {
    if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
      throw new Error('Ready intent must include a complete intent payload.')
    }

    const action = (intent as { action?: unknown }).action
    const chainId = (intent as { chainId?: unknown }).chainId
    const contractAddress = (intent as { contractAddress?: unknown })
      .contractAddress
    const ensName = (intent as { ensName?: unknown }).ensName

    if (action !== 'set_primary_name') {
      throw new Error('Intent action is not supported.')
    }
    if (
      typeof chainId !== 'number' ||
      !Number.isInteger(chainId) ||
      !Number.isFinite(chainId) ||
      chainId <= 0
    ) {
      throw new Error('Intent chainId is invalid.')
    }
    if (
      typeof contractAddress !== 'string' ||
      !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)
    ) {
      throw new Error('Intent contractAddress is invalid.')
    }
    if (
      typeof ensName !== 'string' ||
      !ensName.trim() ||
      !ensName.includes('.')
    ) {
      throw new Error('Intent ensName is invalid.')
    }

    normalizedIntent = {
      action,
      chainId,
      contractAddress: contractAddress as `0x${string}`,
      ensName: ensName.trim().toLowerCase().replace(/\.$/, ''),
    }
  }

  return {
    status,
    assistantResponse: assistantResponse.trim(),
    intent: normalizedIntent,
  }
}

function sanitizeConversation(
  value: unknown,
): IntentConversationMessage[] {
  if (!Array.isArray(value)) return []

  const messages: IntentConversationMessage[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const candidate = item as Partial<IntentConversationMessage>
    if (
      (candidate.role === 'user' || candidate.role === 'assistant') &&
      typeof candidate.text === 'string' &&
      candidate.text.trim()
    ) {
      messages.push({
        role: candidate.role,
        text: candidate.text.trim(),
      })
    }
  }

  // keep context compact and bounded
  return messages.slice(-8)
}

function toResponsesInputMessage(message: IntentConversationMessage): {
  role: 'user' | 'assistant'
  content: Array<{ type: 'input_text' | 'output_text'; text: string }>
} {
  return {
    role: message.role,
    content: [
      {
        // Responses API expects assistant history as output_text, not input_text.
        type: message.role === 'assistant' ? 'output_text' : 'input_text',
        text: message.text,
      },
    ],
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  let prompt = ''
  let messages: IntentConversationMessage[] = []
  try {
    const body = (await req.json()) as IntentRequestBody
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    messages = sanitizeConversation(body.messages)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  const model = process.env.OPENAI_INTENT_MODEL || DEFAULT_MODEL

  try {
    const conversationInput = messages.map(toResponsesInputMessage)

    const response = await fetch(OPENAI_RESPONSES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 200,
        text: {
          format: {
            type: 'json_schema',
            name: 'intent_response',
            strict: true,
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['status', 'assistantResponse', 'intent'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: ['need_info', 'ready', 'out_of_scope'],
                    },
                    assistantResponse: { type: 'string', minLength: 1 },
                    intent: {
                      anyOf: [
                    {
                      type: 'null',
                    },
                    {
                      type: 'object',
                      additionalProperties: false,
                      required: [
                        'action',
                        'chainId',
                        'contractAddress',
                        'ensName',
                      ],
                      properties: {
                        action: {
                          type: 'string',
                          enum: ['set_primary_name'],
                        },
                        chainId: {
                          type: 'integer',
                        },
                        contractAddress: {
                          type: 'string',
                        },
                        ensName: {
                          type: 'string',
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        input: [
          {
            role: 'system',
            content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
          },
          ...conversationInput,
          {
            role: 'user',
            content: [{ type: 'input_text', text: prompt }],
          },
        ],
      }),
    })

    const payload = (await response.json()) as ResponsesApiPayload & {
      error?: { message?: string }
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: payload.error?.message || 'OpenAI request failed.' },
        { status: response.status },
      )
    }

    const message = extractOutputText(payload)
    if (!message) {
      return NextResponse.json(
        { error: 'OpenAI response did not contain output text.' },
        { status: 502 },
      )
    }

    const intent = parseIntentResponse(message)

    return NextResponse.json({
      model,
      ...intent,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to call OpenAI API.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
