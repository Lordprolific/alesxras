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
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url");
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function isValidProof(value: unknown, host: string): value is SessionProof {
  if (!value || typeof value !== "object") return false;
  const proof = value as SessionProof;
  const now = Date.now();
  return (
    /^[a-z0-9._-]{2,64}$/.test(proof.accountId) &&
    /^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(proof.publicKey) &&
    /^[A-Za-z0-9+/]{80,88}={0,2}$/.test(proof.signature) &&
    /^[A-Za-z0-9_-]{43}$/.test(proof.nonce) &&
    Number.isSafeInteger(proof.issuedAt) &&
    Number.isSafeInteger(proof.expiresAt) &&
    proof.issuedAt <= now + 30_000 &&
    proof.expiresAt > now &&
    proof.expiresAt - proof.issuedAt === lifetime &&
    typeof proof.recipient === "string" &&
    proof.recipient === host
  );
}

async function verifySignedCookie(value: string | undefined, host: string) {
  if (!value || value.length > 4096) return false;
  const [payload, suppliedSignature, extra] = value.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return false;

  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!secret || secret.length < 32) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = decodeBase64Url(suppliedSignature);
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(payload),
    );
    if (!validSignature) return false;

    const proof: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(payload)));
    return isValidProof(proof, host);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const host = request.nextUrl.host.toLowerCase();
  const cookie = request.cookies.get(cookieName)?.value;
  if (await verifySignedCookie(cookie, host)) return NextResponse.next();

  const destination = new URL("/launch?returnTo=%2Fworkspace", request.url);
  const response = NextResponse.redirect(destination, 307);
  response.cookies.delete(cookieName);
  return response;
}

export const config = { matcher: ["/workspace/:path*"] };
