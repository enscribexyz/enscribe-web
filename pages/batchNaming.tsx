import React from 'react'
import Layout from '../components/Layout'
import BatchNamingForm from '@/components/BatchNamingForm'
import SuperappPage from '@/components/SuperappPage'

export default function BatchNamingPage() {
  return (
    <Layout>
      <SuperappPage
        badge="Batch Operations"
        title="Queue And Process Contract Naming At Scale"
        description="Run high-volume ENS naming workflows with less signing overhead and clearer execution state for protocol and enterprise teams."
      >
        <BatchNamingForm />
      </SuperappPage>
    </Layout>
  )
}
