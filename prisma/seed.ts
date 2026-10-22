import { PrismaClient } from "@prisma/client";
import { withConnectTimeout } from "../lib/db-target";

// Seed jalan di luar request serverless, jadi pakai koneksi direct kalau ada.
// Lewat pooler bisa timeout saat build karena koneksi dari migrate sebelumnya belum dilepas.
const prisma = new PrismaClient({
  datasourceUrl: withConnectTimeout(process.env.DIRECT_URL ?? process.env.DATABASE_URL),
});

const PROVIDERS = [
  {
    slug: "openai",
    name: "OpenAI",
    kind: "OPENAI_COMPATIBLE",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    slug: "anthropic",
    name: "Anthropic",
    kind: "ANTHROPIC",
    baseUrl: "https://api.anthropic.com/v1",
  },
  {
    slug: "gemini",
    name: "Google Gemini",
    kind: "GEMINI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  },
  {
    slug: "openrouter",
    name: "OpenRouter",
    kind: "OPENROUTER",
    baseUrl: "https://openrouter.ai/api/v1",
  },
];

const DRAFT_MODELS = [
  { slug: "gpt-4o-mini", displayName: "GPT-4o mini", providerSlug: "openai", upstreamModel: "gpt-4o-mini" },
  { slug: "claude-3-5-haiku", displayName: "Claude 3.5 Haiku", providerSlug: "anthropic", upstreamModel: "claude-3-5-haiku-latest" },
  { slug: "gemini-2.0-flash", displayName: "Gemini 2.0 Flash", providerSlug: "gemini", upstreamModel: "gemini-2.0-flash" },
  { slug: "openrouter/auto", displayName: "OpenRouter Auto", providerSlug: "openrouter", upstreamModel: "openrouter/auto" },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (adminEmail) {
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: "ADMIN", status: "ACTIVE" } });
      console.log(`[seed] admin diperbarui: ${adminEmail}`);
    } else {
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminEmail.split("@")[0],
          emailVerified: true,
          role: "ADMIN",
          status: "ACTIVE",
        },
      });
      console.log(`[seed] admin dibuat: ${adminEmail}`);
    }
  } else {
    console.log("[seed] ADMIN_EMAIL kosong, admin tidak dibuat");
  }

  for (const provider of PROVIDERS) {
    await prisma.provider.upsert({
      where: { slug: provider.slug },
      create: { ...provider, apiKeyEnc: "", keyMask: "", active: false },
      update: { name: provider.name, kind: provider.kind, baseUrl: provider.baseUrl },
    });
  }
  console.log("[seed] provider disiapkan: " + PROVIDERS.map((p) => p.slug).join(", "));

  for (const draft of DRAFT_MODELS) {
    const provider = await prisma.provider.findUnique({ where: { slug: draft.providerSlug } });
    if (!provider) continue;
    await prisma.model.upsert({
      where: { slug: draft.slug },
      create: {
        slug: draft.slug,
        displayName: draft.displayName,
        providerId: provider.id,
        upstreamModel: draft.upstreamModel,
        enabled: false,
        description: "Draft. Verifikasi nama model, harga, dan ketersediaan di provider sebelum diaktifkan.",
      },
      update: {},
    });
  }
  console.log("[seed] draft model dibuat (nonaktif, harga 0)");

  const settings: Record<string, string> = {
    signupCredits: "100",
    markupPercent: "0",
    creditsPerUsd: "1000",
    allowedEmailDomains: "",
    maintenanceMode: "false",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: {},
    });
  }
  console.log("[seed] pengaturan awal disimpan");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
