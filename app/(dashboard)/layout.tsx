'use client'

import React, { useState } from 'react'
import { OrgProvider } from '@/components/providers/org-provider'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/header'
import { CommandPalette } from '@/components/dashboard/command-palette'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  return (
    <OrgProvider>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Spacer for fixed sidebar */}
        <div className="hidden lg:block lg:w-64 shrink-0" />

        {/* Main content area */}
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardHeader
            onMenuClick={() => setSidebarOpen(true)}
            onSearchClick={() => setCommandPaletteOpen(true)}
          />
          <main className="flex-1 p-6">{children}</main>
        </div>

        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </div>
    </OrgProvider>
  )
}
