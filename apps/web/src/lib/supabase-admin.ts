import "server-only";

const projectUrl = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

function config() {
  if (!projectUrl || !secretKey) throw new Error("Supabase server configuration is incomplete.");
  return { url: projectUrl.replace(/\/$/, ""), key: secretKey };
}

/** Called only after the NEAR wallet proof has been verified on the server. */
export async function ensureWorkspaceForWallet(nearAccountId: string) {
  if (!/^[a-z0-9._-]{2,64}$/.test(nearAccountId)) throw new Error("Invalid verified NEAR account.");
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/rpc/ensure_wallet_workspace`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_near_account_id: nearAccountId }),
  });
  if (!response.ok) throw new Error(`Supabase workspace provisioning failed (${response.status}).`);
  const result = await response.json() as Array<{
    user_id: string;
    organization_id: string;
    organization_name: string;
    member_role: string;
  }>;
  const workspace = result[0];
  if (!workspace) throw new Error("Supabase did not return a workspace.");
  return {
    userId: workspace.user_id,
    organizationId: workspace.organization_id,
    organizationName: workspace.organization_name,
    role: workspace.member_role,
    nearAccountId,
  };
}

export async function checkSupabaseConnection() {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/organizations?select=id&limit=1`, {
    cache: "no-store",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Supabase connectivity check failed (${response.status}).`);
  return true;
}
