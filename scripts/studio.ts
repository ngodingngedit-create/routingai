/**
 * Jalankan Prisma Studio dengan koneksi direct (bukan pooled).
 * Langsung: npx tsx scripts/studio.ts
 */
import { spawn } from "node:child_process";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {
  // andil dari shell
}

const direct = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!direct) {
  console.error("DIRECT_URL atau DATABASE_URL belum diisi di .env");
  process.exit(1);
}

const parsed = new URL(direct);
console.log("Studio memakai koneksi direct ke:", parsed.hostname, "/", parsed.pathname.replace(/^\//, ""));

const child = spawn("npx", ["prisma", "studio"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: direct },
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
