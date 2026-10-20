import { prisma } from "@/lib/db";
import { describeUrl, isSameTarget } from "@/lib/db-target";

export const dynamic = "force-dynamic";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "APP_ENCRYPTION_KEY",
] as const;

const RECOMMENDED_ENV = [
  "DIRECT_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ADMIN_EMAIL",
] as const;

const APP_TABLES = [
  "User",
  "Session",
  "Account",
  "Verification",
  "RateLimit",
  "Provider",
  "Model",
  "ApiKey",
  "RateWindow",
  "CreditTx",
  "Order",
  "RequestLog",
  "Setting",
];

export async function GET() {
  const env: Record<string, boolean> = {};
  for (const key of [...REQUIRED_ENV, ...RECOMMENDED_ENV]) env[key] = Boolean(process.env[key]);

  const runtimeTarget = describeUrl(process.env.DATABASE_URL);
  const migrationTarget = describeUrl(process.env.DIRECT_URL);
  const sameTarget = isSameTarget(runtimeTarget, migrationTarget);

  const db: {
    reachable: boolean;
    error: string | null;
    database: string | null;
    user: string | null;
    tables: string[];
    missingTables: string[];
    migrations: string[];
  } = {
    reachable: false,
    error: null,
    database: null,
    user: null,
    tables: [],
    missingTables: APP_TABLES,
    migrations: [],
  };

  try {
    const [info] = await prisma.$queryRaw<{ database: string; username: string }[]>`
      SELECT current_database() AS database, current_user AS username
    `;
    db.database = info?.database ?? null;
    db.user = info?.username ?? null;

    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    db.tables = tables.map((row) => row.table_name);
    db.missingTables = APP_TABLES.filter((table) => !db.tables.includes(table));

    try {
      const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations ORDER BY started_at
      `;
      db.migrations = migrations.map((row) => row.migration_name);
    } catch {
      db.migrations = [];
    }

    db.reachable = true;
  } catch (error) {
    db.error =
      error instanceof Error
        ? error.message.split("\n").filter(Boolean).slice(0, 2).join(" ")
        : "error tidak diketahui";
  }

  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  const recommendedMissing = RECOMMENDED_ENV.filter((key) => !env[key]);

  const ok = db.reachable && missing.length === 0 && db.missingTables.length === 0;

  return Response.json(
    {
      ok,
      missing,
      recommendedMissing,
      env,
      db,
      targets: {
        DATABASE_URL: runtimeTarget,
        DIRECT_URL: migrationTarget,
        sameTarget,
      },
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
