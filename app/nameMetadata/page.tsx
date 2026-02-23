'use client'

import React, { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '../../components/Layout'
import NameMetadata from '@/components/NameMetadata'

function NameMetadataContent() {
  const searchParams = useSearchParams()
  const name = searchParams?.get('name') ?? undefined

  return (
    <Layout>
      <NameMetadata initialName={name} />
    </Layout>
  )
}

export default function NameMetadataPage() {
  return (
    <Suspense>
      <NameMetadataContent />
    </Suspense>
  )
}
