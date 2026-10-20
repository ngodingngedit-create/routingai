import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type GeneratedApiKey = {
  raw: string;
  hash: string;
  prefix: string;
  last4: string;
};

export function generateApiKey(): GeneratedApiKey {
  const raw = `sk-rly-${randomBytes(24).toString("base64url")}`;
  return {
    raw,
    hash: sha256(raw),
    prefix: raw.slice(0, 11),
    last4: raw.slice(-4),
  };
}

function encryptionKey(): Buffer {
  const raw = env.encryptionKey.trim();
  if (!raw) throw new Error("APP_ENCRYPTION_KEY belum diisi, kredensial provider tidak bisa disimpan");
  const fromHex = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : null;
  return fromHex ?? createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const buf = Buffer.from(payload, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function maskKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return "****";
  return `****${trimmed.slice(-4)}`;
}
