import { NextRequest, NextResponse } from "next/server";

const cookieName = "alesxras_testnet_session";
const lifetime = 4 * 60 * 60 * 1000;
const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
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

function decodeBase58(value: string) {
  const bytes = [0];
  for (const character of value) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Invalid public key");
    let carry = digit;
    for (let index = 0; index < bytes.length; index += 1) {
      carry += bytes[index] * 58;
      bytes[index] = carry & 255;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 255);
      carry >>= 8;
    }
  }
  for (const character of value) {
    if (character !== "1") break;
    bytes.push(0);
  }
  return Uint8Array.from(bytes.reverse());
}

function encodeString(value: string) {
  const bytes = encoder.encode(value);
  const length = new Uint8Array(4);
  new DataView(length.buffer).setUint32(0, bytes.length, true);
  return [length, bytes];
}

function serializeNep413(proof: SessionProof) {
  const tag = new Uint8Array(4);
  new DataView(tag.buffer).setUint32(0, 2147484061, true);
  const message = [
    "Alesxras testnet workspace access",
    `Issued: ${proof.issuedAt}`,
    `Expires: ${proof.expiresAt}`,
    `Nonce: ${proof.nonce}`,
    `Application: ${proof.recipient}`,
  ].join("\n");
  const nonce = decodeBase64Url(proof.nonce);
  if (nonce.length !== 32) throw new Error("Invalid nonce");
  return new Uint8Array([
    ...tag,
    ...encodeString(message).flatMap((part) => [...part]),
    ...nonce,
    ...encodeString(proof.recipient).flatMap((part) => [...part]),
    0,
  ]);
}

function parseProof(request: NextRequest): SessionProof | null {
  const value = request.cookies.get(cookieName)?.value;
  if (!value || value.length > 4096) return null;
  try {
    const proof: unknown = JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
    if (!proof || typeof proof !== "object") return null;
    const candidate = proof as SessionProof;
    if (!/^[a-z0-9._-]{2,64}$/.test(candidate.accountId)) return null;
    if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(candidate.publicKey)) return null;
    if (!/^[A-Za-z0-9+/]{80,88}={0,2}$/.test(candidate.signature)) return null;
    if (!/^[A-Za-z0-9_-]{43}$/.test(candidate.nonce)) return null;
    if (!Number.isSafeInteger(candidate.issuedAt) || !Number.isSafeInteger(candidate.expiresAt)) return null;
    if (candidate.issuedAt > Date.now() + 30_000 || candidate.expiresAt <= Date.now()) return null;
    if (candidate.expiresAt - candidate.issuedAt !== lifetime) return null;
    if (candidate.recipient !== request.nextUrl.host.toLowerCase()) return null;
    return candidate;
  } catch {
    return null;
  }
}

async function verifySession(proof: SessionProof) {
  try {
    const keyBytes = decodeBase58(proof.publicKey.slice("ed25519:".length));
    const signature = Uint8Array.from(atob(proof.signature), (character) => character.charCodeAt(0));
    if (keyBytes.length !== 32 || signature.length !== 64) return false;
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "Ed25519" }, false, ["verify"]);
    const payload = serializeNep413(proof);
    const digest = await crypto.subtle.digest("SHA-256", payload);
    if (!(await crypto.subtle.verify({ name: "Ed25519" }, key, signature, digest))) return false;

    const response = await fetch("https://rpc.testnet.near.org", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "alesxras-session-check",
        method: "query",
        params: { request_type: "view_access_key", finality: "final", account_id: proof.accountId, public_key: proof.publicKey },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return false;
    const result = await response.json() as { result?: { permission?: unknown }; error?: unknown };
    return result.result?.permission === "FullAccess";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const proof = parseProof(request);
  if (proof && await verifySession(proof)) return NextResponse.next();
  const destination = new URL("/launch?returnTo=%2Fworkspace", request.url);
  const response = NextResponse.redirect(destination, 307);
  response.cookies.delete(cookieName);
  return response;
}

export const config = { matcher: ["/workspace/:path*"] };
