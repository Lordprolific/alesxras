-- This project uses server-only service_role access. All browser roles are
-- denied by grants and by restrictive RLS policies. The service_role bypasses
-- RLS by design; server handlers must authorize from verified NEAR sessions.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations','users','memberships','suppliers','procurement_requests',
    'bids','agent_runs','approvals','spending_policies','chain_transactions','audit_events'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS organization_scope ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS user_scope ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS membership_scope ON public.%I', t);
    EXECUTE format('CREATE POLICY server_only_deny_browser ON public.%I USING (false) WITH CHECK (false)', t);
  END LOOP;
END
$$;
