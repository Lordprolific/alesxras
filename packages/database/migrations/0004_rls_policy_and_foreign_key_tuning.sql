-- Cache request-scoped GUC values once per statement in RLS predicates.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['procurement_requests','suppliers','agent_runs','approvals','spending_policies','chain_transactions','audit_events','bids'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS organization_scope ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY organization_scope ON public.%I USING (organization_id = (SELECT nullif(current_setting(''app.organization_id'', true), '''')::uuid)) WITH CHECK (organization_id = (SELECT nullif(current_setting(''app.organization_id'', true), '''')::uuid))',
      t
    );
  END LOOP;
  DROP POLICY IF EXISTS organization_scope ON public.organizations;
  CREATE POLICY organization_scope ON public.organizations
    USING (id = (SELECT nullif(current_setting('app.organization_id', true), '')::uuid))
    WITH CHECK (id = (SELECT nullif(current_setting('app.organization_id', true), '')::uuid));
  DROP POLICY IF EXISTS user_scope ON public.users;
  CREATE POLICY user_scope ON public.users
    USING (id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid))
    WITH CHECK (id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid));
  DROP POLICY IF EXISTS membership_scope ON public.memberships;
  CREATE POLICY membership_scope ON public.memberships
    USING (
      organization_id = (SELECT nullif(current_setting('app.organization_id', true), '')::uuid)
      AND user_id = (SELECT nullif(current_setting('app.user_id', true), '')::uuid)
    )
    WITH CHECK (organization_id = (SELECT nullif(current_setting('app.organization_id', true), '')::uuid));
END $$;

CREATE INDEX IF NOT EXISTS memberships_user_id_idx ON public.memberships(user_id);
CREATE INDEX IF NOT EXISTS procurement_created_by_idx ON public.procurement_requests(created_by);
CREATE INDEX IF NOT EXISTS agent_runs_org_idx ON public.agent_runs(organization_id);
CREATE INDEX IF NOT EXISTS agent_runs_org_procurement_idx ON public.agent_runs(organization_id, procurement_id);
CREATE INDEX IF NOT EXISTS approvals_approved_by_idx ON public.approvals(approved_by);
CREATE INDEX IF NOT EXISTS approvals_org_procurement_idx ON public.approvals(organization_id, procurement_id);
CREATE INDEX IF NOT EXISTS audit_events_actor_user_idx ON public.audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS bids_org_procurement_idx ON public.bids(organization_id, procurement_id);
CREATE INDEX IF NOT EXISTS bids_org_supplier_idx ON public.bids(organization_id, supplier_id);
CREATE INDEX IF NOT EXISTS chain_transactions_org_idx ON public.chain_transactions(organization_id);
CREATE INDEX IF NOT EXISTS chain_transactions_org_approval_idx ON public.chain_transactions(organization_id, approval_id);
