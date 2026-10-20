import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type UsageInput = {
  userId: string;
  apiKeyId: string | null;
  modelId: string | null;
  modelSlug: string;
  providerSlug: string;
  promptTokens: number;
  completionTokens: number;
  cost: Prisma.Decimal;
  estimated: boolean;
  latencyMs: number;
  status: string;
  upstreamStatus?: number | null;
  errorMessage?: string | null;
  streaming: boolean;
};

export async function recordUsage(input: UsageInput) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: { credits: true },
    });
    let balance = user?.credits ?? new Prisma.Decimal(0);
    let charged = new Prisma.Decimal(0);

    if (input.cost.gt(0)) {
      const updated = await tx.user.updateMany({
        where: { id: input.userId, credits: { gte: input.cost } },
        data: { credits: { decrement: input.cost } },
      });
      if (updated.count === 1) {
        charged = input.cost;
      } else {
        const clamped = Prisma.Decimal.min(input.cost, balance);
        if (clamped.gt(0)) {
          await tx.user.update({
            where: { id: input.userId },
            data: { credits: { decrement: clamped } },
          });
          charged = clamped;
        }
      }
      balance = balance.minus(charged);
    }

    const log = await tx.requestLog.create({
      data: {
        userId: input.userId,
        apiKeyId: input.apiKeyId,
        modelId: input.modelId,
        modelSlug: input.modelSlug,
        providerSlug: input.providerSlug,
        promptTokens: input.promptTokens,
        completionTokens: input.completionTokens,
        cost: charged,
        estimated: input.estimated,
        latencyMs: input.latencyMs,
        status: input.status,
        upstreamStatus: input.upstreamStatus ?? null,
        errorMessage: input.errorMessage ? input.errorMessage.slice(0, 500) : null,
        streaming: input.streaming,
      },
    });

    if (charged.gt(0)) {
      await tx.creditTx.create({
        data: {
          userId: input.userId,
          type: "USAGE",
          amount: charged.neg(),
          balanceAfter: balance,
          note: `Pemakaian ${input.modelSlug}`,
          requestLogId: log.id,
        },
      });
    }

    return { charged, balance, logId: log.id };
  });
}
