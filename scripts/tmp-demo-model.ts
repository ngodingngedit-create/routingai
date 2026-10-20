import { loadEnvFile } from "node:process";
import { PrismaClient } from "@prisma/client";

try {
  loadEnvFile();
} catch {
  // andil dari shell
}

const prisma = new PrismaClient();

async function main() {
  const provider = await prisma.provider.findFirst({ where: { slug: "openai" } });
  if (!provider) throw new Error("provider openai tidak ada");
  await prisma.provider.update({ where: { id: provider.id }, data: { active: true } });
  await prisma.model.upsert({
    where: { slug: "demo-model" },
    create: {
      slug: "demo-model",
      displayName: "Demo Model (screenshot)",
      providerId: provider.id,
      upstreamModel: "gpt-4o-mini",
      priceIn: 0.15,
      priceOut: 0.6,
      contextWindow: 128000,
      maxOutput: 16384,
      enabled: true,
      description: "Model sementara untuk verifikasi tampilan.",
    },
    update: { enabled: true, priceIn: 0.15, priceOut: 0.6 },
  });
  console.log("demo model siap");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
