"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { encryptSecret, maskKey } from "@/lib/crypto";
import { requireAdmin } from "@/lib/session";
import { setSetting } from "@/lib/settings";
import { applyCreditAdjustment, approveOrderCredits } from "@/lib/services";
import {
  validateAdjustInput,
  validateModelInput,
  validateProviderInput,
  validateSettingsInput,
} from "@/lib/validation";

export type AdminFormState = { status: "idle" | "error" | "done"; message: string };

async function revalidateAdmin() {
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/providers");
  revalidatePath("/admin/models");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/settings");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/billing");
}

export async function saveProvider(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const baseUrl = String(formData.get("baseUrl") ?? "").trim();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const active = formData.get("active") === "on";

  const validation = validateProviderInput({ name, baseUrl, apiKey });
  if (!validation.ok) return { status: "error", message: validation.message };

  const provider = id
    ? await prisma.provider.findUnique({ where: { id } })
    : await prisma.provider.findUnique({ where: { slug: String(formData.get("slug") ?? "").trim() } });

  const data: Record<string, unknown> = { name, baseUrl, active };
  if (apiKey) {
    data.apiKeyEnc = encryptSecret(apiKey);
    data.keyMask = maskKey(apiKey);
  }

  if (!provider) {
    if (id) return { status: "error", message: "Provider tidak ditemukan." };
    const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
    const kind = String(formData.get("kind") ?? "OPENAI_COMPATIBLE");
    if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(slug)) {
      return { status: "error", message: "Slug provider harus huruf kecil dan angka, contoh: groq." };
    }
    if (!["OPENAI_COMPATIBLE", "OPENROUTER", "ANTHROPIC", "GEMINI"].includes(kind)) {
      return { status: "error", message: "Jenis provider tidak dikenali." };
    }
    if (!apiKey) {
      return {
        status: "error",
        message: "Kunci API provider wajib diisi saat menambah provider baru.",
      };
    }
    await prisma.provider.create({
      data: {
        slug,
        name,
        kind,
        baseUrl,
        apiKeyEnc: encryptSecret(apiKey),
        keyMask: maskKey(apiKey),
        active,
      },
    });
    await revalidateAdmin();
    return { status: "done", message: `Provider ${name} ditambahkan.` };
  }

  // Provider tanpa kunci API tidak bisa melayani request, jadi tidak boleh aktif.
  const hasKey = Boolean(apiKey || provider.apiKeyEnc);
  if (!hasKey) {
    data.active = false;
  }

  await prisma.provider.update({ where: { id: provider.id }, data });
  await revalidateAdmin();
  return {
    status: "done",
    message: hasKey
      ? `Provider ${name} disimpan. ${apiKey ? "Kredensial baru terenkripsi." : "Kredensial tidak diubah."}${
          data.active === false ? " Provider tetap nonaktif." : ""
        }`
      : `Provider ${name} disimpan, tapi tidak bisa diaktifkan karena kunci API masih kosong.`,
  };
}

export async function toggleProvider(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const provider = await prisma.provider.findUnique({ where: { id } });
  if (!provider) return;

  await prisma.provider.update({
    where: { id },
    data: { active: !provider.active && Boolean(provider.apiKeyEnc) },
  });
  await revalidateAdmin();
}

export async function saveModel(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const providerId = String(formData.get("providerId") ?? "");
  const upstreamModel = String(formData.get("upstreamModel") ?? "").trim();
  const priceIn = Number(String(formData.get("priceIn") ?? "0").trim());
  const priceOut = Number(String(formData.get("priceOut") ?? "0").trim());
  const contextWindow = Number(formData.get("contextWindow") ?? 0);
  const maxOutput = Number(formData.get("maxOutput") ?? 0);
  const enabled = formData.get("enabled") === "on";
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);

  const validation = validateModelInput({
    slug,
    displayName,
    providerId,
    upstreamModel,
    priceIn,
    priceOut,
    contextWindow,
    maxOutput,
    enabled,
  });
  if (!validation.ok) return { status: "error", message: validation.message };

  const data = {
    slug,
    displayName,
    providerId,
    upstreamModel,
    priceIn: new Prisma.Decimal(priceIn),
    priceOut: new Prisma.Decimal(priceOut),
    contextWindow: Math.floor(contextWindow),
    maxOutput: Math.floor(maxOutput),
    enabled,
    description: description || null,
  };

  if (id) {
    await prisma.model.update({ where: { id }, data });
  } else {
    const existing = await prisma.model.findUnique({ where: { slug } });
    if (existing) {
      return { status: "error", message: `Slug "${slug}" sudah dipakai model lain.` };
    }
    await prisma.model.create({ data });
  }

  await revalidateAdmin();
  revalidatePath("/models");
  return { status: "done", message: `Model ${slug} disimpan.` };
}

export async function toggleModel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const model = await prisma.model.findUnique({ where: { id } });
  if (!model) return;

  const nextEnabled = !model.enabled;
  if (nextEnabled && model.priceIn.eq(0) && model.priceOut.eq(0)) return;

  await prisma.model.update({ where: { id }, data: { enabled: nextEnabled } });
  await revalidateAdmin();
  revalidatePath("/models");
}

export async function adjustCredits(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const { user: admin } = await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const amount = Number(String(formData.get("amount") ?? "").trim());
  const note = String(formData.get("note") ?? "");

  const validation = validateAdjustInput({ amount, note });
  if (!validation.ok) return { status: "error", message: validation.message };

  const result = await applyCreditAdjustment({
    adminId: admin.id,
    userId,
    amount,
    note,
  });

  if (!result.ok) return { status: "error", message: result.message };

  await revalidateAdmin();
  return { status: "done", message: result.message };
}

export async function setUserStatus(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (!userId || !action) return;

  await prisma.user.update({
    where: { id: userId },
    data: { status: action === "suspend" ? "SUSPENDED" : "ACTIVE" },
  });
  await revalidateAdmin();
}

export async function setUserRole(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "USER" && role !== "ADMIN")) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await revalidateAdmin();
}

export async function approveOrder(formData: FormData) {
  const { user: admin } = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  const result = await approveOrderCredits({ adminId: admin.id, orderId });
  if (!result.ok) return;

  await revalidateAdmin();
}

export async function rejectOrder(formData: FormData) {
  await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) return;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING") return;

  await prisma.order.update({ where: { id: order.id }, data: { status: "REJECTED" } });
  await revalidateAdmin();
}

export async function saveSettings(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();

  const signupCredits = String(formData.get("signupCredits") ?? "").trim();
  const markupPercent = String(formData.get("markupPercent") ?? "").trim();
  const creditsPerUsd = String(formData.get("creditsPerUsd") ?? "").trim();
  const allowedEmailDomains = String(formData.get("allowedEmailDomains") ?? "").trim();
  const maintenanceMode = formData.get("maintenanceMode") === "on";

  const validation = validateSettingsInput({
    signupCredits: Number(signupCredits),
    markupPercent: Number(markupPercent),
    creditsPerUsd: Number(creditsPerUsd),
  });
  if (!validation.ok) return { status: "error", message: validation.message };

  await setSetting("signupCredits", signupCredits);
  await setSetting("markupPercent", markupPercent);
  await setSetting("creditsPerUsd", creditsPerUsd);
  await setSetting("allowedEmailDomains", allowedEmailDomains);
  await setSetting("maintenanceMode", maintenanceMode ? "true" : "false");

  await revalidateAdmin();
  return {
    status: "done",
    message: "Pengaturan disimpan dan langsung dipakai untuk request berikutnya.",
  };
}
