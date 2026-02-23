'use client'

import React from 'react'
import Layout from '../../components/Layout'
import ContractHistory from '../../components/ContractHistory'
import { useAccount } from 'wagmi'

export default function HistoryPage() {
  const { isConnected } = useAccount()

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
        My Contracts
      </h1>

      {isConnected ? (
        <ContractHistory />
      ) : (
        <p className="text-red-600 dark:text-red-400 text-lg">
          Please connect your wallet to view contract history.
        </p>
      )}
    </Layout>
  )
}
