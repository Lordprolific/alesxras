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

export async function verifySessionProof(proof: SignedSessionProof, now = Date.now()) {
  if (!proof || typeof proof !== "object") return false;
  if (!/^[a-z0-9._-]{2,64}$/.test(proof.accountId)) return false;
  if (!/^ed25519:[1-9A-HJ-NP-Za-km-z]{40,50}$/.test(proof.publicKey)) return false;
  if (!/^[A-Za-z0-9+/]{80,88}={0,2}$/.test(proof.signature)) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(proof.nonce)) return false;
  if (!Number.isSafeInteger(proof.issuedAt) || !Number.isSafeInteger(proof.expiresAt)) return false;
  if (proof.issuedAt > now + 30_000 || proof.expiresAt <= now) return false;
  if (proof.expiresAt - proof.issuedAt !== SESSION_DURATION_SECONDS * 1000) return false;
  if (!/^[a-z0-9.-]+(?::\d{1,5})?$/.test(proof.recipient)) return false;

  const message = createSessionMessage(proof);
  let signatureIsValid = false;
  try {
    signatureIsValid = verifySignature({
      publicKey: proof.publicKey,
      signature: proof.signature,
      message,
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

export function encodeSessionProof(proof: SignedSessionProof) {
  return Buffer.from(JSON.stringify(proof)).toString("base64url");
}

export function decodeSessionProof(value: string | undefined): SignedSessionProof | null {
  if (!value || value.length > 4096) return null;
  try {
    const proof: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return proof as SignedSessionProof;
  } catch {
    return null;
  }
}
