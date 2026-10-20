export type UrlTarget = {
  host: string;
  project: string;
  database: string;
  port: string;
  user: string;
};

/** Host pooler Neon punya suffix -pooler, host direct tidak. Keduanya satu project yang sama. */
export function normalizeHost(host: string): string {
  return host.replace(/-pooler(?=\.|$)/, "");
}

export function describeUrl(value: string | undefined | null): UrlTarget | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return {
      host: url.hostname,
      project: normalizeHost(url.hostname),
      database: url.pathname.replace(/^\//, "") || "postgres",
      port: url.port || "5432",
      user: url.username ? decodeURIComponent(url.username) : "",
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
