import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runTransaction } from "@/lib/tx";
import { generateApiKey } from "@/lib/crypto";

export type ServiceResult =
  | { ok: true; message: string; data?: Record<string, unknown> }
  | { ok: false; message: string };

export async function createKeyForUser(input: {
  userId: string;
  name: string;
  rpm: number;
}): Promise<ServiceResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, message: "Beri nama kunci supaya mudah dikenali nanti." };
  if (name.length > 60) return { ok: false, message: "Nama kunci maksimal 60 karakter." };
  if (!Number.isInteger(input.rpm) || input.rpm < 1 || input.rpm > 600) {
    return { ok: false, message: "Limit per menit harus antara 1 sampai 600." };
  }

  const active = await prisma.apiKey.count({
    where: { userId: input.userId, status: "ACTIVE" },
  });
  if (active >= 10) {
    return {
      ok: false,
      message: "Maksimal 10 kunci aktif. Cabut kunci yang tidak dipakai sebelum membuat yang baru.",
    };
  }

  const generated = generateApiKey();
  await prisma.apiKey.create({
    data: {
      userId: input.userId,
      name,
      prefix: generated.prefix,
      keyHash: generated.hash,
      last4: generated.last4,
      rpmLimit: input.rpm,
    },
  });

  return {
    ok: true,
    message: `Kunci "${name}" dibuat. Simpan sekarang, nilai ini tidak akan ditampilkan lagi.`,
    data: { plainKey: generated.raw, name },
  };
}

export async function revokeKeyForUser(input: { userId: string; id: string }): Promise<ServiceResult> {
  if (!input.id) return { ok: false, message: "Kunci tidak ditemukan." };
  const result = await prisma.apiKey.updateMany({
    where: { id: input.id, userId: input.userId },
    data: { status: "REVOKED" },
  });
  if (result.count === 0) return { ok: false, message: "Kunci tidak ditemukan." };
  return { ok: true, message: "Kunci dicabut." };
}

export async function requestTopUpForUser(input: {
  userId: string;
  credits: number;
  note: string;
  creditsPerUsd: number;
}): Promise<ServiceResult> {
  const credits = new Prisma.Decimal(input.credits);
  const amount = credits.div(input.creditsPerUsd).toDecimalPlaces(2);

  await prisma.order.create({
    data: {
      userId: input.userId,
      amount,
      credits,
      method: "MANUAL",
      status: "PENDING",
      note: input.note.trim() ? input.note.trim().slice(0, 200) : null,
    },
  });

  return {
    ok: true,
    message: `Permintaan top up ${input.credits} kredit tercatat. Admin akan memproses manual, saldo bertambah setelah disetujui.`,
  };
}

export async function applyCreditAdjustment(input: {
  adminId: string;
  userId: string;
  amount: number;
  note: string;
}): Promise<ServiceResult> {
  const target = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!target) return { ok: false, message: "Pengguna tidak ditemukan." };

  const current = new Prisma.Decimal(target.credits);
  const delta = new Prisma.Decimal(input.amount);
  const next = current.add(delta);
  // saldo tidak boleh negatif, pengurangan dibatasi saldo yang tersedia
  const applied = next.lt(0) ? current.neg() : delta;

  await runTransaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { credits: current.add(applied) },
    });
    await tx.creditTx.create({
      data: {
        userId: input.userId,
        type: "ADJUST",
        amount: applied,
        balanceAfter: current.add(applied),
        note: input.note.trim().slice(0, 200),
        adminId: input.adminId,
      },
    });
  });

  return {
    ok: true,
    message: `Kredit ${target.email} ${applied.gte(0) ? "ditambah" : "dikurangi"} ${applied.abs().toString()}.`,
  };
}

export async function approveOrderCredits(input: {
  adminId: string;
  orderId: string;
}): Promise<ServiceResult> {
  const order = await prisma.order.findUnique({ where: { id: input.orderId } });
  if (!order) return { ok: false, message: "Permintaan top up tidak ditemukan." };
  if (order.status !== "PENDING") {
    return { ok: false, message: "Permintaan ini sudah diproses." };
  }

  const target = await prisma.user.findUnique({ where: { id: order.userId } });
  if (!target) return { ok: false, message: "Pengguna tidak ditemukan." };

  const credits = new Prisma.Decimal(order.credits);
  const next = new Prisma.Decimal(target.credits).add(credits);

  await runTransaction(async (tx) => {
    await tx.user.update({ where: { id: target.id }, data: { credits: next } });
    await tx.creditTx.create({
      data: {
        userId: target.id,
        type: "TOPUP",
        amount: credits,
        balanceAfter: next,
        note: `Top up disetujui admin${order.note ? `: ${order.note}` : ""}`,
        adminId: input.adminId,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });
  });

  return { ok: true, message: `Top up ${credits.toString()} kredit disetujui.` };
}
