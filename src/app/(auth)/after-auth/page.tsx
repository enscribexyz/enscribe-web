'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganizationList, useAuth } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AfterAuthPage() {
  const router = useRouter()
  const { isSignedIn, isLoaded: authLoaded } = useAuth()
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  })

  useEffect(() => {
    if (!authLoaded) return

    // Not signed in — go to landing
    if (!isSignedIn) {
      router.replace('/home')
      return
    }

    if (!orgsLoaded) return

    const memberships = userMemberships?.data
    if (memberships && memberships.length > 0) {
      // Has orgs — go to first org's dashboard
      const firstOrg = memberships[0].organization
      router.replace(`/${firstOrg.slug}`)
    } else {
      // No orgs yet — go to home
      router.replace('/home')
    }
  }, [authLoaded, isSignedIn, orgsLoaded, userMemberships, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
      </div>
    </div>
  )
}
