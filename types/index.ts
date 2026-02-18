/**
 * Shared types used across the application.
 * Single source of truth — do not duplicate these in individual files.
 */

// ─── ENS ─────────────────────────────────────────────────────────────────────

export interface ENSDomain {
  name: string
  isPrimary?: boolean
  expiryDate?: number
  hasLabelhash?: boolean
  level?: number
  parent2LD?: string
}

export interface TextRecords {
  name?: string
  alias?: string
  description?: string
  url?: string
  avatar?: string
  header?: string
  category?: string
  license?: string
  docs?: string
  audits?: string
  'com.github'?: string
  'com.twitter'?: string
  'org.telegram'?: string
  'com.linkedin'?: string
}

// ─── Verification ─────────────────────────────────────────────────────────────

export interface VerificationStatus {
  sourcify_verification: string
  etherscan_verification: string
  blockscout_verification: string
  audit_status: string
  attestation_tx_hash: string
  ens_name: string
  diligence_audit: string
  openZepplin_audit: string
  cyfrin_audit: string
}

// ─── Contract History ─────────────────────────────────────────────────────────

export interface ContractRecord {
  ensName: string
  contractAddress: string
  txHash: string
  contractCreated: string
  isOwnable: boolean
  sourcifyVerification?: 'exact_match' | 'match' | 'unverified'
  etherscanVerification?: 'verified' | 'unverified'
  blockscoutVerification?: 'exact_match' | 'match' | 'unverified'
  attestation?: 'audited' | 'unaudited'
}

// ─── Batch Naming ─────────────────────────────────────────────────────────────

export interface BatchEntry {
  address: string
  label: string
  ensName?: string
  status?: 'pending' | 'success' | 'error'
  txHash?: string
  errorMessage?: string
}

// ─── Constructor Args ─────────────────────────────────────────────────────────

export type ConstructorArg = {
  type: string
  value: string
  isCustom: boolean
  isTuple?: boolean
  label?: string
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ContractMetadataResponse {
  records: TextRecords
  error?: string
}

export interface VerificationResponse extends VerificationStatus {
  error?: string
}
