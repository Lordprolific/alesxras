import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionProof, SESSION_COOKIE } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return { url: url.replace(/\/$/, ""), key };
}

async function db(path: string) {
  const { url, key } = config();
  return fetch(url + "/rest/v1/" + path, {
    cache: "no-store",
    headers: { apikey: key, Authorization: "Bearer " + key },
  });
}

export async function GET() {
  try {
    const store = await cookies();
    const proof = decodeSessionProof(store.get(SESSION_COOKIE)?.value);
    if (!proof) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const workspace = await ensureWorkspaceForWallet(proof.accountId);
    const query = new URLSearchParams({
      select: "id,organization_id,title,description,requirements,budget_amount,token_id,opens_at,closes_at,created_at",
      is_public: "eq.true",
      status: "eq.open",
      order: "created_at.desc",
      limit: "60",
    });
    const response = await db("procurement_requests?" + query.toString());
    if (!response.ok) return NextResponse.json({ error: "Could not load marketplace requests." }, { status: 502 });
    const rows = await response.json() as Array<Record<string, unknown> & { id: string; organization_id: string; opens_at: string | null; closes_at: string | null }>;
    const now = Date.now();
    const visible = rows.filter((row) =>
      row.organization_id !== workspace.organizationId &&
      (!row.opens_at || new Date(row.opens_at).getTime() <= now) &&
      (!row.closes_at || new Date(row.closes_at).getTime() > now)
    );
    const orgIds = [...new Set(visible.map((row) => row.organization_id))];
    let organizations: Array<{ id: string; name: string }> = [];
    if (orgIds.length) {
      const orgQuery = new URLSearchParams({ select: "id,name", id: "in.(" + orgIds.join(",") + ")" });
      const orgResponse = await db("organizations?" + orgQuery.toString());
      if (!orgResponse.ok) return NextResponse.json({ error: "Could not load buyer workspaces." }, { status: 502 });
      organizations = await orgResponse.json();
    }
    const names = new Map(organizations.map((item) => [item.id, item.name]));
    return NextResponse.json({
      requests: visible.map(({ organization_id, ...row }) => ({
        ...row,
        buyerOrganization: names.get(organization_id) || "Verified workspace",
      })),
    });
  } catch (error) {
    console.error("Marketplace GET failed:", error);
    return NextResponse.json({ error: "Unable to load the marketplace right now." }, { status: 500 });
  }
}
