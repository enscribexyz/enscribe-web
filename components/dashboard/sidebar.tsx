'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { OrganizationSwitcher } from '@clerk/nextjs'
import {
  LayoutDashboard,
  FileText,
  Tag,
  Layers,
  Activity,
  Settings,
  Wrench,
  Info,
  File,
  X,
} from 'lucide-react'
import { useOrg } from '@/components/providers/org-provider'
import { EnscribeLogo } from '@/components/EnscribeLogo'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function DashboardSidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { orgSlug } = useOrg()

  const basePath = orgSlug ? `/dashboard/${orgSlug}` : '/dashboard'

  const navItems = [
    { name: 'Overview', href: basePath, icon: LayoutDashboard },
    { name: 'Contracts', href: `${basePath}/contracts`, icon: FileText },
    { name: 'Assign Name', href: `${basePath}/assign`, icon: Tag },
    { name: 'Batch Naming', href: `${basePath}/batch`, icon: Layers },
    { name: 'Activity', href: `${basePath}/activity`, icon: Activity },
    { name: 'Settings', href: `${basePath}/settings`, icon: Settings },
  ]

  const productLink = process.env.NEXT_PUBLIC_DOCS_SITE_URL

  const sidebarContent = (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 h-14 flex items-center border-b border-sidebar-border shrink-0">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <EnscribeLogo size={28} />
            <span className="text-base font-semibold text-sidebar-foreground-active truncate">
              Enscribe
            </span>
          </Link>
        </div>

        {/* Org Switcher */}
        <div className="px-3 py-3 border-b border-sidebar-border">
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/dashboard/:slug"
            afterCreateOrganizationUrl="/dashboard/:slug"
            appearance={{
              elements: {
                rootBox: 'w-full',
                organizationSwitcherTrigger:
                  'w-full justify-between px-3 py-2 rounded-md bg-sidebar-hover text-sidebar-foreground-active text-sm',
              },
            }}
          />
        </div>

        {/* Nav */}
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive =
              item.href === basePath
                ? pathname === basePath
                : pathname?.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                  isActive
                    ? 'bg-sidebar-active text-sidebar-foreground-active font-medium'
                    : 'text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Legacy tools link */}
        <div className="px-3 py-2">
          <div className="text-xs font-medium text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2">
            Legacy Tools
          </div>
          <Link
            href="/nameContract"
            onClick={onClose}
            className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover rounded-md transition-colors"
          >
            <Wrench className="w-4 h-4 shrink-0" />
            Name Contract
          </Link>
        </div>
      </div>

      {/* Footer links */}
      <div className="px-3 py-3 border-t border-sidebar-border flex gap-1 shrink-0">
        <Link
          href={productLink || '/'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover rounded-md transition-colors"
        >
          <Info className="w-4 h-4 shrink-0" />
          About
        </Link>
        <Link
          href={`${productLink}/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 flex-1 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover rounded-md transition-colors"
        >
          <File className="w-4 h-4 shrink-0" />
          Docs
        </Link>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-sidebar z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col transform transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="absolute top-3 right-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-sidebar-foreground hover:bg-sidebar-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebarContent}
      </div>
    </>
  )
}
