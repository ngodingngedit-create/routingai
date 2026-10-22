/**
 * Cek alur mutasi (kunci, top up, penyesuaian kredit) langsung ke database.
 * Jalankan: npx tsx --env-file=.env scripts/check-actions.ts
 */
import { loadEnvFile } from "node:process";
import { createHash } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { withConnectTimeout } from "../lib/db-target";
import {
  applyCreditAdjustment,
  approveOrderCredits,
  createKeyForUser,
  requestTopUpForUser,
  revokeKeyForUser,
} from "../lib/services";

try {
  loadEnvFile();
} catch {
  // andil dari shell
}

const prisma = new PrismaClient({
  datasourceUrl: withConnectTimeout(process.env.DIRECT_URL ?? process.env.DATABASE_URL),
});
const EMAIL = "actions-check@local.test";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "admin@routingai.local").trim().toLowerCase();

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
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: { email: EMAIL, name: "Cek Aksi", emailVerified: true, credits: 100 },
  });
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: { email: ADMIN_EMAIL, name: "Admin", emailVerified: true, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  // kunci API
  const created = await createKeyForUser({ userId: user.id, name: "aplikasi", rpm: 30 });
  check("buat kunci berhasil", created.ok, created);
  const plainKey = created.ok ? String(created.data?.plainKey ?? "") : "";
  check("kunci asli dikembalikan sekali", plainKey.startsWith("sk-rly-"), plainKey.slice(0, 12));

  const stored = await prisma.apiKey.findFirst({ where: { userId: user.id } });
  const hash = createHash("sha256").update(plainKey).digest("hex");
  check("kunci asli tidak disimpan", stored?.keyHash !== plainKey);
  check("hash kunci tersimpan", stored?.keyHash === hash);
  check("hanya 4 karakter terakhir tersimpan", stored?.last4 === plainKey.slice(-4));

  const invalid = await createKeyForUser({ userId: user.id, name: "", rpm: 30 });
  check("nama kosong ditolak", !invalid.ok);

  const revoked = await revokeKeyForUser({ userId: user.id, id: stored!.id });
  check("kunci bisa dicabut", revoked.ok);
  const afterRevoke = await prisma.apiKey.findUnique({ where: { id: stored!.id } });
  check("status kunci jadi REVOKED", afterRevoke?.status === "REVOKED");

  // top up
  const topUp = await requestTopUpForUser({
    userId: user.id,
    credits: 500,
    note: "transfer BCA",
    creditsPerUsd: 1000,
  });
  check("permintaan top up tercatat", topUp.ok, topUp);

  const order = await prisma.order.findFirst({ where: { userId: user.id, status: "PENDING" } });
  check("order menunggu created", Boolean(order));
  check("nilai order sesuai kredit per USD", order?.amount.toString() === "0.5", order?.amount.toString());

  const beforeApprove = new Prisma.Decimal((await prisma.user.findUnique({ where: { id: user.id } }))!.credits);
  const approved = await approveOrderCredits({ adminId: admin.id, orderId: order!.id });
  check("top up disetujui", approved.ok, approved);
  const afterApprove = new Prisma.Decimal((await prisma.user.findUnique({ where: { id: user.id } }))!.credits);
  check(
    "saldo bertambah sesuai kredit",
    afterApprove.minus(beforeApprove).toString() === "500",
    { before: beforeApprove.toString(), after: afterApprove.toString() },
  );
  const orderAfter = await prisma.order.findUnique({ where: { id: order!.id } });
  check("order jadi PAID", orderAfter?.status === "PAID");

  const approveAgain = await approveOrderCredits({ adminId: admin.id, orderId: order!.id });
  check("top up yang sama tidak bisa disetujui dua kali", !approveAgain.ok);

  // penyesuaian kredit
  const adjust = await applyCreditAdjustment({
    adminId: admin.id,
    userId: user.id,
    amount: 25.5,
    note: "kompensasi",
  });
  check("penyesuaian positif berhasil", adjust.ok, adjust);
  const afterAdjust = new Prisma.Decimal((await prisma.user.findUnique({ where: { id: user.id } }))!.credits);
  check("saldo naik sesuai penyesuaian", afterAdjust.minus(afterApprove).toString() === "25.5");

  const clamp = await applyCreditAdjustment({
    adminId: admin.id,
    userId: user.id,
    amount: -100000,
    note: "koreksi saldo",
  });
  check("penyesuaian negatif berhasil", clamp.ok, clamp);
  const afterClamp = new Prisma.Decimal((await prisma.user.findUnique({ where: { id: user.id } }))!.credits);
  check("saldo tidak pernah negatif", afterClamp.toString() === "0", afterClamp.toString());

  const tx = await prisma.creditTx.findMany({ where: { userId: user.id } });
  check("semua mutasi tercatat di ledger", tx.length >= 3, tx.length);
  check("penyesuaian negative tercatat", tx.some((item) => item.type === "ADJUST" && Number(item.amount) < 0));

  await prisma.creditTx.deleteMany({ where: { userId: user.id } });
  await prisma.order.deleteMany({ where: { userId: user.id } });
  await prisma.apiKey.deleteMany({ where: { userId: user.id } });
  await prisma.user.deleteMany({ where: { id: user.id } });

  console.log(failures === 0 ? "\nSEMUA CEK LULUS" : `\n${failures} CEK GAGAL`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
