import { Prisma } from "@prisma/client";

export type CostInput = {
  promptTokens: number;
  completionTokens: number;
  priceIn: Prisma.Decimal | number | string;
  priceOut: Prisma.Decimal | number | string;
  markupPercent: Prisma.Decimal | number | string;
  creditsPerUsd: Prisma.Decimal | number | string;
};

const TOKENS_PER_MILLION = new Prisma.Decimal(1_000_000);

/**
 * Biaya dalam kredit = (harga token) * (1 + markup) * kreditPerUsd
 * priceIn/priceOut disimpan sebagai USD per 1 juta token.
 */
export function computeCostCredits(input: CostInput): Prisma.Decimal {
  const prompt = new Prisma.Decimal(input.promptTokens).div(TOKENS_PER_MILLION).mul(input.priceIn);
  const completion = new Prisma.Decimal(input.completionTokens)
    .div(TOKENS_PER_MILLION)
    .mul(input.priceOut);
  const markup = new Prisma.Decimal(1).add(new Prisma.Decimal(input.markupPercent).div(100));
  const usd = prompt.add(completion).mul(markup);
  return usd.mul(input.creditsPerUsd);
}

/** Estimasi token dari teks: 4 karakter ~= 1 token. Dipakai hanya saat provider tidak melaporkan usage. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export function textOfContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const value = (part as { text?: unknown }).text;
          return typeof value === "string" ? value : "";
        }
        return "";
      })
      .join(" ");
  }
  return "";
}

/**
 * Menambahkan biaya kredit RoutingAI ke objek usage hasil provider.
 *
 * Provider seperti OpenRouter mengirim `cost` dalam satuan dolar mereka sendiri, jadi
 * pemanggil perlu melihat berapa kredit yang benar-benar dipotong dari saldonya.
 */
export function withCreditUsage<T extends Record<string, unknown>>(
  usage: T | undefined,
  creditsCharged: Prisma.Decimal,
  balanceCredits: Prisma.Decimal,
): T & { credits_charged: string; balance_credits: string } {
  return {
    ...(usage ?? ({} as T)),
    credits_charged: creditsCharged.toString(),
    balance_credits: balanceCredits.toString(),
  };
}
