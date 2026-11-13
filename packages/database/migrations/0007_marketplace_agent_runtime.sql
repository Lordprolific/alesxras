-- Public procurement discovery and cross-organization sealed bids.
ALTER TABLE public.procurement_requests
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

ALTER TABLE public.bids
  ADD COLUMN IF NOT EXISTS supplier_organization_id uuid;

UPDATE public.bids
   SET supplier_organization_id = organization_id
 WHERE supplier_organization_id IS NULL;

ALTER TABLE public.bids
  ALTER COLUMN supplier_organization_id SET NOT NULL;

ALTER TABLE public.bids
  DROP CONSTRAINT IF EXISTS bids_organization_id_supplier_id_fkey;

ALTER TABLE public.bids
  ADD CONSTRAINT bids_supplier_organization_supplier_fkey
  FOREIGN KEY (supplier_organization_id, supplier_id)
  REFERENCES public.suppliers(organization_id, id)
  ON DELETE CASCADE;

ALTER TABLE public.agent_runs
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS procurement_public_marketplace_idx
  ON public.procurement_requests (created_at DESC)
  WHERE is_public = true AND status = 'open';
CREATE INDEX IF NOT EXISTS bids_supplier_org_submitted_idx
  ON public.bids (supplier_organization_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_claim_idx
  ON public.agent_runs (created_at)
  WHERE status = 'queued';

CREATE OR REPLACE FUNCTION public.claim_next_agent_run(p_lease_seconds integer DEFAULT 90)
RETURNS SETOF public.agent_runs
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  IF p_lease_seconds < 15 OR p_lease_seconds > 300 THEN
    RAISE EXCEPTION 'Lease duration must be between 15 and 300 seconds';
  END IF;
  UPDATE public.agent_runs
     SET status = 'queued', lease_expires_at = NULL
   WHERE status = 'running' AND lease_expires_at IS NOT NULL
     AND lease_expires_at < now() AND attempt_count < 3;
  UPDATE public.agent_runs
     SET status = 'failed', error_message = 'Agent task exceeded its retry limit.',
         completed_at = now(), lease_expires_at = NULL
   WHERE status = 'running' AND lease_expires_at IS NOT NULL
     AND lease_expires_at < now() AND attempt_count >= 3;
  SELECT id INTO v_run_id FROM public.agent_runs
   WHERE status = 'queued' ORDER BY created_at ASC
   FOR UPDATE SKIP LOCKED LIMIT 1;
  IF v_run_id IS NULL THEN RETURN; END IF;
  RETURN QUERY
  UPDATE public.agent_runs
     SET status = 'running', attempt_count = attempt_count + 1,
         started_at = now(),
         lease_expires_at = now() + make_interval(secs => p_lease_seconds),
         error_message = NULL
   WHERE id = v_run_id RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_next_agent_run(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_agent_run(integer) TO service_role;
