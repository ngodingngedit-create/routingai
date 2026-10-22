export type UrlTarget = {
  host: string;
  project: string;
  database: string;
  port: string;
  user: string;
  params: Record<string, string>;
};

/** Param URL yang aman ditampilkan. Kredensial tidak pernah ikut. */
const SAFE_PARAMS = ["sslmode", "pgbouncer", "connection_limit", "schema", "application_name"];

/** Host pooler Neon punya suffix -pooler, host direct tidak. Keduanya satu project yang sama. */
export function normalizeHost(host: string): string {
  return host.replace(/-pooler(?=\.|$)/, "");
}

export function describeUrl(value: string | undefined | null): UrlTarget | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const params: Record<string, string> = {};
    for (const key of SAFE_PARAMS) {
      const found = url.searchParams.get(key);
      if (found) params[key] = found;
    }
    return {
      host: url.hostname,
      project: normalizeHost(url.hostname),
      database: url.pathname.replace(/^\//, "") || "postgres",
      port: url.port || "5432",
      user: url.username ? decodeURIComponent(url.username) : "",
      params,
    };
  } catch {
    return null;
  }
}

/** True kalau kedua URL menunjuk project dan database yang sama. Null kalau salah satu URL tidak ada. */
export function isSameTarget(
  runtime: UrlTarget | null,
  migration: UrlTarget | null,
): boolean | null {
  if (!runtime || !migration) return null;
  return runtime.project === migration.project && runtime.database === migration.database;
}

/** Default 20 detik, cukup untuk Prisma Postgres yang lagi bangun dari mode suspend. */
export const DEFAULT_CONNECT_TIMEOUT_SECONDS = 20;

/** Batas menunggu koneksi dari pool Prisma, defaultnya hanya 10 detik. */
export const DEFAULT_POOL_TIMEOUT_SECONDS = 30;

/**
 * Menambah connect_timeout dan pool_timeout ke connection string kalau belum ada.
 *
 * Prisma Postgres suspend compute saat idle, jadi koneksi pertama bisa melewati
 * batas 10 detik default Prisma lalu gagal dengan "Can't reach database server".
 * Pool timeout yang kecil juga bikin halaman yang query paralel gagal saat
 * database sedang bangun, karena antrean kehabisan waktu.
 */
export function withConnectionParams(
  url: string | undefined,
  options: {
    connectTimeoutSeconds?: number;
    poolTimeoutSeconds?: number;
  } = {},
): string | undefined {
  if (!url) return url;
  const connectTimeout = options.connectTimeoutSeconds ?? DEFAULT_CONNECT_TIMEOUT_SECONDS;
  const poolTimeout = options.poolTimeoutSeconds ?? DEFAULT_POOL_TIMEOUT_SECONDS;
  const separator = url.includes("?") ? "&" : "?";
  const params: string[] = [];
  if (!/[?&]connect_timeout=/.test(url)) params.push(`connect_timeout=${connectTimeout}`);
  if (!/[?&]pool_timeout=/.test(url)) params.push(`pool_timeout=${poolTimeout}`);
  if (params.length === 0) return url;
  return `${url}${separator}${params.join("&")}`;
}

/** Versi lama yang hanya menambah connect_timeout. */
export function withConnectTimeout(
  url: string | undefined,
  seconds: number = DEFAULT_CONNECT_TIMEOUT_SECONDS,
): string | undefined {
  if (!url) return url;
  if (/[?&]connect_timeout=/.test(url)) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}connect_timeout=${seconds}`;
}
