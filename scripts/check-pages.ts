/**
 * Cek halaman: status, isi utama, dan proteksi rute.
 * Jalankan: npx tsx --env-file=.env scripts/check-pages.ts
 * Butuh dev server Next.js menyala di http://localhost:3000
 */
import { loadEnvFile } from "node:process";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { withConnectTimeout } from "@/lib/db-target";

try {
  loadEnvFile();
} catch {
  // andil dari shell
}

const prisma = new PrismaClient({
  datasourceUrl: withConnectTimeout(process.env.DIRECT_URL ?? process.env.DATABASE_URL),
});

const BASE_URL = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const EMAIL = (process.env.ADMIN_EMAIL ?? "admin@routingai.local").trim().toLowerCase();
const COOKIE = "better-auth.session_token";

let failures = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) {
    console.log(`PASS ${label}`);
  } else {
    failures += 1;
    console.log(`FAIL ${label}`, detail ?? "");
  }
}

async function main() {
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, name: "Admin Lokal", emailVerified: true, role: "ADMIN" },
    update: { role: "ADMIN", status: "ACTIVE" },
  });

  const token = randomBytes(24).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 3600_000),
      ipAddress: "127.0.0.1",
      userAgent: "check-pages",
    },
  });

  // Better Auth menandatangani nilai cookie session dengan HMAC-SHA256 dari secret
  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "").update(token).digest("base64");
  const authed = { Cookie: `${COOKIE}=${token}.${signature}` };

  const publicPages: [string, string][] = [
    ["/", "Satu kunci API untuk beberapa model AI"],
    ["/models", "Katalog model"],
    ["/docs", "Endpoint yang tersedia"],
    ["/login", "Masuk ke RoutingAI"],
    ["/terms", "Syarat layanan"],
    ["/privacy", "Kebijakan privasi"],
  ];

  for (const [path, marker] of publicPages) {
    const response = await fetch(`${BASE_URL}${path}`);
    const body = await response.text();
    check(
      `halaman publik ${path} 200 dan berisi konten`,
      response.status === 200 && body.includes(marker),
      { status: response.status, found: body.includes(marker) },
    );
  }

  const guardedPages: [string, string][] = [
    ["/dashboard", "Ringkasan"],
    ["/dashboard/api-keys", "Kunci API"],
    ["/dashboard/usage", "Pemakaian"],
    ["/dashboard/billing", "Saldo dan tagihan"],
    ["/admin", "Ringkasan admin"],
    ["/admin/users", "Pengguna"],
    ["/admin/providers", "Provider"],
    ["/admin/models", "Model"],
    ["/admin/orders", "Top up"],
    ["/admin/requests", "Request"],
    ["/admin/settings", "Pengaturan"],
  ];

  for (const [path, marker] of guardedPages) {
    const response = await fetch(`${BASE_URL}${path}`, { headers: authed, redirect: "manual" });
    const body = await response.text();
    check(
      `halaman sesi ${path} 200 dan berisi konten`,
      response.status === 200 && body.includes(marker),
      { status: response.status, found: body.includes(marker) },
    );
  }

  const noSession = await fetch(`${BASE_URL}/dashboard`, { redirect: "manual" });
  check(
    "halaman tanpa sesi dialihkan ke login",
    noSession.status === 307 || noSession.status === 302,
    noSession.status,
  );

  const noKey = await fetch(`${BASE_URL}/v1/models`);
  check("endpoint tanpa kunci menolak 401", noKey.status === 401, noKey.status);

  await prisma.session.deleteMany({ where: { token } });
  await prisma.$disconnect();

  console.log(failures === 0 ? "\nSEMUA CEK LULUS" : `\n${failures} CEK GAGAL`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
