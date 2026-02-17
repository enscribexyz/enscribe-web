'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useOrganization } from '@clerk/nextjs'
import { Command } from 'cmdk'
import {
  LayoutDashboard,
  FileCode2,
  Tag,
  Layers,
  Activity,
  Settings,
  Plus,
  Search,
} from 'lucide-react'
import { useOrg } from '@/src/components/providers/org-provider'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { organization } = useOrganization()
  const { contracts } = useOrg()
  const [search, setSearch] = useState('')

  const orgSlug = organization?.slug || ''

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false)
      command()
    },
    [onOpenChange],
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  // Reset search when closed
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command
          className="overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
          loop
        >
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Actions"
              className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                onSelect={() =>
                  runCommand(() =>
                    router.push(`/${orgSlug}/contracts?action=add`),
                  )
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                Add Contract
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/${orgSlug}/assign`))
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <Tag className="h-4 w-4 text-muted-foreground" />
                Assign Name
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/${orgSlug}/batch`))
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <Layers className="h-4 w-4 text-muted-foreground" />
                Batch Assign
              </Command.Item>
            </Command.Group>

            <Command.Separator className="my-1.5 h-px bg-border" />

            <Command.Group
              heading="Navigation"
              className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
            >
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/${orgSlug}`))
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                Overview
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/${orgSlug}/contracts`))
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <FileCode2 className="h-4 w-4 text-muted-foreground" />
                Contracts
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/${orgSlug}/activity`))
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <Activity className="h-4 w-4 text-muted-foreground" />
                Activity
              </Command.Item>
              <Command.Item
                onSelect={() =>
                  runCommand(() => router.push(`/${orgSlug}/settings`))
                }
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Command.Item>
            </Command.Group>

            {contracts.length > 0 && (
              <>
                <Command.Separator className="my-1.5 h-px bg-border" />
                <Command.Group
                  heading="Contracts"
                  className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  {contracts.slice(0, 5).map((contract) => (
                    <Command.Item
                      key={contract.id}
                      value={`${contract.address} ${contract.ens_name || ''} ${contract.verified_name || ''}`}
                      onSelect={() =>
                        runCommand(() =>
                          router.push(
                            `/${orgSlug}/contracts?address=${contract.address}`,
                          ),
                        )
                      }
                      className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent"
                    >
                      <FileCode2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-mono text-xs">
                          {contract.ens_name ||
                            `${contract.address.slice(0, 10)}...${contract.address.slice(-6)}`}
                        </span>
                        {contract.verified_name && (
                          <span className="text-xs text-muted-foreground">
                            {contract.verified_name}
                          </span>
                        )}
                      </div>
                    </Command.Item>
                  ))}
                </Command.Group>
              </>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  )
}
