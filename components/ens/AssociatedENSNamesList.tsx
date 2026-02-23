import React, { memo, useCallback } from 'react'
import type { ENSDomain } from '@/types'
import type { NetworkConfig } from '@/utils/constants'
import { ENSNamesList } from './ENSNamesList'

interface AssociatedENSNamesListProps {
  ensNames: ENSDomain[]
  config: NetworkConfig | undefined
}

export const AssociatedENSNamesList = memo(function AssociatedENSNamesList({
  ensNames,
  config,
}: AssociatedENSNamesListProps) {
  const rowClassName = useCallback(
    (domain: ENSDomain) =>
      domain.isPrimary
        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
    [],
  )

  const renderExtra = useCallback(
    (domain: ENSDomain) =>
      domain.isPrimary ? (
        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full whitespace-nowrap">
          Primary
        </span>
      ) : null,
    [],
  )

  return (
    <ENSNamesList
      domains={ensNames}
      config={config}
      label="Associated ENS Names"
      copyIdPrefix="associated"
      rowClassName={rowClassName}
      renderExtra={renderExtra}
    />
  )
})
