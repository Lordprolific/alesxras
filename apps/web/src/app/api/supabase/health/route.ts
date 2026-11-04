import { NextResponse } from "next/server";
import { checkSupabaseConnection } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkSupabaseConnection();
    return NextResponse.json({ connected: true, provider: "supabase" });
  } catch {
    return NextResponse.json({ connected: false, provider: "supabase" }, { status: 503 });
  }
}
