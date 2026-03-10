import { isAddress } from 'viem'
import { normalize as normalizeEns } from 'viem/ens'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export type BatchEntryLike = {
  id: string
  address: string
  label: string
  addressError?: string
  labelError?: string
}

export type BatchGroup<T extends BatchEntryLike> = {
  parentName: string
  entries: T[]
  level: number
}

export function isZeroAddressLike(address: string): boolean {
  const normalized = address.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  if (normalized === '0x0') {
    return true
  }

  if (!normalized.startsWith('0x')) {
    return false
  }

  return normalized.padEnd(42, '0') === ZERO_ADDRESS
}

export function normalizeEnsNameValue(value: string): string | null {
  const trimmed = value.trim().replace(/\.$/, '')
  if (!trimmed) {
    return null
  }

  try {
    return normalizeEns(trimmed)
  } catch {
    if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(trimmed)) {
      return trimmed.toLowerCase()
    }
    return null
  }
}

export function toFullNameForParent(label: string, parent: string): string {
  const trimmedLabel = label.trim()
  const trimmedParent = parent.trim()

  if (!trimmedLabel || !trimmedParent) {
    return trimmedLabel
  }

  if (trimmedLabel.toLowerCase().endsWith(`.${trimmedParent.toLowerCase()}`)) {
    return trimmedLabel
  }

  return `${trimmedLabel}.${trimmedParent}`
}

export function stripParentSuffix(fullName: string, parent: string): string {
  const trimmedFullName = fullName.trim()
  const trimmedParent = parent.trim()

  if (!trimmedFullName || !trimmedParent) {
    return trimmedFullName
  }

  const parentSuffix = `.${trimmedParent}`
  if (trimmedFullName.toLowerCase().endsWith(parentSuffix.toLowerCase())) {
    return trimmedFullName.slice(0, -parentSuffix.length)
  }

  return trimmedFullName
}

export function validateBatchAddress(
  address: string,
  options?: { allowEmpty?: boolean },
): string | undefined {
  const allowEmpty = options?.allowEmpty ?? true
  const trimmed = address.trim()

  if (!trimmed) {
    return allowEmpty ? undefined : 'Contract address is required'
  }

  if (!isAddress(trimmed)) {
    return 'Invalid contract address'
  }

  return undefined
}

export function validateBatchLabel(
  label: string,
  parentDomain: string,
  options?: { allowEmpty?: boolean },
): string | undefined {
  const allowEmpty = options?.allowEmpty ?? true
  const trimmedLabel = label.trim()
  const trimmedParent = parentDomain.trim()

  if (!trimmedLabel) {
    return allowEmpty ? undefined : 'Name is required'
  }

  if (!trimmedParent) {
    return 'Please enter parent domain first'
  }

  if (trimmedLabel.includes('.')) {
    const normalizedLabel = normalizeEnsNameValue(trimmedLabel)
    if (!normalizedLabel) {
      return 'Invalid ENS name format'
    }

    const normalizedParent = normalizeEnsNameValue(trimmedParent)
    if (!normalizedParent) {
      return 'Invalid parent domain format'
    }

    if (!normalizedLabel.endsWith(`.${normalizedParent}`)) {
      return `Parent name doesn't match. Expected: ${trimmedParent}`
    }

    const withoutParent = normalizedLabel.slice(0, -(normalizedParent.length + 1))
    if (!withoutParent.trim()) {
      return 'Invalid ENS name format'
    }

    return undefined
  }

  return undefined
}

export function sortEntriesByBatchLogic<T extends BatchEntryLike>(
  entries: T[],
  parent: string,
): T[] {
  if (!parent || entries.length === 0) {
    return entries
  }

  const entriesWithMetadata = entries.map((entry) => {
    const fullName = toFullNameForParent(entry.label, parent)
    const parts = fullName.split('.')
    const parentParts = parent.split('.')
    const level = parts.length - parentParts.length

    const immediateParent =
      level === 1 ? parent : parts.slice(1).join('.')

    return {
      entry,
      fullName,
      level,
      immediateParent,
    }
  })

  entriesWithMetadata.sort((a, b) => {
    if (a.level !== b.level) {
      return a.level - b.level
    }
    if (a.immediateParent !== b.immediateParent) {
      return a.immediateParent.localeCompare(b.immediateParent)
    }
    return a.fullName.localeCompare(b.fullName)
  })

  return entriesWithMetadata.map((item) => item.entry)
}

