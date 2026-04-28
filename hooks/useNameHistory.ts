import { useCallback, useEffect, useState } from 'react'
import { namehash } from 'viem/ens'
import { CONTRACTS } from '@/utils/constants'
import { getPublicClient } from '@/lib/viemClient'
import { healENSName } from '@/utils/labelhashMapping'
import {
  COIN_TYPE_MAPPING,
  getMetadataHistoryLimit,
  normalizeHistoryBlockNumber,
  normalizeHistoryTimestamp,
  ZERO_ADDRESS,
  type MetadataHistoryEvent,
  type MetadataHistoryEventType,
} from '@/lib/nameHistory'

type RawMetadataHistoryEventType =
  | 'TextChanged'
  | 'MulticoinAddrChanged'
  | 'InterfaceChanged'
  | 'AddrChanged'
  | 'ContenthashChanged'
  | 'NewResolver'

type RawMetadataHistoryEvent = {
  id: string
  __typename: RawMetadataHistoryEventType
  blockNumber: number
  key?: string | null
  value?: string | null
  coinType?: string | number | null
  addr?: string | { id?: string | null } | null
  interfaceID?: string | null
  implementer?: string | null
  hash?: string | null
  resolver?: string | { id?: string | null; address?: string | null } | null
  resolverAddress?: string | null
}

type MetadataHistoryIdentity = {
  field: string
  type: MetadataHistoryEventType
}

type RawSubnameCreationEvent = {
  id: string
  name: string
  createdAt?: string | null
  owner?: {
    id?: string | null
  } | null
}

interface UseNameHistoryProps {
  chainId: number
  name?: string | null
  enabled?: boolean
}

function isUnsetHistoryValue(value: string | null | undefined) {
  if (!value) return true

  const normalizedValue = value.trim().toLowerCase()

  return (
    normalizedValue === '' ||
    normalizedValue === '0x' ||
    normalizedValue === '0x0' ||
    normalizedValue === ZERO_ADDRESS
  )
}

function getRawHistoryValue(event: RawMetadataHistoryEvent): string | null {
  switch (event.__typename) {
    case 'TextChanged':
      return isUnsetHistoryValue(event.value) ? null : event.value || null
    case 'MulticoinAddrChanged': {
      const addrValue =
        typeof event.addr === 'string' ? event.addr : event.addr?.id || null
      return isUnsetHistoryValue(addrValue) ? null : addrValue
    }
    case 'InterfaceChanged':
      return isUnsetHistoryValue(event.implementer)
        ? null
        : event.implementer || null
    case 'AddrChanged': {
      const addrValue =
        typeof event.addr === 'string' ? event.addr : event.addr?.id || null
      return isUnsetHistoryValue(addrValue) ? null : addrValue
    }
    case 'ContenthashChanged':
      return isUnsetHistoryValue(event.hash) ? null : event.hash || null
    case 'NewResolver': {
      const resolverValue =
        typeof event.resolver === 'string'
          ? event.resolver
          : event.resolver?.address || event.resolver?.id || null
      return isUnsetHistoryValue(resolverValue) ? null : resolverValue
    }
    default:
      return null
  }
}

function getHistoryIdentity(
  event: RawMetadataHistoryEvent,
): MetadataHistoryIdentity {
  switch (event.__typename) {
    case 'TextChanged':
      return {
        type: 'text',
        field: event.key || 'text',
      }
    case 'MulticoinAddrChanged':
      return {
        type: 'coinAddress',
        field: String(event.coinType || 'unknown'),
      }
    case 'InterfaceChanged':
      return {
        type: 'interface',
        field: event.interfaceID || 'interface',
      }
    case 'AddrChanged':
      return {
        type: 'ethAddress',
        field: 'eth',
      }
    case 'ContenthashChanged':
      return {
        type: 'contentHash',
        field: 'contentHash',
      }
    case 'NewResolver':
      return {
        type: 'resolverChanged',
        field: 'resolver',
      }
    default:
      return {
        type: 'text',
        field: 'text',
      }
  }
}

function getHistoryLabel(
  identity: MetadataHistoryIdentity,
  nextValue: string | null,
) {
  const action = nextValue ? 'updated' : 'cleared'

  switch (identity.type) {
    case 'text':
      return `Text record ${identity.field} ${action}`
    case 'coinAddress': {
      const coinInfo = COIN_TYPE_MAPPING[identity.field]
      const coinLabel = coinInfo?.name || `Coin Type ${identity.field}`
      return `${coinLabel} address ${action}`
    }
    case 'interface':
      return `Interface ${identity.field} ${action}`
    case 'ethAddress':
      return `ETH address ${action}`
    case 'contentHash':
      return `Content hash ${action}`
    case 'resolverChanged':
      return `Resolver ${action}`
    case 'subnameCreated':
      return 'Subname created'
    case 'subnameDeleted':
      return 'Subname deleted'
    default:
      return `Metadata ${action}`
  }
}

