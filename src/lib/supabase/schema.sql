-- Enscribe Platform: Supabase Schema
-- Run this migration in your Supabase SQL editor

-- Organizations (synced from Clerk)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ens_domain TEXT,
  ens_domain_chain_id INTEGER,
  delegation_status TEXT DEFAULT 'pending' CHECK (delegation_status IN ('pending', 'delegated', 'revoked')),
  delegation_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Organization members (synced from Clerk)
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  clerk_user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, clerk_user_id)
);

-- Contract inventory
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  ens_name TEXT,
  label TEXT,
  parent_name TEXT,
  status TEXT DEFAULT 'unnamed' CHECK (status IN ('unnamed', 'pending', 'named', 'failed')),
  primary_name_set BOOLEAN DEFAULT false,
  forward_resolve_set BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  verified_name TEXT,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, address, chain_id)
);

-- Naming operations (audit trail)
CREATE TABLE IF NOT EXISTS naming_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES contracts(id),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('assign', 'batch_assign', 'delegate', 'revoke')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed')),
  chain_id INTEGER NOT NULL,
  tx_hash TEXT,
  user_op_hash TEXT,
  batch_id UUID,
  details JSONB DEFAULT '{}',
  initiated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_chain ON contracts(org_id, chain_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(org_id, status);
CREATE INDEX IF NOT EXISTS idx_operations_org ON naming_operations(org_id);
CREATE INDEX IF NOT EXISTS idx_operations_batch ON naming_operations(batch_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(clerk_user_id);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE naming_operations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Note: These use Clerk JWT claims. Configure Supabase to use the "sub" claim from Clerk JWTs.

CREATE POLICY "Users can view their orgs" ON organizations
  FOR SELECT USING (
    clerk_org_id IN (
      SELECT o.clerk_org_id FROM organizations o
      JOIN org_members m ON m.org_id = o.id
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update their orgs" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
      AND m.role = 'admin'
    )
  );

CREATE POLICY "Users can view org members" ON org_members
  FOR SELECT USING (
    org_id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can view org contracts" ON contracts
  FOR SELECT USING (
    org_id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert org contracts" ON contracts
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update org contracts" ON contracts
  FOR UPDATE USING (
    org_id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can view org operations" ON naming_operations
  FOR SELECT USING (
    org_id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can insert org operations" ON naming_operations
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT m.org_id FROM org_members m
      WHERE m.clerk_user_id = (auth.jwt() ->> 'sub')
    )
  );
