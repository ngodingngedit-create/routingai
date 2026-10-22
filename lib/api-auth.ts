import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { withDbRetry } from "@/lib/tx";

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

export type ApiKeyWithUser = {
  id: string;
  name: string;
  status: string;
  rpmLimit: number;
  expiresAt: Date | null;
  userId: string;
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
    credits: Prisma.Decimal;
  };
};

export type AuthOutcome =
  | { ok: true; apiKey: ApiKeyWithUser }
  | { ok: false; response: Response };

export async function authenticateApiKey(request: Request): Promise<AuthOutcome> {
  const header = request.headers.get("authorization") ?? "";
  const raw = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!raw) {
    return {
      ok: false,
      response: jsonError(
        401,
        "missing_api_key",
        "Kunci API tidak ditemukan. Kirim header Authorization: Bearer sk-rly-...",
      ),
    };
  }

  const apiKey = await withDbRetry(() =>
    prisma.apiKey.findUnique({
      where: { keyHash: sha256(raw) },
      include: { user: true },
    }),
  );

  if (!apiKey) {
    return { ok: false, response: jsonError(401, "invalid_api_key", "Kunci API tidak dikenali.") };
  }
  if (apiKey.status !== "ACTIVE") {
    return {
      ok: false,
      response: jsonError(403, "key_revoked", "Kunci API ini sudah dicabut. Buat kunci baru di panel."),
    };
  }
  if (apiKey.expiresAt && apiKey.expiresAt.getTime() < Date.now()) {
    return { ok: false, response: jsonError(403, "key_expired", "Kunci API ini sudah kedaluwarsa.") };
  }
  if (apiKey.user.status !== "ACTIVE") {
    return {
      ok: false,
      response: jsonError(403, "account_suspended", "Akun ini sedang dinonaktifkan. Hubungi admin."),
    };
  }

  return { ok: true, apiKey: apiKey as unknown as ApiKeyWithUser };
}

/** Limit per menit per kunci, jendela tetap 60 detik di database. */
export async function consumeRateLimit(apiKeyId: string, rpmLimit: number): Promise<boolean> {
  const windowStart = new Date(Math.floor(Date.now() / 60000) * 60000);
  try {
    const row = await prisma.rateWindow.upsert({
      where: { apiKeyId_windowStart: { apiKeyId, windowStart } },
      create: { apiKeyId, windowStart, count: 1 },
      update: { count: { increment: 1 } },
    });
    return row.count <= rpmLimit;
  } catch {
    const row = await prisma.rateWindow.update({
      where: { apiKeyId_windowStart: { apiKeyId, windowStart } },
      data: { count: { increment: 1 } },
    });
    return row.count <= rpmLimit;
  }
}
