import { describe, expect, it } from "vitest";
import {
  validateAdjustInput,
  validateModelInput,
  validateProviderInput,
  validateSettingsInput,
  validateTopUpInput,
} from "@/lib/validation";

const validModel = {
  slug: "gpt-4o-mini",
  displayName: "GPT-4o mini",
  providerId: "provider-1",
  upstreamModel: "gpt-4o-mini",
  priceIn: 0.15,
  priceOut: 0.6,
  contextWindow: 128000,
  maxOutput: 16384,
  enabled: true,
};

describe("validateModelInput", () => {
  it("menerima input model yang lengkap", () => {
    expect(validateModelInput(validModel).ok).toBe(true);
  });

  it("menolak slug dengan huruf besar dan spasi", () => {
    expect(validateModelInput({ ...validModel, slug: "GPT 4o" }).ok).toBe(false);
  });

  it("menolak model aktif tanpa harga", () => {
    const result = validateModelInput({ ...validModel, priceIn: 0, priceOut: 0, enabled: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Harga");
  });

  it("meneruskan model nonaktif tanpa harga", () => {
    expect(validateModelInput({ ...validModel, priceIn: 0, priceOut: 0, enabled: false }).ok).toBe(true);
  });

  it("menolak harga negatif", () => {
    expect(validateModelInput({ ...validModel, priceOut: -1 }).ok).toBe(false);
  });
});

describe("validateProviderInput", () => {
  it("menerima base URL yang benar", () => {
    expect(
      validateProviderInput({ name: "Groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: "" }).ok,
    ).toBe(true);
  });

  it("menolak base URL tanpa skema", () => {
    expect(
      validateProviderInput({ name: "Groq", baseUrl: "api.groq.com", apiKey: "" }).ok,
    ).toBe(false);
  });

  it("menolak kunci yang terlalu pendek", () => {
    expect(
      validateProviderInput({ name: "Groq", baseUrl: "https://api.groq.com", apiKey: "pendek" }).ok,
    ).toBe(false);
  });
});

describe("validateAdjustInput", () => {
  it("menolak jumlah nol dan alasan kosong", () => {
    expect(validateAdjustInput({ amount: 0, note: "x" }).ok).toBe(false);
    expect(validateAdjustInput({ amount: 10, note: "  " }).ok).toBe(false);
  });

  it("menerima penyesuaian yang wajar", () => {
    expect(validateAdjustInput({ amount: -50, note: "koreksi" }).ok).toBe(true);
  });
});

describe("validateTopUpInput", () => {
  it("menolak jumlah negatif atau nol", () => {
    expect(validateTopUpInput({ credits: 0 }).ok).toBe(false);
    expect(validateTopUpInput({ credits: -10 }).ok).toBe(false);
  });

  it("menolak jumlah di atas batas", () => {
    expect(validateTopUpInput({ credits: 2_000_000 }).ok).toBe(false);
  });
});

describe("validateSettingsInput", () => {
  it("menolak kredit per USD nol", () => {
    expect(
      validateSettingsInput({ signupCredits: 100, markupPercent: 0, creditsPerUsd: 0 }).ok,
    ).toBe(false);
  });

  it("menerima setelan wajar", () => {
    expect(
      validateSettingsInput({ signupCredits: 100, markupPercent: 10, creditsPerUsd: 1000 }).ok,
    ).toBe(true);
  });
});
