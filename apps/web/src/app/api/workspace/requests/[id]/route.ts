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
  return fetch(`${url}/rest/v1/${path}`, {
    cache: "no-store",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const store = await cookies();
    const proof = decodeSessionProof(store.get(SESSION_COOKIE)?.value);
    if (!proof) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const workspace = await ensureWorkspaceForWallet(proof.accountId);
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid request identifier." }, { status: 400 });
    }

    const requestQuery = new URLSearchParams({
      select: "id,title,description,requirements,status,budget_amount,token_id,opens_at,closes_at,created_at,updated_at,created_by",
      id: `eq.${id}`,
      organization_id: `eq.${workspace.organizationId}`,
      limit: "1",
    });
    const requestResponse = await db(`procurement_requests?${requestQuery}`);
    if (!requestResponse.ok) return NextResponse.json({ error: "Could not load this procurement request." }, { status: 502 });
    const records = await requestResponse.json() as Array<Record<string, unknown> & { id: string }>;
    const record = records[0];
    if (!record) return NextResponse.json({ error: "Request not found in this workspace." }, { status: 404 });

    const bidQuery = new URLSearchParams({
      select: "id,supplier_id,status,submitted_at,token_id",
      organization_id: `eq.${workspace.organizationId}`,
      procurement_id: `eq.${id}`,
      order: "submitted_at.desc",
    });
    const bidsResponse = await db(`bids?${bidQuery}`);
    if (!bidsResponse.ok) return NextResponse.json({ error: "Could not load supplier proposal records." }, { status: 502 });
    const bids = await bidsResponse.json() as Array<{ id: string; supplier_id: string; status: string; submitted_at: string | null; token_id: string | null }>;
    const supplierIds = [...new Set(bids.map((bid) => bid.supplier_id).filter(Boolean))];
    let suppliers: Array<{ id: string; name: string; near_account_id: string | null }> = [];
    if (supplierIds.length) {
      const supplierQuery = new URLSearchParams({
        select: "id,name,near_account_id",
        organization_id: `eq.${workspace.organizationId}`,
        id: `in.(${supplierIds.join(",")})`,
      });
      const supplierResponse = await db(`suppliers?${supplierQuery}`);
      if (!supplierResponse.ok) return NextResponse.json({ error: "Could not load supplier identities." }, { status: 502 });
      suppliers = await supplierResponse.json();
    }
    const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
    return NextResponse.json({
      request: record,
      proposals: bids.map((bid) => ({
        id: bid.id,
        status: bid.status,
        submittedAt: bid.submitted_at,
        tokenId: bid.token_id,
        supplier: supplierMap.get(bid.supplier_id) ? {
          name: supplierMap.get(bid.supplier_id)!.name,
          accountId: supplierMap.get(bid.supplier_id)!.near_account_id,
        } : { name: "Verified supplier record unavailable", accountId: null },
        contentEncrypted: true,
        amountEncrypted: true,
      })),
      review: { canApprove: false, reason: "Approval is unavailable until proposal decryption, spend-policy validation and recipient verification are connected." },
    });
  } catch (error) {
    console.error("Workspace request detail failed:", error);
    return NextResponse.json({ error: "Unable to load this request right now." }, { status: 500 });
  }
}
