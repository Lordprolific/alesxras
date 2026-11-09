import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_VERSION = "aes-256-gcm-v1";

function encryptionKey() {
  const value = process.env.BID_ENCRYPTION_KEY || "";
  if (!/^[0-9a-f]{64}$/i.test(value)) throw new Error("BID_ENCRYPTION_KEY must be a 32-byte hexadecimal key.");
  return Buffer.from(value, "hex");
}

function decodeBytea(value: string) {
  // PostgreSQL bytea values are serialized by PostgREST as \x followed by hex.
  const hex = value.replace(/^\\x/i, "");
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) {
    throw new Error("Encrypted bid payload is malformed.");
  }
  return Buffer.from(hex, "hex");
}

export function encryptBidValue(value: string, associatedData: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final(), cipher.getAuthTag()]);
  return {
    ciphertext: "\\x" + encrypted.toString("hex"),
    nonce: "\\x" + nonce.toString("hex"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptBidValue(ciphertextValue: string, nonceValue: string, associatedData: string) {
  const ciphertext = decodeBytea(ciphertextValue);
  const nonce = decodeBytea(nonceValue);
  if (nonce.length !== 12 || ciphertext.length < 17) throw new Error("Encrypted bid payload is malformed.");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const encrypted = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), nonce);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
