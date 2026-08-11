import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// The Google refresh token grants write access to Maria's calendar, so it is
// stored AES-256-GCM encrypted; the key lives only in the environment.
// Stored format: iv:authTag:ciphertext (hex).

function key(): Buffer {
  const hex = process.env.GCAL_TOKEN_KEY ?? "";
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error("GCAL_TOKEN_KEY must be 64 hex chars (openssl rand -hex 32)");
  }
  return Buffer.from(hex, "hex");
}

export function hasTokenKey(): boolean {
  return /^[0-9a-fA-F]{64}$/.test(process.env.GCAL_TOKEN_KEY ?? "");
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((buf) => buf.toString("hex"))
    .join(":");
}

export function decryptToken(stored: string): string {
  const [iv, tag, data] = stored.split(":").map((h) => Buffer.from(h, "hex"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
