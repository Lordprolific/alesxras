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

const allowedIcons = new Set(["spark", "orbit", "diamond", "sun", "flower", "leaf", "moon", "wave"]);

export async function GET() {
  try {
    const workspace = await workspaceContext();
    if (!workspace) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const query = new URLSearchParams({
      select: "near_account_id,display_name,avatar_icon",
      id: `eq.${workspace.userId}`,
      limit: "1",
    });
    const response = await db(`users?${query.toString()}`);
    if (!response.ok) {
      console.error("Workspace profile GET failed:", await response.text());
      return NextResponse.json({ error: "Could not load your profile." }, { status: 502 });
    }
    const rows = await response.json() as Array<{ near_account_id: string; display_name: string; avatar_icon: string }>;
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "Workspace user was not found." }, { status: 404 });
    return NextResponse.json({
      profile: {
        accountId: user.near_account_id,
        displayName: user.display_name,
        avatarIcon: user.avatar_icon,
      },
    });
  } catch (error) {
    console.error("Workspace profile GET failed:", error);
    return NextResponse.json({ error: "Unable to load your profile right now." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const workspace = await workspaceContext();
    if (!workspace) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const body = await request.json() as Record<string, unknown>;
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    const avatarIcon = typeof body.avatarIcon === "string" ? body.avatarIcon : "";

    if (displayName.length < 2 || displayName.length > 40) {
      return NextResponse.json({ error: "Your name must be between 2 and 40 characters." }, { status: 400 });
    }
    if (/[\u0000-\u001f\u007f]/.test(displayName)) {
      return NextResponse.json({ error: "Your name contains unsupported characters." }, { status: 400 });
    }
    if (!allowedIcons.has(avatarIcon)) {
      return NextResponse.json({ error: "Choose one of the available profile icons." }, { status: 400 });
    }

    const query = new URLSearchParams({ id: `eq.${workspace.userId}` });
    const response = await db(`users?${query.toString()}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ display_name: displayName, avatar_icon: avatarIcon }),
    });
    if (!response.ok) {
      console.error("Workspace profile update failed:", await response.text());
      return NextResponse.json({ error: "Your profile could not be saved." }, { status: 502 });
    }
    const rows = await response.json() as Array<{ near_account_id: string; display_name: string; avatar_icon: string }>;
    const user = rows[0];
    if (!user) return NextResponse.json({ error: "Your profile could not be found." }, { status: 404 });
    return NextResponse.json({
      profile: {
        accountId: user.near_account_id,
        displayName: user.display_name,
        avatarIcon: user.avatar_icon,
      },
    });
  } catch (error) {
    console.error("Workspace profile PUT failed:", error);
    return NextResponse.json({ error: "Unable to save your profile right now." }, { status: 500 });
  }
}
