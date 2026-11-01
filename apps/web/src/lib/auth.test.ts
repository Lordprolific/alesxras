import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { serializeNep413, verifySignature } from "@near-wallet-selector/core";
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, createSessionMessage, encodeSessionProof, verifySessionProof, type SignedSessionProof } from "./auth";
import { middleware } from "../middleware";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function encodeBase58(bytes: Uint8Array) {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let value = BigInt(`0x${Buffer.from(bytes).toString("hex")}`);
  let encoded = "";
  while (value > BigInt(0)) {
    const remainder = Number(value % BigInt(58));
    value /= BigInt(58);
    encoded = alphabet[remainder] + encoded;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return encoded || "1";
}

function signedProof(now = Date.now()): SignedSessionProof {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const rawPublicKey = new Uint8Array(publicKey.export({ format: "der", type: "spki" }).subarray(-32));
  const accountId = "alesxras-demo.testnet";
  const nonce = Buffer.from("a".repeat(32)).toString("base64url");
  const issuedAt = now;
  const expiresAt = issuedAt + SESSION_DURATION_SECONDS * 1000;
  const recipient = "localhost:3000";
  const message = createSessionMessage({ nonce, issuedAt, expiresAt, recipient });
  const payload = serializeNep413({ message, recipient, nonce: Buffer.from(nonce, "base64url") });
  const signature = sign(null, createHash("sha256").update(payload).digest(), privateKey).toString("base64");
  return { accountId, publicKey: `ed25519:${encodeBase58(rawPublicKey)}`, signature, nonce, issuedAt, expiresAt, recipient };
}

test("server accepts a valid NEP-413 signature only when the key is full-access on testnet", async () => {
  let rpcCalls = 0;
  globalThis.fetch = async () => { rpcCalls += 1; return Response.json({ jsonrpc: "2.0", id: 123, result: { nonce: 1, permission: "FullAccess" } }); };
  const proof = signedProof();
  assert.equal(verifySignature({ publicKey: proof.publicKey, signature: proof.signature, message: createSessionMessage(proof), nonce: Buffer.from(proof.nonce, "base64url"), recipient: proof.recipient }), true);
  const verified = await verifySessionProof(proof);
  assert.equal(rpcCalls, 1);
  assert.equal(verified, true);
});

test("server rejects a restricted on-chain key", async () => {
  globalThis.fetch = async () => Response.json({ jsonrpc: "2.0", result: { nonce: 1, permission: { FunctionCall: { receiver_id: "app.testnet", method_names: [] } } } });
  assert.equal(await verifySessionProof(signedProof()), false);
});

test("server rejects expired signatures before querying NEAR", async () => {
  let queried = false;
  globalThis.fetch = async () => { queried = true; return Response.json({ result: { permission: "FullAccess" } }); };
  const proof = signedProof(Date.now() - SESSION_DURATION_SECONDS * 1000 - 1);
  assert.equal(await verifySessionProof(proof), false);
  assert.equal(queried, false);
});

test("server rejects a modified login message signature", async () => {
  let queried = false;
  globalThis.fetch = async () => { queried = true; return Response.json({ result: { permission: "FullAccess" } }); };
  const proof = signedProof();
  proof.recipient = "attacker.example";
  assert.equal(await verifySessionProof(proof), false);
  assert.equal(queried, false);
});

test("request middleware admits a verified wallet session and rejects an absent one before rendering", async () => {
  globalThis.fetch = async () => Response.json({ jsonrpc: "2.0", result: { nonce: 1, permission: "FullAccess" } });
  const proof = signedProof();
  const admitted = await middleware(new NextRequest("https://localhost:3000/workspace", {
    headers: { cookie: `${SESSION_COOKIE}=${encodeSessionProof(proof)}` },
  }));
  assert.equal(admitted.headers.get("x-middleware-next"), "1");

  const rejected = await middleware(new NextRequest("https://localhost:3000/workspace"));
  assert.equal(rejected.status, 307);
  assert.equal(rejected.headers.get("location"), "https://localhost:3000/launch?returnTo=%2Fworkspace");
});
