import { createHmac, timingSafeEqual } from "node:crypto";
import { verifyFullKeyBelongsToUser, verifySignature } from "@near-wallet-selector/core";

export const SESSION_COOKIE = "alesxras_testnet_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 4;
export const TESTNET_NETWORK = {
  networkId: "testnet",
  nodeUrl: "https://rpc.testnet.near.org",
  helperUrl: "https://helper.testnet.near.org",
  explorerUrl: "https://testnet.nearblocks.io",
  indexerUrl: "https://testnet-api.kitwallet.app",
} as const;

export type SignedSessionProof = {
  accountId: string;
  publicKey: string;
  signature: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
  recipient: string;
};

export function createSessionMessage(proof: Pick<SignedSessionProof, "nonce" | "issuedAt" | "expiresAt" | "recipient">) {
  return [
    "Alesxras testnet workspace access",
    `Issued: ${proof.issuedAt}`,
    `Expires: ${proof.expiresAt}`,
    `Nonce: ${proof.nonce}`,
    `Application: ${proof.recipient}`,
  ].join("\n");
}

function isValidProofShape(proof: SignedSessionProof, now = Date.now()) {
  return Boolean(
    proof &&
    typeof proof === "object" &&
    /^[a-z0-9._-]{2,64}$/.test(proof.accountId) &&
    /^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(proof.publicKey) &&
    /^[A-Za-z0-9+/]{80,88}={0,2}$/.test(proof.signature) &&
    /^[A-Za-z0-9_-]{43}$/.test(proof.nonce) &&
    Number.isSafeInteger(proof.issuedAt) &&
    Number.isSafeInteger(proof.expiresAt) &&
    proof.issuedAt <= now + 30_000 &&
    proof.expiresAt > now &&
    proof.expiresAt - proof.issuedAt === SESSION_DURATION_SECONDS * 1000 &&
    /^[a-z0-9.-]+(?:\d{1,5})?$/.test(proof.recipient)
  );
}

export async function verifySessionProof(proof: SignedSessionProof, now = Date.now()) {
  if (!isValidProofShape(proof, now)) return false;

  let signatureIsValid = false;
  try {
    signatureIsValid = verifySignature({
      publicKey: proof.publicKey,
      signature: proof.signature,
      message: createSessionMessage(proof),
      nonce: Buffer.from(proof.nonce, "base64url"),
      recipient: proof.recipient,
    });
  } catch {
    return false;
  }
  if (!signatureIsValid) return false;

  try {
    return await verifyFullKeyBelongsToUser({
      accountId: proof.accountId,
      publicKey: proof.publicKey,
      network: TESTNET_NETWORK,
    });
  } catch {
    return false;
  }
}

// The wallet proof is checked against NEAR once at login. A server-only HMAC
// then protects the resulting short-lived cookie so page requests do not depend
// on another NEAR RPC call being available.
function sessionSigningKey() {
  const key = process.env.SESSION_SECRET || process.env.SUPABASE_SECRET_KEY;
  if (!key || key.length < 32) {
    throw new Error("Alesxras requires SESSION_SECRET or a sufficiently long SUPABASE_SECRET_KEY to sign sessions.");
  }
  return key;
}

function signSessionPayload(payload: string) {
  return createHmac("sha256", sessionSigningKey()).update(payload).digest("base64url");
}

export function encodeSessionProof(proof: SignedSessionProof) {
  const payload = Buffer.from(JSON.stringify(proof)).toString("base64url");
  return `${payload}.${signSessionPayload(payload)}`;
}

export function decodeSessionProof(value: string | undefined, now = Date.now()): SignedSessionProof | null {
  if (!value || value.length > 4096) return null;
  const [payload, suppliedSignature, extra] = value.split(".");
  if (!payload || !suppliedSignature || extra !== undefined) return null;

  try {
    const expected = Buffer.from(signSessionPayload(payload), "base64url");
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;

    const proof: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!proof || typeof proof !== "object" || !isValidProofShape(proof as SignedSessionProof, now)) return null;
    return proof as SignedSessionProof;
  } catch {
    return null;
  }
}
