import React from 'react'
import Layout from '../components/Layout'
import NameContract from '@/components/NameContract'
import SuperappPage from '@/components/SuperappPage'

export default function NameExisitingContract() {
  return (
    <Layout>
      <SuperappPage
        badge="Identity Operation"
        title="Assign ENS Identity To Existing Contracts"
        description="Connect your wallet, verify ownership, and attach a clear ENS identity to deployed contracts across supported chains."
      >
        <NameContract />
      </SuperappPage>
    </Layout>
  )
}
