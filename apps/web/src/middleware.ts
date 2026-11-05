import { NextRequest, NextResponse } from "next/server";

const cookieName = "alesxras_testnet_session";
const lifetime = 4 * 60 * 60 * 1000;
const encoder = new TextEncoder();

type SessionProof = {
  accountId: string;
  publicKey: string;
  signature: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  recipient: string;
};

function decodeBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isValidProof(proof: unknown, host: string): proof is SessionProof {
  if (!proof || typeof proof !== "object") return false;
  const candidate = proof as SessionProof;
  const now = Date.now();
  return (
    /^[a-z0-9._-]{2,64}$/.test(candidate.accountId) &&
    /^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(candidate.publicKey) &&
    /^[A-Za-z0-9+/]{80,88}={0,2}$/.test(candidate.signature) &&
    /^[A-Za-z0-9_-]{43}$/.test(candidate.nonce) &&
    Number.isSafeInteger(candidate.issuedAt) &&
    Number.isSafeInteger(candidate.expiresAt) &&
    candidate.issuedAt <= now + 30_000 &&
    candidate.expiresAt > now &&
    candidate.expiresAt - candidate.issuedAt === lifetime &&
    /^[a-z0-9.-]+(?::\\d{1,5})?$/.test(candidate.recipient) &&
    candidate.recipient === host
  );
}

async function parseSignedSession(request: NextRequest): Promise<SessionProof | null> {
  const value = request.cookies.get(cookieName)?.value;
  if (!value || value.length > 4096) return null;
  const [payload, suppliedSignature, extra] = value.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return null;

  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret || secret.length < 32) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = decodeBase64Url(suppliedSignature);
    const valid = await crypto.subtle.verify("HMAC", key, signature, encoder.encode(payload));
    if (!valid) return null;

    const proof: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    return isValidProof(proof, request.nextUrl.host.toLowerCase()) ? proof : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const proof = await parseSignedSession(request);
  if (proof) return NextResponse.next();

  const destination = new URL("/launch?returnTo=%2Fworkspace", request.url);
  const response = NextResponse.redirect(destination, 307);
  response.cookies.delete(cookieName);
  return response;
}

export const config = { matcher: ["/workspace/:path*"] };
