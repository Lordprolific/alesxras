import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionProof, SESSION_COOKIE } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";
import { encryptBidValue } from "@/lib/bid-encryption";

export const dynamic = "force-dynamic";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return { url: url.replace(/\/$/, ""), key };
}

async function db(path: string, init: RequestInit = {}) {
  const { url, key } = config();
  return fetch(url + "/rest/v1/" + path, {
    ...init, cache: "no-store",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", ...init.headers },
  });
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const store = await cookies();
    const proof = decodeSessionProof(store.get(SESSION_COOKIE)?.value);
    if (!proof) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const workspace = await ensureWorkspaceForWallet(proof.accountId);
    const { id } = await context.params;
    if (!uuidPattern.test(id)) return NextResponse.json({ error: "Invalid procurement request." }, { status: 400 });

    const body = await request.json() as Record<string, unknown>;
    const amount = typeof body.amount === "string" ? body.amount.trim() : "";
    const proposal = typeof body.proposal === "string" ? body.proposal.trim() : "";
    if (!/^[0-9]{1,30}$/.test(amount) || /^0+$/.test(amount)) {
      return NextResponse.json({ error: "Enter a positive whole-number bid amount in the token's smallest unit." }, { status: 400 });
    }
    if (proposal.length < 30 || proposal.length > 5000) {
      return NextResponse.json({ error: "Your proposal must be between 30 and 5,000 characters." }, { status: 400 });
    }

    const requestQuery = new URLSearchParams({
      select: "id,organization_id,status,is_public,token_id,opens_at,closes_at",
      id: "eq." + id,
      is_public: "eq.true",
      status: "eq.open",
      limit: "1",
    });
    const requestResponse = await db("procurement_requests?" + requestQuery.toString());
    if (!requestResponse.ok) return NextResponse.json({ error: "Could not verify this request." }, { status: 502 });
    const requestRows = await requestResponse.json() as Array<{ id: string; organization_id: string; status: string; is_public: boolean; token_id: string; opens_at: string | null; closes_at: string | null }>;
    const procurement = requestRows[0];
    if (!procurement || procurement.organization_id === workspace.organizationId) {
      return NextResponse.json({ error: "This public request is not available for bidding." }, { status: 404 });
    }
    const now = Date.now();
    if ((procurement.opens_at && new Date(procurement.opens_at).getTime() > now) ||
        (procurement.closes_at && new Date(procurement.closes_at).getTime() <= now)) {
      return NextResponse.json({ error: "The bidding window for this request is closed." }, { status: 409 });
    }

    const userQuery = new URLSearchParams({ select: "id,display_name", near_account_id: "eq." + workspace.nearAccountId, limit: "1" });
    const userResponse = await db("users?" + userQuery.toString());
    if (!userResponse.ok) return NextResponse.json({ error: "Could not verify your supplier profile." }, { status: 502 });
    const users = await userResponse.json() as Array<{ id: string; display_name: string }>;
    const user = users[0];
    if (!user) return NextResponse.json({ error: "Your workspace profile is unavailable." }, { status: 403 });

    const supplierQuery = new URLSearchParams({
      select: "id,name",
      organization_id: "eq." + workspace.organizationId,
      near_account_id: "eq." + workspace.nearAccountId,
      limit: "1",
    });
    const supplierResponse = await db("suppliers?" + supplierQuery.toString());
    if (!supplierResponse.ok) return NextResponse.json({ error: "Could not load your supplier identity." }, { status: 502 });
    const supplierRows = await supplierResponse.json() as Array<{ id: string; name: string }>;
    let supplier = supplierRows[0];
    if (!supplier) {
      const createSupplier = await db("suppliers", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          organization_id: workspace.organizationId,
          name: user.display_name,
          near_account_id: workspace.nearAccountId,
          profile: {},
        }),
      });
      if (!createSupplier.ok) return NextResponse.json({ error: "Could not create your supplier profile." }, { status: 502 });
      supplier = (await createSupplier.json() as Array<{ id: string; name: string }>)[0];
    }
    if (!supplier) return NextResponse.json({ error: "Your supplier profile could not be created." }, { status: 502 });

    const existingQuery = new URLSearchParams({
      select: "id,status",
      organization_id: "eq." + procurement.organization_id,
      supplier_organization_id: "eq." + workspace.organizationId,
      procurement_id: "eq." + id,
      supplier_id: "eq." + supplier.id,
      limit: "1",
    });
    const existingResponse = await db("bids?" + existingQuery.toString());
    if (!existingResponse.ok) return NextResponse.json({ error: "Could not verify an existing proposal." }, { status: 502 });
    if ((await existingResponse.json() as unknown[]).length) {
      return NextResponse.json({ error: "Your workspace has already submitted a proposal for this request." }, { status: 409 });
    }

    const aad = "bid:" + id + ":" + workspace.organizationId;
    const encryptedAmount = encryptBidValue(amount, aad);
    const encryptedProposal = encryptBidValue(proposal, aad);
    const insert = await db("bids", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: procurement.organization_id,
        supplier_organization_id: workspace.organizationId,
        procurement_id: procurement.id,
        supplier_id: supplier.id,
        amount_ciphertext: encryptedAmount.ciphertext,
        amount_nonce: encryptedAmount.nonce,
        proposal_ciphertext: encryptedProposal.ciphertext,
        proposal_nonce: encryptedProposal.nonce,
        encryption_key_version: encryptedAmount.keyVersion,
        token_id: procurement.token_id,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      }),
    });
    if (!insert.ok) {
      const detail = await insert.text();
      console.error("Marketplace bid insert failed:", detail);
      if (detail.includes("bids_procurement_id_supplier_id_key")) {
        return NextResponse.json({ error: "Your workspace has already submitted a proposal for this request." }, { status: 409 });
      }
      return NextResponse.json({ error: "Your proposal could not be submitted." }, { status: 502 });
    }
    const created = (await insert.json() as Array<{ id: string; status: string; submitted_at: string }>)[0];
    return NextResponse.json({ bid: created }, { status: 201 });
  } catch (error) {
    console.error("Marketplace bid POST failed:", error);
    const message = error instanceof Error ? error.message : "";
    if (message.includes("BID_ENCRYPTION_KEY")) return NextResponse.json({ error: "Secure proposal storage is not configured for this preview." }, { status: 503 });
    return NextResponse.json({ error: "Unable to submit your proposal right now." }, { status: 500 });
  }
}
