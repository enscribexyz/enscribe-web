'use client'

import React, { Suspense } from 'react'
import Layout from '../../components/Layout'
import NameContract from '@/components/NameContract'

function NameContractContent() {
  return (
    <Layout>
      <NameContract />
    </Layout>
  )
}

export default function NameExistingContract() {
  return (
    <Suspense>
      <NameContractContent />
    </Suspense>
  )
}
