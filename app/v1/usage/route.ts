import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 30)));
  const since = new Date(Date.now() - days * 86_400_000);

  const [logs, grouped] = await Promise.all([
    prisma.requestLog.findMany({
      where: { userId: auth.apiKey.userId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        modelSlug: true,
        providerSlug: true,
        promptTokens: true,
        completionTokens: true,
        cost: true,
        estimated: true,
        status: true,
        latencyMs: true,
        streaming: true,
        createdAt: true,
      },
    }),
    prisma.requestLog.groupBy({
      by: ["modelSlug"],
      where: { userId: auth.apiKey.userId, createdAt: { gte: since } },
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: { _all: true },
    }),
  ]);

  return Response.json({
    window_days: days,
    balance_credits: auth.apiKey.user.credits.toString(),
    by_model: grouped.map((row) => ({
      model: row.modelSlug,
      requests: row._count._all,
      prompt_tokens: row._sum.promptTokens ?? 0,
      completion_tokens: row._sum.completionTokens ?? 0,
      credits: (row._sum.cost ?? 0).toString(),
    })),
    recent: logs.map((log) => ({
      id: log.id,
      model: log.modelSlug,
      provider: log.providerSlug,
      prompt_tokens: log.promptTokens,
      completion_tokens: log.completionTokens,
      credits: log.cost.toString(),
      estimated: log.estimated,
      status: log.status,
      latency_ms: log.latencyMs,
      streaming: log.streaming,
      created_at: log.createdAt.toISOString(),
    })),
  });
}
