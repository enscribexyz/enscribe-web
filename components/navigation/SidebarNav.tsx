import React, { memo } from 'react'
import Link from 'next/link'
import type { ComponentType, SVGProps } from 'react'

export interface NavItem {
  name: string
  href: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

interface SidebarNavProps {
  items: NavItem[]
  /** Extra className applied to each `<a>` element */
  linkClassName?: string
}

/**
 * Shared nav list used by both the desktop sidebar and the mobile drawer.
 * Renders items in three groups separated by dividers:
 *   group 0-2 | divider | group 3 | divider (if any) | group 4+
 */
export const SidebarNav = memo(function SidebarNav({
  items,
  linkClassName = 'flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-foreground-active hover:bg-sidebar-hover rounded-md transition-colors',
}: SidebarNavProps) {
  const group1 = items.slice(0, 3)
  const group2 = items.slice(3, 4)
  const group3 = items.slice(4)

  return (
    <ul className="space-y-1">
      {group1.map((item) => (
        <li key={item.name}>
          <Link href={item.href} className={linkClassName}>
            <item.icon className="w-4 h-4 shrink-0 opacity-70" />
            {item.name}
          </Link>
        </li>
      ))}

      {items.length > 3 && (
        <li className="py-2">
          <div className="border-t border-sidebar-border" />
        </li>
      )}

      {group2.map((item) => (
        <li key={item.name}>
          <Link href={item.href} className={linkClassName}>
            <item.icon className="w-4 h-4 shrink-0 opacity-70" />
            {item.name}
          </Link>
        </li>
      ))}

      {items.length > 4 && (
        <li className="py-2">
          <div className="border-t border-sidebar-border" />
        </li>
      )}

      {group3.map((item) => (
        <li key={item.name}>
          <Link href={item.href} className={linkClassName}>
            <item.icon className="w-4 h-4 shrink-0 opacity-70" />
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  )
})
