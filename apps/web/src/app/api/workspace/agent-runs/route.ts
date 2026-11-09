import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSessionProof, SESSION_COOKIE } from "@/lib/auth";
import { ensureWorkspaceForWallet } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

type AgentKind = "evaluate_procurement" | "negotiate_bid" | "verify_transaction";
const allowedKinds = new Set<AgentKind>(["evaluate_procurement", "negotiate_bid", "verify_transaction"]);

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
      select: "id,procurement_id,kind,status,step_count,created_at,completed_at,result,error_message",
      organization_id: `eq.${workspace.organizationId}`,
      order: "created_at.desc",
      limit: "30",
    });
    const response = await db(`agent_runs?${query.toString()}`);
    if (!response.ok) {
      console.error("Agent runs GET failed:", await response.text());
      return NextResponse.json({ error: "Could not load agent activity." }, { status: 502 });
    }
    return NextResponse.json({ runs: await response.json() });
  } catch (error) {
    console.error("Agent runs GET failed:", error);
    return NextResponse.json({ error: "Unable to load agent activity right now." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const workspace = await workspaceContext();
    if (!workspace) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const kind = typeof body.kind === "string" ? body.kind as AgentKind : null;
    const procurementId = typeof body.procurementId === "string" ? body.procurementId : "";
    if (!kind || !allowedKinds.has(kind)) return NextResponse.json({ error: "Choose a supported agent workflow." }, { status: 400 });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(procurementId)) {
      return NextResponse.json({ error: "Choose a valid procurement request." }, { status: 400 });
    }

    const requestQuery = new URLSearchParams({
      select: "id,status",
      id: `eq.${procurementId}`,
      organization_id: `eq.${workspace.organizationId}`,
      limit: "1",
    });
    const procurementResponse = await db(`procurement_requests?${requestQuery.toString()}`);
    if (!procurementResponse.ok) return NextResponse.json({ error: "Could not verify the procurement request." }, { status: 502 });
    const procurementRows = await procurementResponse.json() as Array<{ id: string; status: string }>;
    const procurement = procurementRows[0];
    if (!procurement) return NextResponse.json({ error: "That request is not available in your workspace." }, { status: 404 });
    if (procurement.status === "cancelled" || procurement.status === "completed") {
      return NextResponse.json({ error: "Agent tasks cannot be started for a cancelled or completed request." }, { status: 409 });
    }
    if (kind === "verify_transaction" && !["approved", "executing"].includes(procurement.status)) {
      return NextResponse.json({ error: "Transaction verification is only available after a request has been approved." }, { status: 409 });
    }
    if (kind === "negotiate_bid" && !["evaluating", "negotiating", "awaiting_approval"].includes(procurement.status)) {
      return NextResponse.json({ error: "Negotiation can only be prepared while a request is being evaluated or negotiated." }, { status: 409 });
    }

    const digest = createHash("sha256").update(JSON.stringify({ kind, procurementId, organizationId: workspace.organizationId })).digest("hex");
    const insertResponse = await db("agent_runs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: workspace.organizationId,
        procurement_id: procurement.id,
        kind,
        status: "queued",
        input_digest: digest,
        provider: null,
        model: null,
      }),
    });
    if (!insertResponse.ok) {
      console.error("Agent run insert failed:", await insertResponse.text());
      return NextResponse.json({ error: "The agent task could not be recorded." }, { status: 502 });
    }
    const rows = await insertResponse.json() as Array<{ id: string; procurement_id: string; kind: AgentKind; status: string; step_count: number; created_at: string }>;
    const run = rows[0];
    if (!run) return NextResponse.json({ error: "The agent task was not returned after creation." }, { status: 502 });
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    console.error("Agent runs POST failed:", error);
    return NextResponse.json({ error: "Unable to record the agent task right now." }, { status: 500 });
  }
}
