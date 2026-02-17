'use client'

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
  type ReactNode,
} from 'react'
import { useOrganization } from '@clerk/nextjs'
import { createClient } from '@/src/lib/supabase/client'
import type { Organization, Contract } from '@/src/types/contracts'

interface OrgContextValue {
  org: Organization | null
  contracts: Contract[]
  isLoading: boolean
  isAdmin: boolean
  refetchContracts: () => Promise<void>
  refetchOrg: () => Promise<void>
}

const OrgContext = createContext<OrgContextValue>({
  org: null,
  contracts: [],
  isLoading: true,
  isAdmin: false,
  refetchContracts: async () => {},
  refetchOrg: async () => {},
})

export function useOrg() {
  return useContext(OrgContext)
}

export function OrgProvider({ children }: { children: ReactNode }) {
  const { organization, membership } = useOrganization()
  const [org, setOrg] = useState<Organization | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const isAdmin = membership?.role === 'org:admin'

  const fetchOrg = useCallback(async () => {
    if (!organization?.id) {
      setOrg(null)
      setContracts([])
      setIsLoading(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('clerk_org_id', organization.id)
      .single()

    setOrg(data as Organization | null)
    setIsLoading(false)
  }, [organization?.id])

  const fetchContracts = useCallback(async () => {
    if (!org?.id) {
      setContracts([])
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from('contracts')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    setContracts((data as Contract[]) ?? [])
  }, [org?.id])

  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  useEffect(() => {
    if (org) fetchContracts()
  }, [org, fetchContracts])

  return (
    <OrgContext.Provider
      value={{
        org,
        contracts,
        isLoading,
        isAdmin,
        refetchContracts: fetchContracts,
        refetchOrg: fetchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  )
}