function normalizeMetadataHistory(
  rawEvents: RawMetadataHistoryEvent[],
): MetadataHistoryEvent[] {
  const sortedEvents = [...rawEvents].sort(
    (a, b) =>
      (normalizeHistoryBlockNumber(b.blockNumber) || 0) -
      (normalizeHistoryBlockNumber(a.blockNumber) || 0),
  )

  return sortedEvents.map((event, index) => {
    const identity = getHistoryIdentity(event)
    const newValue = getRawHistoryValue(event)
    const previousEvent = sortedEvents.slice(index + 1).find((candidate) => {
      const candidateIdentity = getHistoryIdentity(candidate)
      return (
        candidateIdentity.type === identity.type &&
        candidateIdentity.field === identity.field
      )
    })

    const previousValue = previousEvent
      ? getRawHistoryValue(previousEvent)
      : null

    return {
      id: event.id,
      type: identity.type,
      field: identity.field,
      label: getHistoryLabel(identity, newValue),
      newValue,
      previousValue,
      blockNumber: normalizeHistoryBlockNumber(event.blockNumber),
      resolverAddress: event.resolverAddress || null,
    }
  })
}

function sortHistoryEventsDescending(historyEvents: MetadataHistoryEvent[]) {
  return [...historyEvents].sort((a, b) => {
    const aTimestamp = a.timestamp ? Date.parse(a.timestamp) : Number.NaN
    const bTimestamp = b.timestamp ? Date.parse(b.timestamp) : Number.NaN

    if (Number.isFinite(aTimestamp) && Number.isFinite(bTimestamp)) {
      return bTimestamp - aTimestamp
    }

    if (Number.isFinite(aTimestamp)) return -1
    if (Number.isFinite(bTimestamp)) return 1

    return (b.blockNumber || 0) - (a.blockNumber || 0)
  })
}

