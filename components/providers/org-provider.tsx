'use client'

import React, { createContext, useContext } from 'react'
import { useOrganization } from '@clerk/nextjs'

interface OrgContextValue {
  orgId: string | null
  orgSlug: string | null
  orgName: string | null
  orgLogoUrl: string | null
  isLoaded: boolean
}

const OrgContext = createContext<OrgContextValue>({
  orgId: null,
  orgSlug: null,
  orgName: null,
  orgLogoUrl: null,
  isLoaded: false,
})

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { organization, isLoaded } = useOrganization()

  const value: OrgContextValue = {
    orgId: organization?.id ?? null,
    orgSlug: organization?.slug ?? null,
    orgName: organization?.name ?? null,
    orgLogoUrl: organization?.imageUrl ?? null,
    isLoaded,
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useOrg() {
  return useContext(OrgContext)
}
