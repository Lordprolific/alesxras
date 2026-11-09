-- Cover the supplier-side composite foreign key used by cross-organization bids.
CREATE INDEX IF NOT EXISTS bids_supplier_org_supplier_idx ON public.bids (supplier_organization_id, supplier_id);
