import type { BatchFormEntry } from '@/types'
import {
  isZeroAddressLike,
  normalizeEnsNameValue,
  validateBatchAddress,
  validateBatchLabel,
} from '@/lib/batchNaming/core'

export type BatchCsvRow = {
  rowNumber: number
  address: string
  name: string
}

export type BatchCsvIssue = {
  rowNumber: number
  field: 'row' | 'address' | 'name'
  message: string
}

export type BatchCsvParseResult = {
  rows: BatchCsvRow[]
  issues: BatchCsvIssue[]
  hasHeader: boolean
}

export type ParseAndValidateBatchCsvInput = {
  csvText: string
  parentName?: string
  idPrefix?: string
}

export type ParseAndValidateBatchCsvOutput = {
  entries: BatchFormEntry[]
  issues: BatchCsvIssue[]
  inferredParentName?: string
}

function unquoteValue(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 2) {
    return trimmed
  }
  if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) {
    return trimmed
  }
  return trimmed.slice(1, -1).replace(/""/g, '"')
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      const nextChar = line[i + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      cells.push(unquoteValue(current))
      current = ''
      continue
    }

    current += char
  }

  cells.push(unquoteValue(current))
  return cells
}

function isHeaderRow(cells: string[]): boolean {
  if (cells.length < 2) {
    return false
  }

  const first = cells[0].trim().toLowerCase()
  const second = cells[1].trim().toLowerCase()

  return first.includes('address') && (second.includes('name') || second.includes('label'))
}

export function parseBatchCsvText(csvText: string): BatchCsvParseResult {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const rows: BatchCsvRow[] = []
  const issues: BatchCsvIssue[] = []

  let hasHeader = false
  let firstDataLineSeen = false

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const rowNumber = index + 1

    if (!line.trim()) {
      continue
    }

    const cells = splitCsvLine(line)

    if (!firstDataLineSeen) {
      firstDataLineSeen = true
      if (isHeaderRow(cells)) {
        hasHeader = true
        continue
      }
    }

    if (cells.length < 2) {
      issues.push({
        rowNumber,
        field: 'row',
        message: 'Each row must include address and name columns',
      })
      continue
    }

    const address = (cells[0] ?? '').trim()
    const name = (cells[1] ?? '').trim()

    if (!address && !name) {
      continue
    }

    rows.push({
      rowNumber,
      address,
      name,
    })
  }

  if (rows.length === 0) {
    issues.push({
      rowNumber: 0,
      field: 'row',
      message: 'CSV did not contain any address/name rows',
    })
  }

  return {
    rows,
    issues,
    hasHeader,
  }
}

export function inferRootParentFromNames(names: string[]): string | null {
  const normalizedParts = names
    .map((name) => normalizeEnsNameValue(name))
    .filter((name): name is string => Boolean(name))
    .map((name) => name.split('.'))

  if (normalizedParts.length === 0) {
    return null
  }

  let commonSuffix = [...normalizedParts[0]]

  for (let i = 1; i < normalizedParts.length; i++) {
    const candidate = normalizedParts[i]
    let suffixLength = 0

    while (
      suffixLength < commonSuffix.length &&
      suffixLength < candidate.length &&
      commonSuffix[commonSuffix.length - 1 - suffixLength] ===
        candidate[candidate.length - 1 - suffixLength]
    ) {
      suffixLength += 1
    }

    if (suffixLength === 0) {
      return null
    }

    commonSuffix = commonSuffix.slice(commonSuffix.length - suffixLength)
  }

  if (commonSuffix.length < 2) {
    return null
  }

  return commonSuffix.join('.')
}

export function parseAndValidateBatchCsv(
  input: ParseAndValidateBatchCsvInput,
): ParseAndValidateBatchCsvOutput {
  const parsed = parseBatchCsvText(input.csvText)
  const issues: BatchCsvIssue[] = [...parsed.issues]
  const idPrefix = input.idPrefix ?? 'csv'

  const normalizedProvidedParent = input.parentName
    ? normalizeEnsNameValue(input.parentName)
    : null

  const inferredParentName =
    normalizedProvidedParent ?? inferRootParentFromNames(parsed.rows.map((row) => row.name))

  if (!inferredParentName) {
    issues.push({
      rowNumber: 0,
      field: 'row',
      message:
        'Could not infer a common parent domain from the CSV names. Use full ENS names under one parent domain.',
    })
  }

  const entries = parsed.rows.map((row) => {
    const addressError = validateBatchAddress(row.address, { allowEmpty: false })
    let labelError: string | undefined

    if (inferredParentName) {
      labelError = validateBatchLabel(row.name, inferredParentName, {
        allowEmpty: false,
      })
    } else {
      const normalizedName = normalizeEnsNameValue(row.name)
      if (!row.name.trim()) {
        labelError = 'Name is required'
      } else if (!normalizedName || !normalizedName.includes('.')) {
        labelError = 'Name must be a valid ENS name'
      }
    }

    return {
      id: `${idPrefix}-${row.rowNumber}`,
      address: row.address,
      label: row.name,
      addressError,
      labelError,
      _rowNumber: row.rowNumber,
    }
  })

  const addressIndexByValue = new Map<string, number>()
  entries.forEach((entry, index) => {
    if (entry.addressError || isZeroAddressLike(entry.address)) {
      return
    }

    const key = entry.address.trim().toLowerCase()
    const firstIndex = addressIndexByValue.get(key)
    if (firstIndex === undefined) {
      addressIndexByValue.set(key, index)
      return
    }

    if (!entries[firstIndex].addressError) {
      entries[firstIndex].addressError = 'Duplicate address'
    }
    entry.addressError = 'Duplicate address'
  })

  const nameIndexByValue = new Map<string, number>()
  entries.forEach((entry, index) => {
    if (entry.labelError) {
      return
    }

    const key = entry.label.trim().toLowerCase()
    if (!key) {
      return
    }

    const firstIndex = nameIndexByValue.get(key)
    if (firstIndex === undefined) {
      nameIndexByValue.set(key, index)
      return
    }

    if (!entries[firstIndex].labelError) {
      entries[firstIndex].labelError = 'Duplicate name'
    }
    entry.labelError = 'Duplicate name'
  })

  entries.forEach((entry) => {
    if (entry.addressError) {
      issues.push({
        rowNumber: entry._rowNumber,
        field: 'address',
        message: entry.addressError,
      })
    }
    if (entry.labelError) {
      issues.push({
        rowNumber: entry._rowNumber,
        field: 'name',
        message: entry.labelError,
      })
    }
  })

  return {
    entries: entries.map(({ _rowNumber, ...entry }) => entry),
    issues,
    inferredParentName: inferredParentName ?? undefined,
  }
}
