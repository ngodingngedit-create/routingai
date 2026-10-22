import { describe, expect, it } from "vitest";
import { computeCostCredits, estimateTokens, textOfContent, withCreditUsage } from "@/lib/billing";
import { Prisma } from "@prisma/client";

const PRICE_IN = "0.15"; // USD per 1M token
const PRICE_OUT = "0.60";

describe("computeCostCredits", () => {
  it("menghitung biaya dari token input dan output", () => {
    const cost = computeCostCredits({
      promptTokens: 1000,
      completionTokens: 500,
      priceIn: PRICE_IN,
      priceOut: PRICE_OUT,
      markupPercent: 0,
      creditsPerUsd: 1000,
    });
    // 0.00015 USD input + 0.0003 USD output = 0.00045 USD = 0.45 kredit
    expect(cost.toString()).toBe("0.45");
  });

  it("menambahkan margin persen di atas harga provider", () => {
    const cost = computeCostCredits({
      promptTokens: 1000,
      completionTokens: 500,
      priceIn: PRICE_IN,
      priceOut: PRICE_OUT,
      markupPercent: 20,
      creditsPerUsd: 1000,
    });
    expect(cost.toString()).toBe("0.54");
  });

  it("mengubah nilai kredit per USD", () => {
    const cost = computeCostCredits({
      promptTokens: 1000,
      completionTokens: 500,
      priceIn: PRICE_IN,
      priceOut: PRICE_OUT,
      markupPercent: 0,
      creditsPerUsd: 1,
    });
    expect(cost.toString()).toBe("0.00045");
  });

  it("bernilai nol saat tidak ada token", () => {
    const cost = computeCostCredits({
      promptTokens: 0,
      completionTokens: 0,
      priceIn: PRICE_IN,
      priceOut: PRICE_OUT,
      markupPercent: 10,
      creditsPerUsd: 1000,
    });
    expect(cost.toString()).toBe("0");
  });
});

describe("estimateTokens", () => {
  it("menghitung empat karakter sebagai satu token", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  it("mengembalikan nol untuk teks kosong", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("textOfContent", () => {
  it("membaca teks dari string", () => {
    expect(textOfContent("halo")).toBe("halo");
  });

  it("menggabungkan bagian array", () => {
    expect(textOfContent([{ type: "text", text: "satu" }, { type: "text", text: "dua" }])).toBe("satu dua");
  });

  it("mengembalikan string kosong untuk bentuk lain", () => {
    expect(textOfContent(42)).toBe("");
  });
});

describe("withCreditUsage", () => {
  it("menambahkan kredit terpakai dan saldo ke usage provider", () => {
    const usage = withCreditUsage(
      { prompt_tokens: 212, completion_tokens: 55, cost: 0 },
      new Prisma.Decimal(0.00815),
      new Prisma.Decimal(99.984213),
    );
    expect(usage.prompt_tokens).toBe(212);
    expect(usage.cost).toBe(0);
    expect(usage.credits_charged).toBe("0.00815");
    expect(usage.balance_credits).toBe("99.984213");
  });

  it("bekerja kalau provider tidak mengirim usage", () => {
    const usage = withCreditUsage(undefined, new Prisma.Decimal(1), new Prisma.Decimal(9));
    expect(usage.credits_charged).toBe("1");
    expect(usage.balance_credits).toBe("9");
  });
});
