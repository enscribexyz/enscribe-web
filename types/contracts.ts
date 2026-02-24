/**
 * Types for the organization dashboard.
 * These supplement types/index.ts (which covers ENS, batch naming, etc.).
 */

export type ContractStatus = 'pending' | 'named' | 'failed'

export type OperationType = 'assign' | 'batch' | 'delegate' | 'revoke'

export type OperationStatus = 'pending' | 'confirmed' | 'failed'

export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  user_id: string
  role: string
  created_at: string
}

export interface Contract {
  id: string
  org_id: string
  address: string
  chain_id: number
  ens_name: string | null
  status: ContractStatus
  added_by: string
  tx_hash: string | null
  created_at: string
  updated_at: string
}

export interface NamingOperation {
  id: string
  org_id: string
  contract_id: string | null
  operation_type: OperationType
  chain_id: number
  ens_name: string | null
  contract_address: string | null
  tx_hash: string | null
  status: OperationStatus
  performed_by: string
  created_at: string
}
