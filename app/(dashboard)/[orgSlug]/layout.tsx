'use client'

import React, { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'
import { useOrg } from '@/components/providers/org-provider'

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const router = useRouter()
  const urlOrgSlug = params?.orgSlug as string | undefined
  const { orgSlug: activeOrgSlug } = useOrg()
  const { userMemberships, setActive, isLoaded } = useOrganizationList({
    userMemberships: true,
  })

  useEffect(() => {
    if (!isLoaded || !urlOrgSlug || !setActive) return
    if (activeOrgSlug === urlOrgSlug) return // Already synced

    const membership = userMemberships.data?.find(
      (m) => m.organization.slug === urlOrgSlug,
    )

    if (membership) {
      setActive({ organization: membership.organization.id })
    } else {
      router.replace('/dashboard')
    }
  }, [isLoaded, urlOrgSlug, activeOrgSlug, userMemberships.data, setActive, router])

  return <>{children}</>
}
