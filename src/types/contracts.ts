export type ContractStatus = 'unnamed' | 'pending' | 'named' | 'failed'

export interface Contract {
  id: string
  org_id: string
  address: string
  chain_id: number
  ens_name: string | null
  label: string | null
  parent_name: string | null
  status: ContractStatus
  primary_name_set: boolean
  forward_resolve_set: boolean
  metadata: Record<string, unknown>
  verified_name: string | null
  added_by: string | null
  created_at: string
  updated_at: string
}

export type OperationType = 'assign' | 'batch_assign' | 'delegate' | 'revoke'
export type OperationStatus = 'pending' | 'submitted' | 'confirmed' | 'failed'

export interface NamingOperation {
  id: string
  org_id: string
  contract_id: string | null
  operation_type: OperationType
  status: OperationStatus
  chain_id: number
  tx_hash: string | null
  user_op_hash: string | null
  batch_id: string | null
  details: Record<string, unknown>
  initiated_by: string | null
  created_at: string
  updated_at: string
}

export type DelegationStatus = 'pending' | 'delegated' | 'revoked'

export interface Organization {
  id: string
  clerk_org_id: string
  name: string
  slug: string
  ens_domain: string | null
  ens_domain_chain_id: number | null
  delegation_status: DelegationStatus
  delegation_tx_hash: string | null
  created_at: string
  updated_at: string
}

export interface OrgMember {
  id: string
  org_id: string
  clerk_user_id: string
  role: 'admin' | 'member'
  wallet_address: string | null
  created_at: string
}
