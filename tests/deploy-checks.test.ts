import { describe, expect, it } from "vitest";
import { collectDeployRecommendations, collectDeployWarnings } from "@/lib/deploy-checks";
import { describeUrl } from "@/lib/db-target";

const POOLED_PRISMA =
  "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1";
const DIRECT_PRISMA = "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require";

function baseInput(overrides: Partial<Parameters<typeof collectDeployWarnings>[0]> = {}) {
  return {
    authUrl: "https://routingai.vercel.app",
    runtimeTarget: describeUrl(POOLED_PRISMA),
    migrationTarget: describeUrl(DIRECT_PRISMA),
    sameTarget: true,
    requestHost: "routingai.vercel.app",
    ...overrides,
  };
}

describe("collectDeployWarnings", () => {
  it("tidak memberi peringatan pada konfigurasi yang benar", () => {
    expect(collectDeployWarnings(baseInput())).toEqual([]);
  });

  it("menandai BETTER_AUTH_URL yang masih localhost", () => {
    const warnings = collectDeployWarnings(baseInput({ authUrl: "http://localhost:3000" }));
    expect(warnings.map((w) => w.code)).toContain("auth_url_localhost");
  });

  it("tidak menandai localhost untuk pengembangan lokal", () => {
    const warnings = collectDeployWarnings(
      baseInput({ authUrl: "http://localhost:3000", requestHost: "localhost:3000" }),
    );
    expect(warnings.map((w) => w.code)).not.toContain("auth_url_localhost");
  });

  it("menandai BETTER_AUTH_URL yang kosong", () => {
    const warnings = collectDeployWarnings(baseInput({ authUrl: undefined }));
    expect(warnings.map((w) => w.code)).toContain("auth_url_missing");
  });

  it("menandai domain request yang beda dari BETTER_AUTH_URL", () => {
    const warnings = collectDeployWarnings(
      baseInput({ authUrl: "https://routingai.vercel.app", requestHost: "routing.ai.id" }),
    );
    expect(warnings.map((w) => w.code)).toContain("auth_url_mismatch");
  });

  it("tidak menandai mismatch pada host preview vercel", () => {
    const warnings = collectDeployWarnings(
      baseInput({ requestHost: "routingai-abc123.vercel.app" }),
    );
    expect(warnings.map((w) => w.code)).not.toContain("auth_url_mismatch");
  });

  it("tidak menandai mismatch antara localhost dan localhost dengan port", () => {
    const warnings = collectDeployWarnings(
      baseInput({ authUrl: "http://localhost:3000", requestHost: "localhost:3000" }),
    );
    expect(warnings.map((w) => w.code)).not.toContain("auth_url_mismatch");
  });

  it("menandai DIRECT_URL dan DATABASE_URL yang berbeda target", () => {
    const warnings = collectDeployWarnings(baseInput({ sameTarget: false }));
    expect(warnings.map((w) => w.code)).toContain("targets_mismatch");
  });

  it("menandai DATABASE_URL Prisma Postgres tanpa param pooler", () => {
    const warnings = collectDeployWarnings(
      baseInput({
        runtimeTarget: describeUrl("postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require"),
      }),
    );
    expect(warnings.map((w) => w.code)).not.toContain("pooler_params_missing");
  });

  it("menandai env var yang punya spasi atau newline di akhir", () => {
    const warnings = collectDeployWarnings(
      baseInput({
        envValues: { BETTER_AUTH_URL: "https://routingai.vercel.app\n" },
      }),
    );
    expect(warnings.map((w) => w.code)).toContain("env_value_whitespace");
    expect(warnings[0].message).toContain("BETTER_AUTH_URL");
  });

  it("tidak menandai env var yang bersih", () => {
    const warnings = collectDeployWarnings(
      baseInput({
        envValues: { BETTER_AUTH_URL: "https://routingai.vercel.app" },
      }),
    );
    expect(warnings.map((w) => w.code)).not.toContain("env_value_whitespace");
  });
});

describe("collectDeployRecommendations", () => {
  it("menyarankan connect_timeout kalau DATABASE_URL belum punya", () => {
    const recommendations = collectDeployRecommendations(
      baseInput({
        envValues: { DATABASE_URL: "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require" },
      }),
    );
    expect(recommendations.map((r) => r.code)).toContain("connect_timeout_missing");
  });

  it("tidak menyarankan kalau connect_timeout sudah ada", () => {
    const recommendations = collectDeployRecommendations(
      baseInput({
        envValues: {
          DATABASE_URL: "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require&connect_timeout=20",
        },
      }),
    );
    expect(recommendations.map((r) => r.code)).not.toContain("connect_timeout_missing");
  });

  it("tidak memberi rekomendasi kalau tidak ada DATABASE_URL", () => {
    const recommendations = collectDeployRecommendations(
      baseInput({ envValues: { DATABASE_URL: undefined } }),
    );
    expect(recommendations).toEqual([]);
  });

  it("menandai DIRECT_URL yang belum diisi", () => {
    const warnings = collectDeployWarnings(
      baseInput({ migrationTarget: null, sameTarget: null }),
    );
    expect(warnings.map((w) => w.code)).toContain("direct_url_missing");
  });
});
