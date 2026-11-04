-- Atomically provision one personal workspace for a verified NEAR wallet.
-- SECURITY INVOKER: executes with the caller's privileges. Only service_role
-- receives EXECUTE; browser roles have no table or function privileges.
CREATE OR REPLACE FUNCTION public.ensure_wallet_workspace(p_near_account_id text)
RETURNS TABLE(user_id uuid, organization_id uuid, organization_name text, member_role text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id uuid;
  v_organization_id uuid;
  v_organization_name text;
  v_role public.member_role;
BEGIN
  IF p_near_account_id IS NULL OR p_near_account_id !~ '^[a-z0-9._-]{2,64}$' THEN
    RAISE EXCEPTION 'Invalid NEAR account identifier';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_near_account_id, 0));

  INSERT INTO public.users (near_account_id, display_name)
  VALUES (p_near_account_id, p_near_account_id)
  ON CONFLICT (near_account_id) DO UPDATE
    SET near_account_id = EXCLUDED.near_account_id
  RETURNING id INTO v_user_id;

  SELECT m.organization_id, m.role, o.name
    INTO v_organization_id, v_role, v_organization_name
    FROM public.memberships m
    JOIN public.organizations o ON o.id = m.organization_id
   WHERE m.user_id = v_user_id
   ORDER BY m.created_at ASC
   LIMIT 1;

  IF v_organization_id IS NULL THEN
    INSERT INTO public.organizations (name)
    VALUES (p_near_account_id || ' workspace')
    RETURNING id, name INTO v_organization_id, v_organization_name;

    INSERT INTO public.memberships (organization_id, user_id, role)
    VALUES (v_organization_id, v_user_id, 'owner')
    RETURNING role INTO v_role;
  END IF;

  RETURN QUERY SELECT v_user_id, v_organization_id, v_organization_name, v_role::text;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_wallet_workspace(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_wallet_workspace(text) TO service_role;
