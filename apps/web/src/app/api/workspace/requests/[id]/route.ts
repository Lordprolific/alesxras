import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionProof, SESSION_COOKIE } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";
import { decryptBidValue } from "@/lib/bid-encryption";

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
      select: "id,title,description,requirements,status,budget_amount,token_id,opens_at,closes_at,created_at,updated_at,created_by,is_public",
      id: "eq." + id,
      organization_id: "eq." + workspace.organizationId,
      limit: "1",
    });
    const requestResponse = await db("procurement_requests?" + requestQuery.toString());
    if (!requestResponse.ok) return NextResponse.json({ error: "Could not load this procurement request." }, { status: 502 });
    const records = await requestResponse.json() as Array<Record<string, unknown> & { id: string }>;
    const record = records[0];
    if (!record) return NextResponse.json({ error: "Request not found in this workspace." }, { status: 404 });

    const bidQuery = new URLSearchParams({
      select: "id,supplier_id,supplier_organization_id,status,submitted_at,token_id,amount_ciphertext,amount_nonce,proposal_ciphertext,proposal_nonce,encryption_key_version",
      organization_id: "eq." + workspace.organizationId,
      procurement_id: "eq." + id,
      order: "submitted_at.desc",
    });
    const bidsResponse = await db("bids?" + bidQuery.toString());
    if (!bidsResponse.ok) return NextResponse.json({ error: "Could not load supplier proposal records." }, { status: 502 });
    const bids = await bidsResponse.json() as Array<{
      id: string; supplier_id: string; supplier_organization_id: string; status: string;
      submitted_at: string | null; token_id: string | null; amount_ciphertext: string;
      amount_nonce: string; proposal_ciphertext: string; proposal_nonce: string;
      encryption_key_version: string;
    }>;
    const supplierIds = [...new Set(bids.map((bid) => bid.supplier_id))];
    const supplierOrgIds = [...new Set(bids.map((bid) => bid.supplier_organization_id))];
    let suppliers: Array<{ id: string; organization_id: string; name: string; near_account_id: string | null }> = [];
    if (supplierIds.length && supplierOrgIds.length) {
      const supplierQuery = new URLSearchParams({
        select: "id,organization_id,name,near_account_id",
        organization_id: "in.(" + supplierOrgIds.join(",") + ")",
        id: "in.(" + supplierIds.join(",") + ")",
      });
      const supplierResponse = await db("suppliers?" + supplierQuery.toString());
      if (!supplierResponse.ok) return NextResponse.json({ error: "Could not load supplier identities." }, { status: 502 });
      suppliers = await supplierResponse.json();
    }
    const supplierMap = new Map(suppliers.map((supplier) => [supplier.organization_id + ":" + supplier.id, supplier]));
    const proposals = bids.map((bid) => {
      let amount: string | null = null;
      let proposal: string | null = null;
      try {
        const aad = "bid:" + id + ":" + bid.supplier_organization_id;
        amount = decryptBidValue(bid.amount_ciphertext, bid.amount_nonce, aad);
        proposal = decryptBidValue(bid.proposal_ciphertext, bid.proposal_nonce, aad);
      } catch (error) {
        console.error("Bid decryption unavailable for record " + bid.id, error);
      }
      const supplier = supplierMap.get(bid.supplier_organization_id + ":" + bid.supplier_id);
      return {
        id: bid.id,
        status: bid.status,
        submittedAt: bid.submitted_at,
        tokenId: bid.token_id,
        amount,
        proposal,
        contentEncrypted: proposal === null,
        amountEncrypted: amount === null,
        supplier: supplier ? { name: supplier.name, accountId: supplier.near_account_id } : { name: "Verified supplier record unavailable", accountId: null },
      };
    });
    return NextResponse.json({
      request: record,
      proposals,
      review: {
        canApprove: false,
        reason: "Proposal contents are now available for buyer review. Approval remains disabled until spending-policy validation, recipient verification and the human approval workflow are connected.",
      },
    });
  } catch (error) {
    console.error("Workspace request detail failed:", error);
    return NextResponse.json({ error: "Unable to load this request right now." }, { status: 500 });
  }
}
