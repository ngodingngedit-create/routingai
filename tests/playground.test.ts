import { describe, expect, it } from "vitest";
import { validatePlaygroundInput } from "@/lib/playground";

const valid = {
  apiKey: "sk-rly-abcdefghijkl",
  model: "minimax-m3.1-flash:free",
  messages: [{ role: "user", content: "halo" }],
  max_tokens: 300,
};

describe("validatePlaygroundInput", () => {
  it("menerima input lengkap", () => {
    expect(validatePlaygroundInput(valid).ok).toBe(true);
  });

  it("menerima input tanpa max_tokens dan temperature", () => {
    const rest = { ...valid };
    delete (rest as { max_tokens?: number }).max_tokens;
    expect(validatePlaygroundInput(rest).ok).toBe(true);
  });

  it("menolak kunci yang terlalu pendek", () => {
    const result = validatePlaygroundInput({ ...valid, apiKey: "sk-rly" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Kunci API");
  });

  it("menolak model kosong", () => {
    const result = validatePlaygroundInput({ ...valid, model: "" });
    expect(result.ok).toBe(false);
  });

  it("menolak prompt kosong", () => {
    const result = validatePlaygroundInput({ ...valid, messages: [] });
    expect(result.ok).toBe(false);
  });

  it("menolak max_tokens di luar rentang", () => {
    expect(validatePlaygroundInput({ ...valid, max_tokens: 0 }).ok).toBe(false);
    expect(validatePlaygroundInput({ ...valid, max_tokens: 999999 }).ok).toBe(false);
  });

  it("menolak temperature di luar rentang", () => {
    expect(validatePlaygroundInput({ ...valid, temperature: 5 }).ok).toBe(false);
  });

  it("menolak input yang bukan objek", () => {
    expect(validatePlaygroundInput("bukan objek").ok).toBe(false);
    expect(validatePlaygroundInput(null).ok).toBe(false);
  });
});
