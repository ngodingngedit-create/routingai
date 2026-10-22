import { describe, expect, it } from "vitest";
import { formatEffectivePrice, formatUsdPerMillion } from "@/lib/format";

describe("formatUsdPerMillion", () => {
  it("menampilkan harga dengan format dolar", () => {
    expect(formatUsdPerMillion(0.0125)).toBe("$0.0125");
  });

  it("menandai harga nol sebagai belum diatur", () => {
    expect(formatUsdPerMillion(0)).toBe("belum diatur");
  });
});

describe("formatEffectivePrice", () => {
  it("sama dengan harga provider kalau margin nol", () => {
    expect(formatEffectivePrice(0.0125, 0)).toBe("$0.0125");
  });

  it("menambah margin persen", () => {
    expect(formatEffectivePrice(0.0125, 20)).toBe("$0.015");
  });

  it("memakai titik desimal, bukan koma, karena harga dalam USD", () => {
    expect(formatEffectivePrice(0.1, 0)).toBe("$0.1");
  });

  it("menandai harga nol sebagai belum diatur walau margin nonzero", () => {
    expect(formatEffectivePrice(0, 20)).toBe("belum diatur");
  });
});
