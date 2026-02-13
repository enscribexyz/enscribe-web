import React from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import NameMetadata from '@/components/NameMetadata'
import SuperappPage from '@/components/SuperappPage'

export default function NameMetadataPage() {
  const router = useRouter()
  const { name } = router.query

  return (
    <Layout>
      <SuperappPage
        badge="Explorer"
        title="Inspect And Manage ENS Name Metadata"
        description="Explore ownership, resolver details, hierarchy, and editable text records with the same superapp visual system."
      >
        <NameMetadata initialName={typeof name === 'string' ? name : undefined} />
      </SuperappPage>
    </Layout>
  )
}
