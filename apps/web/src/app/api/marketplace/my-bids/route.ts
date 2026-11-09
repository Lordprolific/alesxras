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
  return fetch(url + "/rest/v1/" + path, { cache: "no-store", headers: { apikey: key, Authorization: "Bearer " + key } });
}

export async function GET() {
  try {
    const store = await cookies();
    const proof = decodeSessionProof(store.get(SESSION_COOKIE)?.value);
    if (!proof) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const workspace = await ensureWorkspaceForWallet(proof.accountId);
    const query = new URLSearchParams({
      select: "id,organization_id,procurement_id,status,submitted_at,token_id",
      supplier_organization_id: "eq." + workspace.organizationId,
      order: "submitted_at.desc",
      limit: "100",
    });
    const response = await db("bids?" + query.toString());
    if (!response.ok) return NextResponse.json({ error: "Could not load your submitted proposals." }, { status: 502 });
    const bids = await response.json() as Array<{ id: string; organization_id: string; procurement_id: string; status: string; submitted_at: string | null; token_id: string }>;
    const requestIds = [...new Set(bids.map((bid) => bid.procurement_id))];
    const buyerIds = [...new Set(bids.map((bid) => bid.organization_id))];
    const [requestResponse, orgResponse] = await Promise.all([
      requestIds.length ? db("procurement_requests?" + new URLSearchParams({ select: "id,title,closes_at", id: "in.(" + requestIds.join(",") + ")" }).toString()) : null,
      buyerIds.length ? db("organizations?" + new URLSearchParams({ select: "id,name", id: "in.(" + buyerIds.join(",") + ")" }).toString()) : null,
    ]);
    if ((requestResponse && !requestResponse.ok) || (orgResponse && !orgResponse.ok)) {
      return NextResponse.json({ error: "Could not load proposal context." }, { status: 502 });
    }
    const requests = requestResponse ? await requestResponse.json() as Array<{ id: string; title: string; closes_at: string | null }> : [];
    const organizations = orgResponse ? await orgResponse.json() as Array<{ id: string; name: string }> : [];
    const requestMap = new Map(requests.map((item) => [item.id, item]));
    const orgMap = new Map(organizations.map((item) => [item.id, item.name]));
    return NextResponse.json({
      bids: bids.map((bid) => ({
        id: bid.id,
        procurementId: bid.procurement_id,
        buyerOrganizationId: bid.organization_id,
        status: bid.status,
        submittedAt: bid.submitted_at,
        tokenId: bid.token_id,
        requestTitle: requestMap.get(bid.procurement_id)?.title || "Procurement request",
        buyerWorkspace: orgMap.get(bid.organization_id) || "Buyer workspace",
        closesAt: requestMap.get(bid.procurement_id)?.closes_at || null,
      })),
    });
  } catch (error) {
    console.error("My bids GET failed:", error);
    return NextResponse.json({ error: "Unable to load your proposals right now." }, { status: 500 });
  }
}
