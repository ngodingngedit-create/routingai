/**
 * Lihat identitas database dari sebuah connection string, tanpa perlu deploy.
 * Jalankan: npm run db:info -- "postgresql://user:pass@host/neondb?sslmode=require"
 */
import { PrismaClient } from "@prisma/client";

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

async function main() {
  const target = process.argv[2] ?? process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!target) {
    console.error("Tidak ada connection string. Pakai: npm run db:info -- \"<url>\"");
    process.exit(1);
  }

  const parsed = new URL(target);
  console.log("host     :", parsed.hostname);
  console.log("database :", parsed.pathname.replace(/^\//, "") || "postgres");
  console.log("port     :", parsed.port || "5432");
  console.log("user     :", parsed.username ? decodeURIComponent(parsed.username) : "");

  const prisma = new PrismaClient({ datasourceUrl: target });
  try {
    const [info] = await prisma.$queryRaw<{ database: string; username: string }[]>`
      SELECT current_database() AS database, current_user AS username
    `;
    console.log("terhubung ke database:", info?.database, "sebagai", info?.username);

    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    `;
    const names = tables.map((row) => row.table_name);
    const missing = APP_TABLES.filter((table) => !names.includes(table));
    console.log("tabel app terpasang :", APP_TABLES.length - missing.length, "dari", APP_TABLES.length);

    try {
      const migrations = await prisma.$queryRaw<{ migration_name: string }[]>`
        SELECT migration_name FROM _prisma_migrations ORDER BY started_at
      `;
      console.log("migration applied   :", migrations.map((row) => row.migration_name).join(", ") || "belum ada");
    } catch {
      console.log("migration applied   : belum ada (tabel _prisma_migrations tidak ditemukan)");
    }

    if (missing.length > 0) {
      console.log("tabel belum ada      :", missing.join(", "));
      console.log("jalankan: prisma migrate deploy");
    }
  } catch (error) {
    console.error("gagal terhubung:", error instanceof Error ? error.message.split("\n")[0] : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
