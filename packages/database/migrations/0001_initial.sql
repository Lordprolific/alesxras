-- Baseline PostgreSQL schema. Apply only after provisioning a database and
-- taking a verified backup. Private bids must not be copied to public chain state.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE member_role AS ENUM ('owner', 'buyer', 'supplier', 'approver');
CREATE TYPE procurement_status AS ENUM ('draft', 'open', 'evaluating', 'negotiating', 'awaiting_approval', 'approved', 'executing', 'completed', 'cancelled');
CREATE TYPE bid_status AS ENUM ('draft', 'submitted', 'withdrawn', 'selected', 'declined');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'consumed');
CREATE TYPE transaction_status AS ENUM ('pending', 'submitted', 'final', 'failed', 'unknown');

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  near_account_id text UNIQUE,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  near_account_id text,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id)
);
CREATE TABLE procurement_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  description text NOT NULL,
  requirements jsonb NOT NULL DEFAULT '[]'::jsonb,
  status procurement_status NOT NULL DEFAULT 'draft',
  budget_amount numeric(39, 0),
  token_id text NOT NULL DEFAULT 'NEAR',
  opens_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  CHECK (budget_amount IS NULL OR budget_amount > 0)
);
CREATE TABLE bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  procurement_id uuid NOT NULL,
  supplier_id uuid NOT NULL,
  amount_ciphertext bytea NOT NULL,
  amount_nonce bytea NOT NULL,
  proposal_ciphertext bytea NOT NULL,
  proposal_nonce bytea NOT NULL,
  encryption_key_version text NOT NULL,
  token_id text NOT NULL DEFAULT 'NEAR',
  status bid_status NOT NULL DEFAULT 'draft',
  submitted_at timestamptz,
  revealed_at timestamptz,
  revealed_amount numeric(39, 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (procurement_id, supplier_id),
  FOREIGN KEY (organization_id, procurement_id) REFERENCES procurement_requests(organization_id, id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id, supplier_id) REFERENCES suppliers(organization_id, id) ON DELETE CASCADE,
  CHECK (revealed_amount IS NULL OR revealed_amount > 0),
  CHECK ((revealed_at IS NULL) = (revealed_amount IS NULL))
);
CREATE TABLE agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  procurement_id uuid,
  kind text NOT NULL CHECK (kind IN ('evaluate_procurement', 'negotiate_bid', 'verify_transaction')),
  status text NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  input_digest text NOT NULL,
  result jsonb,
  provider text,
  model text,
  step_count integer NOT NULL DEFAULT 0 CHECK (step_count >= 0 AND step_count <= 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  FOREIGN KEY (organization_id, procurement_id) REFERENCES procurement_requests(organization_id, id) ON DELETE CASCADE
);
CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  procurement_id uuid NOT NULL,
  approved_by uuid NOT NULL REFERENCES users(id),
  amount numeric(39, 0) NOT NULL CHECK (amount > 0),
  token_id text NOT NULL,
  recipient_account_id text NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, id),
  FOREIGN KEY (organization_id, procurement_id) REFERENCES procurement_requests(organization_id, id) ON DELETE CASCADE
);
CREATE TABLE spending_policies (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  max_per_transaction numeric(39, 0) NOT NULL CHECK (max_per_transaction > 0),
  max_daily numeric(39, 0) NOT NULL CHECK (max_daily > 0),
  allowed_tokens text[] NOT NULL DEFAULT ARRAY['NEAR'],
  allowed_recipients text[] NOT NULL DEFAULT ARRAY[]::text[],
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_per_transaction <= max_daily)
);
CREATE TABLE chain_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  approval_id uuid NOT NULL UNIQUE,
  network text NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  transaction_hash text UNIQUE,
  sender_account_id text NOT NULL,
  receiver_account_id text NOT NULL,
  amount numeric(39, 0) NOT NULL CHECK (amount > 0),
  status transaction_status NOT NULL DEFAULT 'pending',
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, approval_id) REFERENCES approvals(organization_id, id) ON DELETE RESTRICT
);
CREATE TABLE audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX procurement_org_status_idx ON procurement_requests (organization_id, status, created_at DESC);
CREATE INDEX bids_procurement_status_idx ON bids (procurement_id, status, submitted_at);
CREATE INDEX agent_runs_queue_idx ON agent_runs (status, created_at) WHERE status = 'queued';
CREATE INDEX audit_events_org_created_idx ON audit_events (organization_id, created_at DESC);

-- Defense in depth for application queries. Set both values with SET LOCAL
-- inside the current request transaction after authenticating membership.
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
CREATE POLICY organization_scope ON organizations
  USING (id = nullif(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.organization_id', true), '')::uuid);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY user_scope ON users
  USING (id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (id = nullif(current_setting('app.user_id', true), '')::uuid);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY membership_scope ON memberships
  USING (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid
    AND user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (organization_id = nullif(current_setting('app.organization_id', true), '')::uuid);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'suppliers', 'procurement_requests', 'bids', 'agent_runs',
    'approvals', 'spending_policies', 'chain_transactions', 'audit_events'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY organization_scope ON %I USING (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.organization_id'', true), '''')::uuid)',
      table_name
    );
  END LOOP;
END $$;
