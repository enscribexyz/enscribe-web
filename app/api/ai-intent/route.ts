import { NextRequest, NextResponse } from 'next/server'
import {
  INTENT_RESPONSE_TYPES,
  INTENT_STATUSES,
  NAMESPACE_TOOL_NAMES,
  parseIntentResponse,
} from '@/lib/ai/intentParser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OPENAI_RESPONSES_API = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-4o-mini'

const NAMESPACE_ARGUMENTS_SCHEMA = {
  anyOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        name: { type: 'string' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['address'],
      properties: {
        address: { type: 'string' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'duration'],
      properties: {
        name: { type: 'string' },
        duration: { type: 'string' },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'textRecords'],
      properties: {
        name: { type: 'string' },
        textRecords: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'coinRecords'],
      properties: {
        name: { type: 'string' },
        coinRecords: {
          type: 'array',
          items: {
            anyOf: [{ type: 'string' }, { type: 'number' }],
          },
        },
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'contentHash'],
      properties: {
        name: { type: 'string' },
        contentHash: { type: 'boolean' },
      },
    },
  ],
} as const

const SYSTEM_PROMPT = [
  'You are an ENS assistant for Enscribe.',
  'You can either route to an intent or directly answer ENS ecosystem questions.',
  'Never ask for walletAddress. The app provides it.',
  'Never ask the user to choose a tool name. Tool selection is internal.',
  'Never mention internal tool ids (like ens_ns_*) to the user.',
  'responseType decides handling: use responseType=intent for actionable requests; use responseType=answer for conceptual or explanatory ENS questions.',
  'Required fields for set_primary_name: chainId, contractAddress, ensName.',
  'Required fields for set_batch_names_from_csv: chainId.',
  'Use set_batch_names_from_csv when the user asks to name contracts from an uploaded CSV file.',
  'Do not attempt CSV validation in the intent response. Validation is deterministic in app/server code.',
  `For read-only ENS lookup questions, select one namespace tool from: ${NAMESPACE_TOOL_NAMES.join(', ')}.`,
  'For single read requests return status=ready, responseType=intent, action=namespace_lookup with toolName and arguments.',
  'For compound read requests needing multiple reads return status=ready, responseType=intent, action=namespace_lookup_multi with calls[].',
  'For conceptual ENS questions like "what is ENS?", "what is a primary name?", or "how do I use this?", return status=ready, responseType=answer, intent=null, and put the full answer in assistantResponse.',
  'Examples: "who owns vitalik.eth" => status=ready, responseType=intent, namespace_lookup with toolName=ens_ns_get_profile_details + arguments.name=vitalik.eth.',
  'Examples: "names owned by 0x..." => status=ready, responseType=intent, namespace_lookup with toolName=ens_ns_get_names_for_address + arguments.address.',
  'Examples: "what is ENS?" => status=ready, responseType=answer, intent=null, assistantResponse as a short accurate explanation.',
  'For read prompts with enough info, do not ask follow-up questions.',
  'If required fields are missing, return status=need_info, responseType=answer, intent=null, and place exactly one short follow-up question in assistantResponse.',
  'If the user asks unrelated or nonsense requests, return status=out_of_scope, responseType=answer, intent=null.',
  'If all required fields are present, return status=ready.',
  'Return JSON only, matching the response schema.',
].join(' ')

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

type IntentRequestBody = {
  prompt?: unknown
  messages?: unknown
  attachmentContext?: unknown
}

type AttachmentContext = {
  hasCsvAttachment: boolean
  csvRowCount?: number
  csvIssueCount?: number
  inferredParentName?: string
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

function sanitizeAttachmentContext(value: unknown): AttachmentContext {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { hasCsvAttachment: false }
  }

  const raw = value as Partial<AttachmentContext>
  const hasCsvAttachment = Boolean(raw.hasCsvAttachment)

  return {
    hasCsvAttachment,
    csvRowCount:
      typeof raw.csvRowCount === 'number' && Number.isFinite(raw.csvRowCount)
        ? raw.csvRowCount
        : undefined,
    csvIssueCount:
      typeof raw.csvIssueCount === 'number' && Number.isFinite(raw.csvIssueCount)
        ? raw.csvIssueCount
        : undefined,
    inferredParentName:
      typeof raw.inferredParentName === 'string' && raw.inferredParentName.trim()
        ? raw.inferredParentName.trim()
        : undefined,
  }
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
  let prompt = ''
  let messages: IntentConversationMessage[] = []
  let attachmentContext: AttachmentContext = { hasCsvAttachment: false }
  try {
    const body = (await req.json()) as IntentRequestBody
    prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    messages = sanitizeConversation(body.messages)
    attachmentContext = sanitizeAttachmentContext(body.attachmentContext)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required.' }, { status: 400 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured on the server.' },
      { status: 500 },
    )
  }

  const model = process.env.OPENAI_INTENT_MODEL || DEFAULT_MODEL

  try {
    const conversationInput = messages.map(toResponsesInputMessage)
    const attachmentContextText = attachmentContext.hasCsvAttachment
      ? `Attachment context: CSV is attached; rows=${attachmentContext.csvRowCount ?? 'unknown'}; validationIssues=${attachmentContext.csvIssueCount ?? 'unknown'}; inferredParent=${attachmentContext.inferredParentName ?? 'unknown'}.`
      : 'Attachment context: no CSV attached.'

    const response = await fetch(OPENAI_RESPONSES_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_output_tokens: 320,
        text: {
          format: {
            type: 'json_schema',
            name: 'intent_response',
            strict: true,
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['status', 'responseType', 'assistantResponse', 'intent'],
                  properties: {
                    status: {
                      type: 'string',
                      enum: [...INTENT_STATUSES],
                    },
                    responseType: {
                      type: 'string',
                      enum: [...INTENT_RESPONSE_TYPES],
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
                    {
                      type: 'object',
                      additionalProperties: false,
                      required: ['action', 'chainId'],
                      properties: {
                        action: {
                          type: 'string',
                          enum: ['set_batch_names_from_csv'],
                        },
                        chainId: {
                          type: 'integer',
                        },
                      },
                    },
                    {
                      type: 'object',
                      additionalProperties: false,
                      required: ['action', 'toolName', 'arguments'],
                      properties: {
                        action: {
                          type: 'string',
                          enum: ['namespace_lookup'],
                        },
                        toolName: {
                          type: 'string',
                          enum: [...NAMESPACE_TOOL_NAMES],
                        },
                        arguments: NAMESPACE_ARGUMENTS_SCHEMA,
                      },
                    },
                    {
                      type: 'object',
                      additionalProperties: false,
                      required: ['action', 'calls'],
                      properties: {
                        action: {
                          type: 'string',
                          enum: ['namespace_lookup_multi'],
                        },
                        calls: {
                          type: 'array',
                          minItems: 1,
                          maxItems: 3,
                          items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['toolName', 'arguments'],
                            properties: {
                              toolName: {
                                type: 'string',
                                enum: [...NAMESPACE_TOOL_NAMES],
                              },
                              arguments: NAMESPACE_ARGUMENTS_SCHEMA,
                            },
                          },
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
          {
            role: 'system',
            content: [{ type: 'input_text', text: attachmentContextText }],
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
