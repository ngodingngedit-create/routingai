/**
 * Jadikan user yang sudah terdaftar jadi ADMIN.
 * Jalankan: npm run admin:promote -- <email>
 * Idempotent, aman dijalankan berulang.
 */
import { loadEnvFile } from "node:process";
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

async function main() {
  const email = (process.argv[2] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Pakai: npm run admin:promote -- <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`User ${email} belum terdaftar.`);
    console.error("Login dulu di aplikasi supaya akunnya dibuat, baru jalankan perintah ini.");
    process.exit(1);
  }

  if (user.role === "ADMIN" && user.status === "ACTIVE") {
    console.log(`${email} sudah ADMIN dan aktif, tidak ada yang diubah.`);
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN", status: "ACTIVE" },
  });

  console.log(`${updated.email} -> role=${updated.role} status=${updated.status}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
