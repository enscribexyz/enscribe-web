-- Platform schema for Enscribe dashboard
-- Run this against your Supabase project to set up the required tables.

-- Organizations (synced from Clerk via webhook)
create table if not exists organizations (
  id text primary key,                -- Clerk org ID
  name text not null,
  slug text unique not null,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Org members (synced from Clerk via webhook)
create table if not exists org_members (
  id text primary key,                -- Clerk membership ID
  org_id text not null references organizations(id) on delete cascade,
  user_id text not null,              -- Clerk user ID
  role text not null default 'member',
  created_at timestamptz default now()
);

create index if not exists idx_org_members_org on org_members(org_id);
create index if not exists idx_org_members_user on org_members(user_id);

-- Contracts tracked by organizations
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  address text not null,
  chain_id integer not null,
  ens_name text,
  status text not null default 'pending',  -- pending | named | failed
  added_by text not null,                  -- Clerk user ID
  tx_hash text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_contracts_org on contracts(org_id);

-- Naming operations log
create table if not exists naming_operations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  contract_id uuid references contracts(id) on delete set null,
  operation_type text not null,  -- assign | batch | delegate | revoke
  chain_id integer not null,
  ens_name text,
  contract_address text,
  tx_hash text,
  status text not null default 'pending',  -- pending | confirmed | failed
  performed_by text not null,              -- Clerk user ID
  created_at timestamptz default now()
);

create index if not exists idx_naming_ops_org on naming_operations(org_id);

-- Row Level Security
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table contracts enable row level security;
alter table naming_operations enable row level security;

-- Policy: users can only see their own orgs
create policy "Users see own orgs" on organizations
  for select using (
    id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

-- Policy: users can see members of their orgs
create policy "Users see org members" on org_members
  for select using (
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

-- Policy: users can see/modify contracts in their orgs
create policy "Users see org contracts" on contracts
  for select using (
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Users insert org contracts" on contracts
  for insert with check (
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Users update org contracts" on contracts
  for update using (
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

-- Policy: users can see/insert naming operations for their orgs
create policy "Users see org ops" on naming_operations
  for select using (
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

create policy "Users insert org ops" on naming_operations
  for insert with check (
    org_id in (
      select org_id from org_members
      where user_id = auth.jwt() ->> 'sub'
    )
  );

-- Service role bypass for webhook handler
-- The webhook route uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
