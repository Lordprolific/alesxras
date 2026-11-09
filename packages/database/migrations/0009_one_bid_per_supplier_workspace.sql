-- Enforce one proposal per supplier workspace for each procurement request.
CREATE UNIQUE INDEX IF NOT EXISTS bids_one_submission_per_supplier_workspace_idx ON public.bids (procurement_id, supplier_organization_id);
