'use client'

import { useState } from 'react'
import { Web3Provider } from '@/src/components/providers/wagmi-provider'
import { OrgProvider } from '@/src/components/providers/org-provider'
import { Sidebar } from '@/src/components/dashboard/sidebar'
import { Header } from '@/src/components/dashboard/header'
import { CommandPalette } from '@/src/components/dashboard/command-palette'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  return (
    <Web3Provider>
      <OrgProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-60">
            <Header onOpenCommandPalette={() => setCommandPaletteOpen(true)} />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
        />
      </OrgProvider>
    </Web3Provider>
  )
}
