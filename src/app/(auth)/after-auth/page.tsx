'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

const AfterAuthClient = dynamic(() => import('./client'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
      </div>
    </div>
  ),
})

export default function AfterAuthPage() {
  return <AfterAuthClient />
}
