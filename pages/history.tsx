import React from 'react'
import Layout from '../components/Layout'
import ContractHistory from '../components/ContractHistory'
import SuperappPage from '@/components/SuperappPage'

export default function HistoryPage() {
  return (
    <Layout>
      <SuperappPage
        badge="Inventory Timeline"
        title="Monitor Named And Unnamed Contract Inventory"
        description="Review deployment history, verification signals, and naming coverage from a single operational view."
      >
        <ContractHistory />
      </SuperappPage>
    </Layout>
  )
}
