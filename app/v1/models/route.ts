import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return auth.response;

  const models = await prisma.model.findMany({
    where: { enabled: true, provider: { active: true } },
    include: { provider: { select: { slug: true, name: true } } },
    orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
  });

  return Response.json({
    object: "list",
    data: models.map((model) => ({
      id: model.slug,
      object: "model",
      created: Math.floor(model.createdAt.getTime() / 1000),
      owned_by: model.provider.slug,
      display_name: model.displayName,
      provider: model.provider.name,
      context_window: model.contextWindow,
      max_output_tokens: model.maxOutput,
      pricing_usd_per_1m_tokens: {
        input: model.priceIn.toString(),
        output: model.priceOut.toString(),
      },
      capabilities: model.capabilities,
    })),
  });
}
