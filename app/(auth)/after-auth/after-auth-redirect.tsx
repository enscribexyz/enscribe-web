'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList } from '@clerk/nextjs'

export default function AfterAuthRedirect() {
  const router = useRouter()
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: true,
  })

  useEffect(() => {
    if (!isLoaded) return

    if (userMemberships.data && userMemberships.data.length > 0) {
      const firstOrg = userMemberships.data[0].organization
      router.replace(`/dashboard/${firstOrg.slug}`)
    } else {
      // No orgs yet — send to dashboard root which will prompt org creation
      router.replace('/dashboard')
    }
  }, [isLoaded, userMemberships.data, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Redirecting...</div>
    </div>
  )
}
