'use client'

import React, { useState, useEffect } from 'react'
import { useOrganizationList, CreateOrganization } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Building2, Loader2, ArrowRight } from 'lucide-react'

export default function DashboardIndexPage() {
  const router = useRouter()
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: true,
  })
  const [showCreateFallback, setShowCreateFallback] = useState(false)

  // Redirect to first org if user has memberships
  useEffect(() => {
    if (!isLoaded) return

    if (userMemberships.data && userMemberships.data.length > 0) {
      const firstOrg = userMemberships.data[0].organization
      router.replace(`/dashboard/${firstOrg.slug}`)
    }
  }, [isLoaded, userMemberships.data, router])

  // If Clerk takes too long to load, show org creation flow anyway
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) setShowCreateFallback(true)
    }, 3000)
    return () => clearTimeout(timer)
  }, [isLoaded])

  // Show create-org flow: either Clerk finished loading with no orgs, or loading timed out
  const hasNoOrgs =
    isLoaded && (!userMemberships.data || userMemberships.data.length === 0)

  if (hasNoOrgs || showCreateFallback) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-8">
        {/* Welcome header */}
        <div className="text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome to Enscribe
          </h1>
          <p className="text-muted-foreground text-sm max-w-md text-center">
            Create your first organization to start managing ENS names for your
            smart contracts with your team.
          </p>
        </div>

        {/* Steps guide */}
        <div className="w-full max-w-md space-y-3">
          {[
            {
              step: '1',
              title: 'Create an organization',
              desc: 'Set up your team workspace below',
            },
            {
              step: '2',
              title: 'Add your contracts',
              desc: 'Import smart contracts to manage',
            },
            {
              step: '3',
              title: 'Assign ENS names',
              desc: 'Map human-readable names to contracts',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {item.step}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            </div>
          ))}
        </div>

        {/* Clerk CreateOrganization component */}
        <div className="w-full max-w-lg">
          <p className="text-sm font-medium text-foreground mb-3 text-center">
            Get started by creating your organization
          </p>
          <CreateOrganization
            routing="hash"
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

  // Has orgs — redirect is in progress
  if (isLoaded && userMemberships.data && userMemberships.data.length > 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        <p className="text-muted-foreground text-sm">
          Redirecting to your organization...
        </p>
      </div>
    )
  }

  // Initial loading — Clerk is still loading
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      <p className="text-muted-foreground text-sm">
        Loading your dashboard...
      </p>
    </div>
  )
}
