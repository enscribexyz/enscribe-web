import React, { memo } from 'react'
import type { ENSDomain } from '@/types'
import type { NetworkConfig } from '@/utils/constants'
import { ENSNamesList } from './ENSNamesList'

interface OwnedENSNamesListProps {
  userOwnedDomains: ENSDomain[]
  config: NetworkConfig | undefined
  onNavigateToDomain: (domainName: string) => Promise<void>
}

export const OwnedENSNamesList = memo(function OwnedENSNamesList({
  userOwnedDomains,
  config,
  onNavigateToDomain,
}: OwnedENSNamesListProps) {
  return (
    <ENSNamesList
      domains={userOwnedDomains}
      config={config}
      label="Owned ENS Names"
      copyIdPrefix="owned"
      onNavigateToDomain={onNavigateToDomain}
      indentSubdomains
    />
  )
})
