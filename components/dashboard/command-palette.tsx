'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  FileText,
  Tag,
  Layers,
  Activity,
  Settings,
  Search,
} from 'lucide-react'
import { useOrg } from '@/components/providers/org-provider'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { orgSlug } = useOrg()
  const [search, setSearch] = useState('')

  const basePath = orgSlug ? `/dashboard/${orgSlug}` : '/dashboard'

  const navItems = [
    { name: 'Overview', href: basePath, icon: LayoutDashboard },
    { name: 'Contracts', href: `${basePath}/contracts`, icon: FileText },
    { name: 'Assign Name', href: `${basePath}/assign`, icon: Tag },
    { name: 'Batch Naming', href: `${basePath}/batch`, icon: Layers },
    { name: 'Activity', href: `${basePath}/activity`, icon: Activity },
    { name: 'Settings', href: `${basePath}/settings`, icon: Settings },
  ]

  const quickActions = [
    { name: 'Name a Contract', href: `${basePath}/assign` },
    { name: 'Batch Name Contracts', href: `${basePath}/batch` },
    { name: 'Add a Contract', href: `${basePath}/contracts` },
  ]

  // Close on escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <Command
          className="rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl overflow-hidden"
          shouldFilter={true}
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex-1 h-11 bg-transparent text-sm outline-none placeholder:text-muted-foreground px-2"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Navigation"
              className="text-xs font-medium text-muted-foreground px-2 py-1.5"
            >
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.href}
                    value={item.name}
                    onSelect={() => {
                      router.push(item.href)
                      onOpenChange(false)
                      setSearch('')
                    }}
                    className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.name}
                  </Command.Item>
                )
              })}
            </Command.Group>

            <Command.Separator className="my-1 h-px bg-border" />

            <Command.Group
              heading="Quick Actions"
              className="text-xs font-medium text-muted-foreground px-2 py-1.5"
            >
              {quickActions.map((action) => (
                <Command.Item
                  key={action.name}
                  value={action.name}
                  onSelect={() => {
                    router.push(action.href)
                    onOpenChange(false)
                    setSearch('')
                  }}
                  className="flex items-center gap-3 px-3 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {action.name}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
