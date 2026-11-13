import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionProof, SESSION_COOKIE } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return { url: url.replace(/\/$/, ""), key };
}

async function workspaceContext() {
  const store = await cookies();
  const proof = decodeSessionProof(store.get(SESSION_COOKIE)?.value);
  if (!proof) return null;
  return ensureWorkspaceForWallet(proof.accountId);
}

async function db(path: string, init: RequestInit = {}) {
  const { url, key } = supabaseConfig();
  return fetch(`${url}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
}

export async function GET() {
  try {
    const workspace = await workspaceContext();
    if (!workspace) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const query = new URLSearchParams({
      select: "id,title,description,requirements,status,budget_amount,token_id,opens_at,closes_at,created_at,updated_at",
      organization_id: `eq.${workspace.organizationId}`,
      order: "created_at.desc",
      limit: "100",
    });
    const response = await db(`procurement_requests?${query.toString()}`);
    if (!response.ok) return NextResponse.json({ error: "Could not load procurement requests." }, { status: 502 });
    const requests = await response.json() as Array<Record<string, unknown> & { id: string }>;

    const ids = requests.map((request) => request.id);
    const bidCounts: Record<string, number> = {};
    if (ids.length) {
      const bidQuery = new URLSearchParams({
        select: "procurement_id",
        organization_id: `eq.${workspace.organizationId}`,
        procurement_id: `in.(${ids.join(",")})`,
        status: "eq.submitted",
      });
      const bidsResponse = await db(`bids?${bidQuery.toString()}`);
      if (bidsResponse.ok) {
        const bids = await bidsResponse.json() as Array<{ procurement_id: string }>;
        for (const bid of bids) bidCounts[bid.procurement_id] = (bidCounts[bid.procurement_id] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      workspace: { name: workspace.organizationName, role: workspace.role, accountId: workspace.nearAccountId },
      requests: requests.map((request) => ({ ...request, bid_count: bidCounts[request.id] ?? 0 })),
    });
  } catch (error) {
    console.error("Workspace requests GET failed:", error);
    return NextResponse.json({ error: "Unable to load the workspace right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await workspaceContext();
    if (!workspace) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const budget = body.budgetAmount === "" || body.budgetAmount == null ? null : String(body.budgetAmount).trim();
    const tokenId = typeof body.tokenId === "string" ? body.tokenId.trim().toUpperCase() : "NEAR";
    const requirements = Array.isArray(body.requirements)
      ? body.requirements.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 30)
      : [];

    if (title.length < 5 || title.length > 120) return NextResponse.json({ error: "Title must be between 5 and 120 characters." }, { status: 400 });
    if (description.length < 20 || description.length > 5000) return NextResponse.json({ error: "Description must be between 20 and 5,000 characters." }, { status: 400 });
    if (budget !== null && (!/^[0-9]{1,30}$/.test(budget) || /^0+$/.test(budget))) return NextResponse.json({ error: "Budget must be a positive whole number in the selected token's smallest unit." }, { status: 400 });
    if (!/^[A-Z0-9._-]{2,20}$/.test(tokenId)) return NextResponse.json({ error: "Enter a valid token symbol." }, { status: 400 });

    const userQuery = new URLSearchParams({ select: "id", near_account_id: `eq.${workspace.nearAccountId}`, limit: "1" });
    const userResponse = await db(`users?${userQuery.toString()}`);
    if (!userResponse.ok) return NextResponse.json({ error: "Could not verify workspace membership." }, { status: 502 });
    const users = await userResponse.json() as Array<{ id: string }>;
    const user = users[0];
    if (!user) return NextResponse.json({ error: "Workspace user was not found." }, { status: 403 });

    const insertResponse = await db("procurement_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: workspace.organizationId,
        created_by: user.id,
        title,
        description,
        requirements,
        status: "open",
        is_public: true,
        budget_amount: budget,
        token_id: tokenId,
        opens_at: new Date().toISOString(),
      }),
    });
    if (!insertResponse.ok) {
      const detail = await insertResponse.text();
      console.error("Procurement request insert failed:", detail);
      return NextResponse.json({ error: "The request could not be created." }, { status: 502 });
    }
    const created = (await insertResponse.json() as Array<Record<string, unknown>>)[0];
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    console.error("Workspace requests POST failed:", error);
    return NextResponse.json({ error: "Unable to create the request right now." }, { status: 500 });
  }
}
