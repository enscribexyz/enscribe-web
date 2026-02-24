'use client'

import React from 'react'
import { useOrganizationList } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  if (!userMemberships.data || userMemberships.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <h1 className="text-2xl font-bold text-foreground">Welcome to Enscribe</h1>
        <p className="text-muted-foreground text-sm max-w-md text-center">
          Create an organization to get started with managing your smart contract
          names.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-muted-foreground text-sm">Redirecting...</div>
    </div>
  )
}
