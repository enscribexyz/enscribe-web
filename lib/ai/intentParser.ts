export const NAMESPACE_TOOL_NAMES = [
  'ens_ns_get_profile_details',
  'ens_ns_get_names_for_address',
  'ens_ns_get_subnames_for_name',
  'ens_ns_get_name_history',
  'ens_ns_get_subgraph_records',
  'ens_ns_is_name_available',
  'ens_ns_get_name_price',
] as const

export type NamespaceToolName = (typeof NAMESPACE_TOOL_NAMES)[number]

export type IntentStatus = 'need_info' | 'ready' | 'out_of_scope'

export type PrimaryNameIntent = {
  action: 'set_primary_name'
  chainId: number
  contractAddress: `0x${string}`
  ensName: string
}

export type BatchCsvIntent = {
  action: 'set_batch_names_from_csv'
  chainId: number
}

export type NamespaceLookupIntent = {
  action: 'namespace_lookup'
  toolName: NamespaceToolName
  arguments: Record<string, unknown>
}

export type NamespaceLookupCall = {
  toolName: NamespaceToolName
  arguments: Record<string, unknown>
}

export type NamespaceLookupMultiIntent = {
  action: 'namespace_lookup_multi'
  calls: NamespaceLookupCall[]
}

export type IntentResponse = {
  status: IntentStatus
  assistantResponse: string
  intent:
    | PrimaryNameIntent
    | BatchCsvIntent
    | NamespaceLookupIntent
    | NamespaceLookupMultiIntent
    | null
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function requireNameArg(args: Record<string, unknown>): Record<string, unknown> {
  const name = args.name
  if (typeof name !== 'string' || !name.trim() || !name.includes('.')) {
    throw new Error('Intent arguments.name is invalid.')
  }
  return {
    ...args,
    name: name.trim().toLowerCase().replace(/\.$/, ''),
  }
}

function normalizeNamespaceLookupIntent(intent: unknown): NamespaceLookupIntent {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
    throw new Error('Ready intent must include a complete intent payload.')
  }

  const toolName = (intent as { toolName?: unknown }).toolName
  if (
    typeof toolName !== 'string' ||
    !NAMESPACE_TOOL_NAMES.includes(toolName as NamespaceToolName)
  ) {
    throw new Error('Intent toolName is invalid.')
  }

  const rawArgs = asObject((intent as { arguments?: unknown }).arguments)
  let normalizedArgs: Record<string, unknown>

  switch (toolName) {
    case 'ens_ns_get_names_for_address': {
      const address = rawArgs.address
      if (typeof address !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new Error('Intent arguments.address is invalid.')
      }
      normalizedArgs = { ...rawArgs, address: address.toLowerCase() }
      break
    }
    case 'ens_ns_get_name_price': {
      const withName = requireNameArg(rawArgs)
      const duration = withName.duration
      if (typeof duration !== 'string' || !duration.trim()) {
        throw new Error('Intent arguments.duration is invalid.')
      }
      normalizedArgs = {
        ...withName,
        duration: duration.trim(),
      }
      break
    }
    case 'ens_ns_get_profile_details':
    case 'ens_ns_get_subnames_for_name':
    case 'ens_ns_get_name_history':
    case 'ens_ns_get_subgraph_records':
    case 'ens_ns_is_name_available': {
      normalizedArgs = requireNameArg(rawArgs)
      break
    }
    default: {
      throw new Error('Intent toolName is invalid.')
    }
  }

  return {
    action: 'namespace_lookup',
    toolName,
    arguments: normalizedArgs,
  }
}

function normalizeNamespaceLookupCall(call: unknown): NamespaceLookupCall {
  const normalized = normalizeNamespaceLookupIntent({
    action: 'namespace_lookup',
    toolName: (call as { toolName?: unknown }).toolName,
    arguments: (call as { arguments?: unknown }).arguments,
  })

  return {
    toolName: normalized.toolName,
    arguments: normalized.arguments,
  }
}

function normalizeNamespaceLookupMultiIntent(
  intent: unknown,
): NamespaceLookupMultiIntent {
  if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
    throw new Error('Ready intent must include a complete intent payload.')
  }

  const calls = (intent as { calls?: unknown }).calls
  if (!Array.isArray(calls) || calls.length === 0) {
    throw new Error('Intent calls are invalid.')
  }
  if (calls.length > 3) {
    throw new Error('Intent has too many lookup calls.')
  }

  return {
    action: 'namespace_lookup_multi',
    calls: calls.map((call) => normalizeNamespaceLookupCall(call)),
  }
}

export function parseIntentResponse(rawText: string): IntentResponse {
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
  if (status === 'ready') {
    if (!intent || typeof intent !== 'object' || Array.isArray(intent)) {
      throw new Error('Ready intent must include a complete intent payload.')
    }

    const action = (intent as { action?: unknown }).action
    if (action === 'set_primary_name') {
      const chainId = (intent as { chainId?: unknown }).chainId
      const contractAddress = (intent as { contractAddress?: unknown })
        .contractAddress
      const ensName = (intent as { ensName?: unknown }).ensName

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
    } else if (action === 'set_batch_names_from_csv') {
      const chainId = (intent as { chainId?: unknown }).chainId

      if (
        typeof chainId !== 'number' ||
        !Number.isInteger(chainId) ||
        !Number.isFinite(chainId) ||
        chainId <= 0
      ) {
        throw new Error('Intent chainId is invalid.')
      }

      normalizedIntent = {
        action,
        chainId,
      }
    } else if (action === 'namespace_lookup') {
      normalizedIntent = normalizeNamespaceLookupIntent(intent)
    } else if (action === 'namespace_lookup_multi') {
      normalizedIntent = normalizeNamespaceLookupMultiIntent(intent)
    } else {
      throw new Error('Intent action is not supported.')
    }
  }

  return {
    status,
    assistantResponse: assistantResponse.trim(),
    intent: normalizedIntent,
  }
}
