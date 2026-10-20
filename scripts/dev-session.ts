/**
 * Buat sesi login lokal untuk pengembangan. Mencetak nilai cookie yang bisa dipakai
 * untuk menguji halaman ber-session tanpa login Google.
 * Jalankan: npx tsx --env-file=.env scripts/dev-session.ts
 */
import { loadEnvFile } from "node:process";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

try {
  loadEnvFile();
} catch {
  // andil dari shell
}

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL ?? "admin@routingai.local";

async function main() {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, name: "Admin Lokal", emailVerified: true, role: "ADMIN", credits: 5000 },
    update: { role: "ADMIN", status: "ACTIVE", credits: 5000 },
  });

  const token = randomBytes(24).toString("hex");
  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 12 * 3600_000),
      ipAddress: "127.0.0.1",
      userAgent: "dev-session",
    },
  });

  const signature = createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "")
    .update(token)
    .digest("base64");

  console.log(`better-auth.session_token=${token}.${signature}`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
