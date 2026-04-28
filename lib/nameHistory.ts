export type MetadataHistoryEventType =
  | 'text'
  | 'coinAddress'
  | 'interface'
  | 'ethAddress'
  | 'contentHash'
  | 'resolverChanged'
  | 'subnameCreated'
  | 'subnameDeleted'

export interface MetadataHistoryEvent {
  id: string
  type: MetadataHistoryEventType
  field: string
  label: string
  newValue: string | null
  previousValue: string | null
  blockNumber: number | null
  timestamp?: string
  txHash?: string
  resolverAddress?: string | null
}

export const COIN_TYPE_MAPPING: Record<string, { name: string; logo: string }> =
  {
    '60': { name: 'Ethereum', logo: '/images/ethereum.svg' },
    '2147492101': { name: 'Base', logo: '/images/base.svg' },
    '2147568180': { name: 'Base Sepolia', logo: '/images/base.svg' },
    '2147483658': { name: 'Optimism', logo: '/images/optimism.svg' },
    '2158639068': { name: 'Optimism Sepolia', logo: '/images/optimism.svg' },
    '2147525809': { name: 'Arbitrum', logo: '/images/arbitrum.svg' },
    '2147905262': { name: 'Arbitrum Sepolia', logo: '/images/arbitrum.svg' },
    '2147542792': { name: 'Linea', logo: '/images/linea.svg' },
    '2147542789': { name: 'Linea Sepolia', logo: '/images/linea.svg' },
    '2148018000': { name: 'Scroll', logo: '/images/scroll.svg' },
    '2148017999': { name: 'Scroll Sepolia', logo: '/images/scroll.svg' },
  }

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export function getMetadataHistoryLimit(): number {
  const rawValue = process.env.NEXT_PUBLIC_NAME_METADATA_HISTORY_LIMIT
  const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : 10

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return 10
  }

  return Math.min(parsedValue, 10)
}

export function normalizeHistoryTimestamp(
  timestamp?: string | null,
): string | undefined {
  if (!timestamp) return undefined

  const numericTimestamp = Number(timestamp)
  if (Number.isFinite(numericTimestamp) && numericTimestamp > 0) {
    return new Date(numericTimestamp * 1000).toISOString()
  }

  const parsedDate = new Date(timestamp)
  if (Number.isNaN(parsedDate.getTime())) {
    return undefined
  }

  return parsedDate.toISOString()
}

export function normalizeHistoryBlockNumber(
  blockNumber: number | string | null | undefined,
): number | null {
  if (blockNumber === null || blockNumber === undefined) {
    return null
  }

  const normalizedBlockNumber =
    typeof blockNumber === 'number' ? blockNumber : Number(blockNumber)

  if (
    !Number.isFinite(normalizedBlockNumber) ||
    !Number.isInteger(normalizedBlockNumber) ||
    normalizedBlockNumber < 0
  ) {
    return null
  }

  return normalizedBlockNumber
}

export function formatHistoryTypeLabel(type: MetadataHistoryEvent['type']) {
  switch (type) {
    case 'coinAddress':
      return 'Address'
    case 'ethAddress':
      return 'ETH Address'
    case 'contentHash':
      return 'Content Hash'
    case 'resolverChanged':
      return 'Resolver'
    case 'subnameCreated':
    case 'subnameDeleted':
      return 'Subname'
    default:
      return type.charAt(0).toUpperCase() + type.slice(1)
  }
}

export function formatHistoryFieldLabel(event: MetadataHistoryEvent) {
  switch (event.type) {
    case 'coinAddress': {
      const chainInfo = COIN_TYPE_MAPPING[event.field]
      return chainInfo?.name || `Coin Type ${event.field}`
    }
    case 'ethAddress':
      return 'ETH Address'
    case 'contentHash':
      return 'Content Hash'
    case 'resolverChanged':
      return 'Resolver'
    case 'subnameCreated':
    case 'subnameDeleted':
      return event.field
    default:
      return event.field
  }
}

export function formatHistoryTimestamp(timestamp?: string) {
  if (!timestamp) return 'Timestamp unavailable'

  const parsedDate = new Date(timestamp)

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Timestamp unavailable'
  }

  return parsedDate.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function isDeletionHistoryEvent(event: MetadataHistoryEvent) {
  const normalizedLabel = event.label.toLowerCase()
  return (
    event.type === 'subnameDeleted' ||
    normalizedLabel.includes('deleted') ||
    normalizedLabel.includes('cleared')
  )
}

export function formatHistoryCountLabel(
  count: number,
  singular: string,
  plural: string,
) {
  return `${count} ${count === 1 ? singular : plural}`
}
