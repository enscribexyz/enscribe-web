'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrganization } from '@clerk/nextjs'
import { OrganizationSwitcher, UserButton } from '@clerk/nextjs'
import {
  LayoutDashboard,
  FileCode2,
  Tag,
  Layers,
  Activity,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/src/lib/utils'
import { useState } from 'react'

const navigation = [
  { name: 'Overview', href: '', icon: LayoutDashboard },
  { name: 'Contracts', href: '/contracts', icon: FileCode2 },
  { name: 'Assign Name', href: '/assign', icon: Tag },
  { name: 'Batch Assign', href: '/batch', icon: Layers },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { organization } = useOrganization()
  const [collapsed, setCollapsed] = useState(false)

  const orgSlug = organization?.slug || ''
  const basePath = `/${orgSlug}`

  function isActive(href: string) {
    const fullPath = `${basePath}${href}`
    if (href === '') return pathname === basePath || pathname === basePath + '/'
    return pathname?.startsWith(fullPath) ?? false
  }

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href={basePath} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <span className="text-sm font-bold text-primary-foreground">
                E
              </span>
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">
              Enscribe
            </span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-sm font-bold text-primary-foreground">E</span>
          </div>
        )}
      </div>

      {/* Org Switcher */}
      <div
        className={cn(
          'border-b border-sidebar-border p-3',
          collapsed && 'flex justify-center',
        )}
      >
        {!collapsed ? (
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger:
                  'w-full justify-between rounded-md border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,10%)] px-3 py-2 text-sm text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
                organizationPreviewMainIdentifier: 'text-[hsl(0,0%,98%)]',
                organizationPreviewSecondaryIdentifier: 'text-[hsl(0,0%,63%)]',
                organizationSwitcherTriggerIcon: 'text-[hsl(0,0%,63%)]',
              },
            }}
          />
        ) : (
          <OrganizationSwitcher
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger:
                  'w-10 h-10 p-0 justify-center rounded-md border border-[hsl(0,0%,15%)] bg-[hsl(0,0%,10%)] hover:bg-[hsl(0,0%,13%)]',
                organizationSwitcherTriggerIcon: 'hidden',
                organizationPreviewTextContainer: 'hidden',
              },
            }}
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navigation.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.name}
              href={`${basePath}${item.href}`}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                collapsed && 'justify-center px-0',
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground group-hover:text-sidebar-foreground',
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            'flex items-center',
            collapsed ? 'justify-center' : 'justify-between',
          )}
        >
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-8 w-8',
              },
            }}
          />
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="mt-2 rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