export function useNameHistory({
  chainId,
  name,
  enabled = true,
}: UseNameHistoryProps) {
  const config = CONTRACTS[chainId]
  const historyLimit = getMetadataHistoryLimit()
  const [rawMetadataHistory, setRawMetadataHistory] = useState<
    RawMetadataHistoryEvent[]
  >([])
  const [metadataHistory, setMetadataHistory] = useState<MetadataHistoryEvent[]>(
    [],
  )
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const resetHistory = useCallback(() => {
    setRawMetadataHistory([])
    setMetadataHistory([])
    setHistoryLoading(false)
    setHistoryError('')
  }, [])

  const fetchMetadataHistoryFromSubgraph = useCallback(
    async (targetName: string): Promise<RawMetadataHistoryEvent[]> => {
      if (!config?.SUBGRAPH_API) {
        return []
      }

      const response = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
        },
        body: JSON.stringify({
          query: `
            query getDomainMetadataHistory($id: ID!, $limit: Int!) {
              domain(id: $id) {
                events(first: $limit, orderBy: blockNumber, orderDirection: desc) {
                  __typename
                  ... on NewResolver {
                    id
                    blockNumber
                    resolver {
                      id
                      address
                    }
                  }
                }
              }

              resolvers(where: { domain: $id }) {
                id
                address
                events(first: $limit, orderBy: blockNumber, orderDirection: desc) {
                  __typename
                  ... on TextChanged {
                    id
                    key
                    value
                    blockNumber
                  }
                  ... on MulticoinAddrChanged {
                    id
                    coinType
                    addr
                    blockNumber
                  }
                  ... on InterfaceChanged {
                    id
                    interfaceID
                    implementer
                    blockNumber
                  }
                  ... on AddrChanged {
                    id
                    addr {
                      id
                    }
                    blockNumber
                  }
                  ... on ContenthashChanged {
                    id
                    hash
                    blockNumber
                  }
                }
              }
            }
          `,
          variables: {
            id: namehash(targetName),
            limit: historyLimit,
          },
        }),
      })

      const data = await response.json()

      if (data.errors) {
        throw new Error(
          data.errors[0]?.message || 'Failed to fetch metadata history',
        )
      }

      const domainEvents = (data.data?.domain?.events || []).map(
        (event: RawMetadataHistoryEvent) => ({
          ...event,
          resolverAddress:
            typeof event.resolver === 'string'
              ? event.resolver
              : event.resolver?.address || event.resolver?.id || null,
        }),
      )
      const resolvers = data.data?.resolvers || []

      return [
        ...domainEvents,
        ...resolvers.flatMap(
          (resolver: {
            address?: string
            events?: RawMetadataHistoryEvent[]
          }) =>
            (resolver.events || []).map((event) => ({
              ...event,
              resolverAddress: resolver.address || null,
            })),
        ),
      ]
        .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
        .slice(0, historyLimit)
    },
    [config?.SUBGRAPH_API, historyLimit],
  )

  const fetchSubnameHistoryFromSubgraph = useCallback(
    async (targetName: string): Promise<MetadataHistoryEvent[]> => {
      if (!config?.SUBGRAPH_API) {
        return []
      }

      const response = await fetch(config.SUBGRAPH_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_GRAPH_API_KEY || ''}`,
        },
        body: JSON.stringify({
          query: `
            query getRecentSubnameCreations($parentId: ID!, $limit: Int!) {
              domains(
                where: { parent: $parentId }
                first: $limit
                orderBy: createdAt
                orderDirection: desc
              ) {
                id
                name
                createdAt
                owner {
                  id
                }
              }
            }
          `,
          variables: {
            parentId: namehash(targetName),
            limit: historyLimit,
          },
        }),
      })

      const data = await response.json()

      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Failed to fetch subname history')
      }

      const domains = (data.data?.domains || []) as RawSubnameCreationEvent[]

      return domains.map((domain) => {
        const ownerId = domain.owner?.id || null
        const isDeleted = ownerId?.toLowerCase() === ZERO_ADDRESS

        return {
          id: `subname-history-${domain.id}`,
          type: isDeleted ? 'subnameDeleted' : 'subnameCreated',
          field: healENSName(domain.name || 'Unknown'),
          label: isDeleted ? 'Subname deleted' : 'Subname created',
          newValue: ownerId,
          previousValue: null,
          blockNumber: null,
          timestamp: normalizeHistoryTimestamp(domain.createdAt),
          resolverAddress: null,
        }
      })
    },
    [config?.SUBGRAPH_API, historyLimit],
  )

  const enrichMetadataHistoryWithTimestamps = useCallback(
    async (
      historyEvents: MetadataHistoryEvent[],
    ): Promise<MetadataHistoryEvent[]> => {
      const publicClient = getPublicClient(chainId)

      if (!publicClient) {
        return historyEvents
      }

      const uniqueBlockNumbers = Array.from(
        new Set(
          historyEvents
            .map((event) => event.blockNumber)
            .filter(
              (blockNumber): blockNumber is number =>
                blockNumber !== null &&
                Number.isFinite(blockNumber) &&
                Number.isInteger(blockNumber),
            ),
        ),
      )

      if (uniqueBlockNumbers.length === 0) {
        return historyEvents
      }

      try {
        const timestampEntries = await Promise.all(
          uniqueBlockNumbers.map(async (blockNumber) => {
            const block = await publicClient.getBlock({
              blockNumber: BigInt(blockNumber),
            })

            return [
              blockNumber,
              new Date(Number(block.timestamp) * 1000).toISOString(),
            ] as const
          }),
        )

        const timestampByBlock = new Map<number, string>(timestampEntries)

        return historyEvents.map((event) => ({
          ...event,
          timestamp:
            event.blockNumber !== null
              ? timestampByBlock.get(event.blockNumber)
              : undefined,
        }))
      } catch (err) {
        console.error('Error enriching metadata history timestamps:', err)
        return historyEvents
      }
    },
    [chainId],
  )

  const loadHistory = useCallback(
    async (targetName: string): Promise<RawMetadataHistoryEvent[]> => {
      setHistoryLoading(true)
      setHistoryError('')

      try {
        const [fetchedHistory, subnameHistory] = await Promise.all([
          fetchMetadataHistoryFromSubgraph(targetName),
          fetchSubnameHistoryFromSubgraph(targetName),
        ])
        const normalizedHistory = normalizeMetadataHistory(fetchedHistory)
        const enrichedHistory =
          await enrichMetadataHistoryWithTimestamps(normalizedHistory)
        const mergedHistory = sortHistoryEventsDescending([
          ...enrichedHistory,
          ...subnameHistory,
        ]).slice(0, historyLimit)

        setRawMetadataHistory(fetchedHistory)
        setMetadataHistory(mergedHistory)

        return fetchedHistory
      } catch (err: any) {
        setHistoryError(err.message || 'Failed to fetch metadata history')
        setRawMetadataHistory([])
        setMetadataHistory([])
        return []
      } finally {
        setHistoryLoading(false)
      }
    },
    [
      enrichMetadataHistoryWithTimestamps,
      fetchMetadataHistoryFromSubgraph,
      fetchSubnameHistoryFromSubgraph,
      historyLimit,
    ],
  )

  const refreshHistory = useCallback(async () => {
    if (!name || !enabled || !config?.SUBGRAPH_API) {
      resetHistory()
      return []
    }

    return loadHistory(name)
  }, [config?.SUBGRAPH_API, enabled, loadHistory, name, resetHistory])

  useEffect(() => {
    if (!name || !enabled || !config?.SUBGRAPH_API) {
      resetHistory()
      return
    }

    void loadHistory(name)
  }, [config?.SUBGRAPH_API, enabled, loadHistory, name, resetHistory])

  return {
    metadataHistory,
    historyLoading,
    historyError,
    historyLimit,
    latestRawMetadataHistoryId: rawMetadataHistory[0]?.id || null,
    refreshHistory,
    resetHistory,
  }
}
