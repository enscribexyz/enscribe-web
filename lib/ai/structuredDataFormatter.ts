const DEFAULT_MAX_LINES = 220
const INDENT = '  '

function formatScalar(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return value.toString()
  return String(value)
}

function pushLine(lines: string[], line: string, maxLines: number): boolean {
  if (lines.length >= maxLines) {
    return false
  }
  lines.push(line)
  return true
}

function appendStructuredLines(
  value: unknown,
  lines: string[],
  depth: number,
  key: string | null,
  maxLines: number,
) {
  const prefix = INDENT.repeat(depth)
  const hasKey = key !== null
  const objectPrefix = hasKey ? `${prefix}${key}:` : prefix

  if (
    value === null ||
    value === undefined ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    const scalarPrefix = hasKey ? `${prefix}${key}: ` : prefix
    pushLine(lines, `${scalarPrefix}${formatScalar(value)}`, maxLines)
    return
  }

  if (Array.isArray(value)) {
    if (hasKey && !pushLine(lines, objectPrefix, maxLines)) {
      return
    }
    const childDepth = hasKey ? depth + 1 : depth
    if (value.length === 0) {
      pushLine(lines, `${INDENT.repeat(childDepth)}(empty)`, maxLines)
      return
    }
    for (let i = 0; i < value.length; i += 1) {
      if (lines.length >= maxLines) {
        return
      }
      appendStructuredLines(value[i], lines, childDepth, String(i), maxLines)
    }
    return
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (hasKey && !pushLine(lines, objectPrefix, maxLines)) {
      return
    }
    const childDepth = hasKey ? depth + 1 : depth
    if (entries.length === 0) {
      pushLine(lines, `${INDENT.repeat(childDepth)}(empty)`, maxLines)
      return
    }
    for (const [childKey, childValue] of entries) {
      if (lines.length >= maxLines) {
        return
      }
      appendStructuredLines(childValue, lines, childDepth, childKey, maxLines)
    }
    return
  }

  const fallbackPrefix = hasKey ? `${prefix}${key}: ` : prefix
  pushLine(lines, `${fallbackPrefix}${formatScalar(value)}`, maxLines)
}

export function formatStructuredData(value: unknown, maxLines = DEFAULT_MAX_LINES): string {
  const lines: string[] = []
  appendStructuredLines(value, lines, 0, null, maxLines)
  if (lines.length >= maxLines) {
    lines.push('... (truncated)')
  }
  return lines.join('\n')
}

function parseJsonCandidate(value: string): unknown | null {
  const trimmed = value.trim()
  if (!trimmed || (!trimmed.startsWith('{') && !trimmed.startsWith('['))) {
    return null
  }
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

export function tryFormatJsonText(text: string): string | null {
  const trimmed = text.trim()
  if (!trimmed) {
    return null
  }

  const direct = parseJsonCandidate(trimmed)
  if (direct !== null) {
    return formatStructuredData(direct)
  }

  const codeBlockMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (codeBlockMatch) {
    const parsed = parseJsonCandidate(codeBlockMatch[1])
    if (parsed !== null) {
      return formatStructuredData(parsed)
    }
  }

  const lines = text.split('\n')
  for (let i = 1; i < lines.length; i += 1) {
    const prefix = lines.slice(0, i).join('\n').trimEnd()
    const candidate = lines.slice(i).join('\n').trim()
    const parsed = parseJsonCandidate(candidate)
    if (parsed !== null) {
      const structured = formatStructuredData(parsed)
      return prefix ? `${prefix}\n${structured}` : structured
    }
  }

  return null
}
