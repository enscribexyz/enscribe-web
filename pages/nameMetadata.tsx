import React from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import NameMetadata from '@/components/NameMetadata'

export default function NameMetadataPage() {
  const router = useRouter()
  const { name } = router.query

  return (
    <Layout>
      <NameMetadata initialName={typeof name === 'string' ? name : undefined} />
    </Layout>
  )
}
