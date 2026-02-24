'use client'

import React from 'react'
import {
  useOrganizationList,
  CreateOrganization,
} from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2 } from 'lucide-react'

export default function DashboardIndexPage() {
  const router = useRouter()
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: true,
  })

  useEffect(() => {
    if (!isLoaded) return

    if (userMemberships.data && userMemberships.data.length > 0) {
      const firstOrg = userMemberships.data[0].organization
      router.replace(`/dashboard/${firstOrg.slug}`)
    }
  }, [isLoaded, userMemberships.data, router])

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-64 w-full max-w-lg rounded-xl" />
      </div>
    )
  }

  if (!userMemberships.data || userMemberships.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-8">
        {/* Welcome header */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to Enscribe
          </h1>
          <p className="text-muted-foreground text-sm max-w-md text-center">
            Create your first organization to start managing your smart contract
            names with your team.
          </p>
        </div>

        {/* Clerk CreateOrganization component */}
        <div className="w-full max-w-lg">
          <CreateOrganization
            afterCreateOrganizationUrl="/dashboard/:slug"
            appearance={{
              elements: {
                rootBox: 'w-full',
                cardBox: 'w-full shadow-none',
                card: 'w-full bg-card border border-border rounded-xl shadow-none',
              },
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Skeleton className="h-5 w-32" />
      <p className="text-muted-foreground text-sm">
        Redirecting to your organization...
      </p>
    </div>
  )
}
