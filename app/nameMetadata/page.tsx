'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import Layout from '../../components/Layout'
import NameMetadata from '@/components/NameMetadata'

export default function NameMetadataPage() {
  const searchParams = useSearchParams()
  const name = searchParams.get('name') ?? undefined

  return (
    <Layout>
      <NameMetadata initialName={name} />
    </Layout>
  )
}