export function buildDisplayEntriesWithAutoParents<T extends BatchEntryLike>(
  entries: T[],
  parentName: string,
  createZeroEntry: (name: string) => T,
): T[] {
  if (!parentName) {
    return entries
  }

  const userEntries = entries.filter(
    (entry) => (entry.address || entry.label) && !entry.id.startsWith('zero-'),
  )

  if (userEntries.length === 0) {
    return entries
  }

  const allNames = new Map<string, T>()
  const validEntriesForParents = userEntries.filter(
    (entry) => entry.address && entry.label && !entry.addressError && !entry.labelError,
  )

  validEntriesForParents.forEach((entry) => {
    const fullName = toFullNameForParent(entry.label, parentName)
    allNames.set(fullName, entry)
  })

  const requiredParents = new Set<string>()
  allNames.forEach((_entry, name) => {
    const parts = name.split('.')
    const parentParts = parentName.split('.')

    for (let i = 1; i < parts.length - parentParts.length; i++) {
      const parentSubdomain = parts.slice(i).join('.')
      if (parentSubdomain !== parentName && !allNames.has(parentSubdomain)) {
        requiredParents.add(parentSubdomain)
      }
    }
  })

  const zeroEntries = Array.from(requiredParents).map((parentSubdomain) =>
    createZeroEntry(parentSubdomain),
  )

  const emptyEntries = entries.filter((entry) => !entry.address && !entry.label)
  const allEntries = [...userEntries, ...zeroEntries, ...emptyEntries]
  return sortEntriesByBatchLogic(allEntries, parentName)
}

export function groupEntriesForBatching<T extends BatchEntryLike>(
  entries: T[],
  rootParent: string,
  createZeroEntry: (fullName: string) => T,
): BatchGroup<T>[] {
  const allNames = new Map<string, T>()

  entries.forEach((entry) => {
    if (!entry.address || !entry.label) {
      return
    }

    const fullName = toFullNameForParent(entry.label, rootParent)
    allNames.set(fullName, { ...entry, label: fullName })
  })

  const requiredParents = new Set<string>()
  allNames.forEach((_entry, name) => {
    const parts = name.split('.')
    for (let i = 1; i < parts.length - rootParent.split('.').length; i++) {
      const parentSubdomain = parts.slice(i).join('.')
      if (parentSubdomain !== rootParent && !allNames.has(parentSubdomain)) {
        requiredParents.add(parentSubdomain)
      }
    }
  })

  requiredParents.forEach((parentSubdomain) => {
    allNames.set(parentSubdomain, createZeroEntry(parentSubdomain))
  })

  const batches = new Map<string, Map<number, T[]>>()

  allNames.forEach((entry, fullName) => {
    const parts = fullName.split('.')
    const rootParentParts = rootParent.split('.')
    const level = parts.length - rootParentParts.length

    const immediateParent =
      level === 1 ? rootParent : parts.slice(1).join('.')

    if (!batches.has(immediateParent)) {
      batches.set(immediateParent, new Map())
    }

    const levelMap = batches.get(immediateParent)!
    if (!levelMap.has(level)) {
      levelMap.set(level, [])
    }

    levelMap.get(level)!.push(entry)
  })

  const allLevels = new Set<number>()
  batches.forEach((levelMap) => {
    levelMap.forEach((_entriesAtLevel, level) => {
      allLevels.add(level)
    })
  })

  const sortedLevels = Array.from(allLevels).sort((a, b) => a - b)
  const result: BatchGroup<T>[] = []

  sortedLevels.forEach((level) => {
    const levelBatches: BatchGroup<T>[] = []

    batches.forEach((levelMap, parentName) => {
      const entriesAtLevel = levelMap.get(level)
      if (!entriesAtLevel) {
        return
      }

      const sortedEntries = [...entriesAtLevel].sort((a, b) =>
        a.label.localeCompare(b.label),
      )

      levelBatches.push({
        parentName,
        entries: sortedEntries,
        level,
      })
    })

    levelBatches.sort((a, b) => a.parentName.localeCompare(b.parentName))
    result.push(...levelBatches)
  })

  return result
}
