import {
  formatStructuredData,
  tryFormatJsonText,
} from '@/lib/ai/structuredDataFormatter'

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function extractEnvelope(payload: unknown): {
  data: unknown
  source?: string
  rawText?: string
} {
  const obj = asObject(payload)
  const source = asString(obj.source) ?? undefined
  const rawText = asString(obj.rawText) ?? undefined
  if ('data' in obj) {
    return {
      data: obj.data,
      source,
      rawText,
    }
  }
  return {
    data: payload,
    source,
    rawText,
  }
}

function collectNameItems(data: unknown): Array<{ name: string; expiry?: string }> {
  const obj = asObject(data)
  const candidates = ['names', 'domains', 'subnames', 'items']
  for (const key of candidates) {
    const list = asArray(obj[key])
    if (list.length === 0) continue
    return list
      .map((item) => {
        if (typeof item === 'string') {
          return { name: item }
        }
        const row = asObject(item)
        const name =
          asString(row.name) ??
          asString(row.domain) ??
          asString(row.labelName) ??
          asString(asObject(row.domain).name)
        const expiry =
          asString(row.expiryDate) ??
          asString(row.expiry) ??
          asString(asObject(row.registration).expiryDate)
        if (!name) return null
        return { name, expiry: expiry ?? undefined }
      })
      .filter((item): item is { name: string; expiry?: string } => Boolean(item))
  }
  return []
}

function countExpiringSoon(items: Array<{ expiry?: string }>, days: number): number {
  const now = Date.now()
  const cutoff = now + days * 24 * 60 * 60 * 1000
  let count = 0

  for (const item of items) {
    if (!item.expiry) continue
    const timestamp = Date.parse(item.expiry)
    if (!Number.isFinite(timestamp)) continue
    if (timestamp >= now && timestamp <= cutoff) {
      count += 1
    }
  }
  return count
}

function formatProfileDetails(data: unknown): string | null {
  const obj = asObject(data)
  const owner =
    asString(obj.owner) ??
    asString(asObject(obj.registrant).id) ??
    asString(asObject(asObject(obj.domain).owner).id)
  const resolver =
    asString(obj.resolver) ??
    asString(asObject(obj.resolver).address) ??
    asString(asObject(asObject(obj.domain).resolver).address)
  const expiry =
    asString(obj.expiryDate) ??
    asString(asObject(obj.registration).expiryDate) ??
    asString(asObject(asObject(obj.domain).registration).expiryDate)

  const twitter =
    asString(asObject(obj.textRecords).twitter) ??
    asString(asObject(obj.records).twitter)
  const ethAddress =
    asString(obj.address) ??
    asString(asObject(obj.addresses).ETH) ??
    asString(asObject(obj.coinRecords).ETH)

  const lines: string[] = ['Profile details:']
  if (owner) lines.push(`- Owner: ${owner}`)
  if (resolver) lines.push(`- Resolver: ${resolver}`)
  if (expiry) lines.push(`- Expiry: ${expiry}`)
  if (ethAddress) lines.push(`- ETH address: ${ethAddress}`)
  if (twitter) lines.push(`- Twitter: ${twitter}`)

  return lines.length > 1 ? lines.join('\n') : null
}

function formatAvailability(data: unknown): string | null {
  const obj = asObject(data)
  const availableRaw = obj.available ?? obj.isAvailable
  if (typeof availableRaw !== 'boolean') return null
  const label = availableRaw ? 'Available' : 'Not available'
  return `Availability: ${label}`
}

function formatNamePrice(data: unknown): string | null {
  const obj = asObject(data)
  const amount =
    asString(obj.price) ??
    asString(obj.registrationPrice) ??
    asString(asObject(obj.price).formatted)
  const currency =
    asString(obj.currency) ??
    asString(asObject(obj.price).currency) ??
    'ETH'
  if (!amount) return null
  return `Price: ${amount} ${currency}`.trim()
}

function formatNamesList(data: unknown, heading: string): string | null {
  const items = collectNameItems(data)
  if (items.length === 0) return null

  const first = items.slice(0, 20).map((item) => item.name)
  const expiringSoon = countExpiringSoon(items, 30)

  const lines = [
    `${heading}: ${items.length}`,
    `- ${first.join(', ')}`,
    `- Expiring in next 30 days: ${expiringSoon}`,
  ]
  if (items.length > first.length) {
    lines.push(`- Showing first ${first.length} names`)
  }
  return lines.join('\n')
}

function formatHistory(data: unknown): string | null {
  const obj = asObject(data)
  const events =
    asArray(obj.events).length > 0
      ? asArray(obj.events)
      : asArray(obj.history)
  if (events.length === 0) return null

  const latest = asObject(events[0])
  const type =
    asString(latest.event) ?? asString(latest.type) ?? 'unknown_event'
  const timestamp =
    asString(latest.timestamp) ??
    asString(latest.blockTimestamp) ??
    asString(latest.createdAt)
  return timestamp
    ? `Latest history event: ${type} at ${timestamp}`
    : `Latest history event: ${type}`
}

function formatSubgraphRecords(data: unknown): string | null {
  const obj = asObject(data)
  const records =
    asArray(obj.records).length > 0
      ? asArray(obj.records)
      : asArray(obj.keys)

  if (records.length === 0) return null

  const keys = records
    .map((record) => {
      if (typeof record === 'string') return record
      const row = asObject(record)
      return asString(row.key) ?? asString(row.name)
    })
    .filter((item): item is string => Boolean(item))

  if (keys.length === 0) return null
  return `Record keys (${keys.length}): ${keys.join(', ')}`
}

export function formatNamespaceLookupMessage(
  toolName: string,
  payload: unknown,
): string {
  const { data, source, rawText } = extractEnvelope(payload)
  const prefix = source ? `[source: ${source}] ` : ''

  let formatted: string | null = null
  if (toolName === 'ens_ns_get_profile_details') {
    formatted = formatProfileDetails(data)
  } else if (toolName === 'ens_ns_get_names_for_address') {
    formatted = formatNamesList(data, 'Owned names')
  } else if (toolName === 'ens_ns_get_subnames_for_name') {
    formatted = formatNamesList(data, 'Subnames')
  } else if (toolName === 'ens_ns_get_name_history') {
    formatted = formatHistory(data)
  } else if (toolName === 'ens_ns_get_subgraph_records') {
    formatted = formatSubgraphRecords(data)
  } else if (toolName === 'ens_ns_is_name_available') {
    formatted = formatAvailability(data)
  } else if (toolName === 'ens_ns_get_name_price') {
    formatted = formatNamePrice(data)
  }

  if (formatted) {
    return `${prefix}${formatted}`
  }

  if (rawText) {
    const formattedRaw = tryFormatJsonText(rawText) ?? rawText
    return prefix ? `${prefix}\n${formattedRaw}` : formattedRaw
  }

  const structured = formatStructuredData(data)
  return prefix ? `${prefix}\n${structured}` : structured
}
