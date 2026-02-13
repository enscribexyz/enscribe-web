import React from 'react'
import Layout from '../components/Layout'
import DeployForm from '../components/DeployForm'
import SuperappPage from '@/components/SuperappPage'

export default function DeployPage() {
  return (
    <Layout>
      <SuperappPage
        badge="Deployment Identity"
        title="Deploy Contracts With ENS Identity"
        description="Ship new contracts with a production-grade naming workflow, so your protocol inventory is discoverable and trusted from day one."
      >
        <DeployForm />
      </SuperappPage>
    </Layout>
  )
}
