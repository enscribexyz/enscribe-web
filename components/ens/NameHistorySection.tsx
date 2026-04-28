import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import {
  formatHistoryCountLabel,
  formatHistoryFieldLabel,
  formatHistoryTimestamp,
  formatHistoryTypeLabel,
  isDeletionHistoryEvent,
  type MetadataHistoryEvent,
} from '@/lib/nameHistory'

interface NameHistorySectionProps {
  currentName: string
  history: MetadataHistoryEvent[]
  historyLoading: boolean
  historyError: string
  historyLimit: number
  className?: string
  variant?: 'default' | 'card'
}

function formatHistoryValue(
  value: string | null,
  fallback: string,
): { value: string; mono: boolean } {
  if (!value) {
    return { value: fallback, mono: false }
  }

  return { value, mono: true }
}

function getHistoryEventToneClasses(event: MetadataHistoryEvent) {
  if (isDeletionHistoryEvent(event)) {
    return {
      badge:
        'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    }
  }

  return {
    badge:
      'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  }
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}:
      </span>
      <span
        className={`text-xs text-gray-900 dark:text-white break-all ${
          mono ? 'font-mono' : ''
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function NameHistoryItem({ event }: { event: MetadataHistoryEvent }) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const tone = getHistoryEventToneClasses(event)
  const newValue = formatHistoryValue(
    event.newValue,
    event.type === 'subnameCreated'
      ? 'Owner unavailable'
      : event.type === 'subnameDeleted'
        ? '0x0000000000000000000000000000000000000000'
        : 'Cleared',
  )
  const previousValue = formatHistoryValue(
    event.previousValue,
    'No earlier value in recent history',
  )
  const fieldLabel =
    event.type === 'subnameCreated' || event.type === 'subnameDeleted'
      ? 'Subname'
      : 'Field'
  const newValueLabel =
    event.type === 'subnameCreated' || event.type === 'subnameDeleted'
      ? 'Owner'
      : 'New Value'
  const showPreviousValue =
    event.type !== 'subnameCreated' && event.type !== 'subnameDeleted'

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span
              className={`inline-flex w-fit px-2.5 py-1 rounded-full text-xs font-medium border ${tone.badge} flex-shrink-0`}
            >
              {event.label}
            </span>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {formatHistoryTimestamp(event.timestamp)}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-200 dark:border-gray-800">
          <div className="pt-3">
            <InfoRow
              label={fieldLabel}
              value={formatHistoryFieldLabel(event)}
              mono={event.type === 'interface' || event.type === 'text'}
            />
            <InfoRow
              label={newValueLabel}
              value={newValue.value}
              mono={newValue.mono}
            />
            {showPreviousValue && (
              <InfoRow
                label="Previous Value"
                value={previousValue.value}
                mono={previousValue.mono}
              />
            )}
            <InfoRow
              label="Event Type"
              value={formatHistoryTypeLabel(event.type)}
            />
            <InfoRow
              label="Block"
              value={String(event.blockNumber ?? 'Unknown')}
              mono={event.blockNumber !== null}
            />
            {event.resolverAddress && (
              <InfoRow label="Resolver" value={event.resolverAddress} mono />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function NameHistorySection({
  currentName,
  history,
  historyLoading,
  historyError,
  historyLimit,
  className,
  variant = 'default',
}: NameHistorySectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const showInitialLoading = historyLoading && history.length === 0
  const showRefreshing = historyLoading && history.length > 0
  const deletionCount = history.filter((event) =>
    isDeletionHistoryEvent(event),
  ).length
  const positiveCount = history.length - deletionCount
  const isCardVariant = variant === 'card'

  return (
    <div className={className || ''}>
      <div
        className={
          isCardVariant
            ? 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'
            : 'space-y-3'
        }
      >
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={
            isCardVariant
              ? 'w-full flex items-start justify-between gap-3 text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-t-lg'
              : 'w-full flex items-start justify-between gap-3 text-left'
          }
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Name History
              </h3>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
                <span className="text-green-600 dark:text-green-400">
                  +
                  {formatHistoryCountLabel(positiveCount, 'change', 'changes')}
                </span>
                <span className="text-red-600 dark:text-red-400">
                  -
                  {formatHistoryCountLabel(
                    deletionCount,
                    'deletion',
                    'deletions',
                  )}
                </span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Click to see the most recent {historyLimit} name changes for{' '}
              {currentName}.
            </p>
            {showRefreshing && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Refreshing recent changes...
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isCardVariant && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isExpanded ? 'Click to collapse' : 'Click to expand'}
              </span>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            )}
          </div>
        </button>

        <div className={isCardVariant ? 'p-4 pt-0 space-y-3' : 'space-y-3'}>
          {isExpanded && showInitialLoading && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {isExpanded && !historyLoading && historyError && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/40 p-4">
              <p className="text-sm text-red-600 dark:text-red-400">
                {historyError}
              </p>
            </div>
          )}

          {isExpanded &&
            !historyLoading &&
            !historyError &&
            history.length === 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No recent changes found for this name.
                </p>
              </div>
            )}

          {isExpanded &&
            !historyLoading &&
            !historyError &&
            history.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                <div className="space-y-2">
                  {history.map((event) => (
                    <NameHistoryItem key={event.id} event={event} />
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
