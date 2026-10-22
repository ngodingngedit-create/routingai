import { describe, expect, it } from "vitest";
import { decodeSlugParam, isValidSlug, modelHref, SLUG_HINT } from "@/lib/slug";

describe("isValidSlug", () => {
  it("menerima slug gaya OpenAI", () => {
    expect(isValidSlug("gpt-4o-mini")).toBe(true);
  });

  it("menerima sufiks titik dua dan prefix provider", () => {
    expect(isValidSlug("minimax-m3.1-flash:free")).toBe(true);
    expect(isValidSlug("minimax/minimax-m3.1-flash:free")).toBe(true);
  });

  it("menolak karakter di luar pola", () => {
    expect(isValidSlug("GPT 4o")).toBe(false);
    expect(isValidSlug("model?a=b")).toBe(false);
    expect(isValidSlug("model&x")).toBe(false);
    expect(isValidSlug("-model")).toBe(false);
  });

  it("batas panjang 60 karakter", () => {
    expect(isValidSlug("a".repeat(60))).toBe(true);
    expect(isValidSlug("a".repeat(61))).toBe(false);
  });
});

describe("decodeSlugParam", () => {
  it("menerjemahkan param ter-encode dari Next.js", () => {
    expect(decodeSlugParam("minimax-m3.1-flash%3Afree")).toBe("minimax-m3.1-flash:free");
  });

  it("tidak mengubah slug yang tidak ter-encode", () => {
    expect(decodeSlugParam("gpt-4o-mini")).toBe("gpt-4o-mini");
  });

  it("tidak meledakkan saat string bukan escape valid", () => {
    expect(decodeSlugParam("100%")).toBe("100%");
  });
});

describe("modelHref", () => {
  it("meng-encode slug supaya aman di URL", () => {
    expect(modelHref("minimax-m3.1-flash:free")).toBe("/models/minimax-m3.1-flash%3Afree");
    expect(modelHref("gpt-4o-mini")).toBe("/models/gpt-4o-mini");
  });
});

describe("SLUG_HINT", () => {
  it("menyebutkan titik dua supaya user tidak bingung", () => {
    expect(SLUG_HINT).toContain("titik dua");
  });
});
