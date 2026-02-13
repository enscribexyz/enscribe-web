import React from 'react'
import { Badge } from '@/components/ui/badge'

type SuperappStat = {
  label: string
  value: string
}

interface SuperappPageProps {
  badge?: string
  title: string
  description: string
  stats?: SuperappStat[]
  children: React.ReactNode
}

export default function SuperappPage({
  badge,
  title,
  description,
  stats,
  children,
}: SuperappPageProps) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="rounded-2xl border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-6 py-8 text-white shadow-xl md:px-8 md:py-10">
        <div className="space-y-4">
          {badge ? (
            <Badge variant="secondary" className="bg-white/15 text-white">
              {badge}
            </Badge>
          ) : null}
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
            {title}
          </h1>
          <p className="max-w-3xl text-sm text-slate-200 md:text-base">
            {description}
          </p>
        </div>

        {stats && stats.length > 0 ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg bg-white/10 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-200">
                  {stat.label}
                </p>
                <p className="mt-1 text-lg font-semibold">{stat.value}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <div className="space-y-6">{children}</div>
    </div>
  )
}
