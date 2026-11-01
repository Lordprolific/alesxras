import { NextRequest, NextResponse } from "next/server";
import { decodeSessionProof, encodeSessionProof, SESSION_COOKIE, SESSION_DURATION_SECONDS, verifySessionProof, type SignedSessionProof } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const proof = decodeSessionProof(request.cookies.get(SESSION_COOKIE)?.value);
  if (!proof || !(await verifySessionProof(proof))) {
    const response = NextResponse.json({ authenticated: false }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  return NextResponse.json({ authenticated: true, accountId: proof.accountId, network: "testnet" });
}

export async function POST(request: NextRequest) {
  let proof: SignedSessionProof;
  try {
    proof = await request.json() as SignedSessionProof;
  } catch {
    return NextResponse.json({ error: "A valid wallet signature is required." }, { status: 400 });
  }

  const host = request.nextUrl.host.toLowerCase();
  if (
    !proof ||
    typeof proof !== "object" ||
    typeof proof.recipient !== "string" ||
    proof.recipient !== host ||
    !(await verifySessionProof(proof))
  ) {
    return NextResponse.json({ error: "The testnet wallet proof could not be verified." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true, accountId: proof.accountId, network: "testnet" });
  response.cookies.set(SESSION_COOKIE, encodeSessionProof(proof), {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
