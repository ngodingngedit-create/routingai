import type { UrlTarget } from "@/lib/db-target";

export type DeployWarning = {
  code: string;
  message: string;
};

export type DeployCheckInput = {
  authUrl: string | undefined;
  runtimeTarget: UrlTarget | null;
  migrationTarget: UrlTarget | null;
  sameTarget: boolean | null;
  requestHost?: string;
};

function isLocalHost(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0" || host === "::1";
  } catch {
    return false;
  }
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isLocalRequest(requestHost?: string): boolean {
  if (!requestHost) return false;
  return (
    requestHost === "localhost" ||
    requestHost.startsWith("localhost:") ||
    requestHost.startsWith("127.0.0.1:") ||
    requestHost.startsWith("127.0.0.1")
  );
}

/**
 * Peringatan konfigurasi deployment yang bikin login atau migrasi gagal.
 * Semua Rules hanya membaca nilai yang tidak rahasia.
 */
export function collectDeployWarnings(input: DeployCheckInput): DeployWarning[] {
  const warnings: DeployWarning[] = [];

  if (!input.authUrl) {
    warnings.push({
      code: "auth_url_missing",
      message: "BETTER_AUTH_URL belum diisi, callback OAuth tidak punya tujuan yang valid.",
    });
  } else if (isLocalHost(input.authUrl) && !isLocalRequest(input.requestHost)) {
    warnings.push({
      code: "auth_url_localhost",
      message:
        "BETTER_AUTH_URL masih menunjuk localhost, OAuth akan mengarahkan user balik ke komputer sendiri dan login produksi tidak akan selesai.",
    });
  } else {
    const authHost = hostOf(input.authUrl);
    const requestHost = input.requestHost?.split(":")[0];
    // Host *.vercel.app dipakai oleh preview deployment, jadi beda host di sana wajar.
    if (
      authHost &&
      requestHost &&
      requestHost !== authHost &&
      !requestHost.endsWith(".vercel.app") &&
      !isLocalRequest(input.requestHost)
    ) {
      warnings.push({
        code: "auth_url_mismatch",
        message: `BETTER_AUTH_URL (${authHost}) tidak sama dengan domain yang dipakai untuk request (${requestHost}).`,
      });
    }
  }

  if (input.sameTarget === false) {
    warnings.push({
      code: "targets_mismatch",
      message:
        "DIRECT_URL dan DATABASE_URL menunjuk database berbeda, migrasi di build akan masuk ke database yang tidak dipakai runtime.",
    });
  }

  if (
    input.runtimeTarget &&
    input.runtimeTarget.host.includes("db.prisma.io") &&
    input.runtimeTarget.params.pgbouncer !== "true"
  ) {
    warnings.push({
      code: "pooler_params_missing",
      message:
        "DATABASE_URL untuk Prisma Postgres butuh pgbouncer=true dan connection_limit=1, tanpa itu tiap instance serverless membuka koneksi sendiri.",
    });
  }

  if (input.runtimeTarget && !input.migrationTarget) {
    warnings.push({
      code: "direct_url_missing",
      message:
        "DIRECT_URL belum diisi, prisma migrate deploy di build akan memakai pooler dan bisa gagal.",
    });
  }

  return warnings;
}
