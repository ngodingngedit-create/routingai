import { describe, expect, it } from "vitest";
import { resolveOrigin } from "@/lib/public-url";

describe("resolveOrigin", () => {
  it("memakai APP_URL kalau diisi", () => {
    expect(
      resolveOrigin({
        appUrl: "https://routingai.vercel.app",
        host: "routingai.vercel.app",
        proto: "https",
      }),
    ).toBe("https://routingai.vercel.app");
  });

  it("membuang trailing slash dan spasi di APP_URL", () => {
    expect(resolveOrigin({ appUrl: "  https://routingai.vercel.app/  " })).toBe(
      "https://routingai.vercel.app",
    );
  });

  it("mengambil origin dari header host", () => {
    expect(resolveOrigin({ host: "routingai.vercel.app", proto: "https" })).toBe(
      "https://routingai.vercel.app",
    );
  });

  it("pakai http untuk localhost", () => {
    expect(resolveOrigin({ host: "localhost:3000" })).toBe("http://localhost:3000");
    expect(resolveOrigin({ host: "127.0.0.1:3000" })).toBe("http://127.0.0.1:3000");
  });

  it("memakai x-forwarded-proto kalau ada", () => {
    expect(resolveOrigin({ host: "routingai.vercel.app", proto: "https" })).toBe(
      "https://routingai.vercel.app",
    );
  });

  it("fallback ke localhost kalau host tidak ada", () => {
    expect(resolveOrigin({})).toBe("http://localhost:3000");
  });
});
