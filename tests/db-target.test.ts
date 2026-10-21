import { describe, expect, it } from "vitest";
import { describeUrl, isSameTarget, normalizeHost, withConnectTimeout } from "@/lib/db-target";

const POOLED =
  "postgresql://user:pass@ep-abc-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const DIRECT =
  "postgresql://user:pass@ep-abc.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

describe("normalizeHost", () => {
  it("menghapus suffix -pooler dari host pooler Neon", () => {
    expect(normalizeHost("ep-abc-pooler.ap-southeast-1.aws.neon.tech")).toBe(
      "ep-abc.ap-southeast-1.aws.neon.tech",
    );
  });

  it("tidak mengubah host tanpa suffix pooler", () => {
    expect(normalizeHost("ep-abc.ap-southeast-1.aws.neon.tech")).toBe(
      "ep-abc.ap-southeast-1.aws.neon.tech",
    );
  });
});

describe("describeUrl", () => {
  it("membaca host, project, database, dan user tanpa password", () => {
    const target = describeUrl(POOLED);
    expect(target?.host).toBe("ep-abc-pooler.ap-southeast-1.aws.neon.tech");
    expect(target?.project).toBe("ep-abc.ap-southeast-1.aws.neon.tech");
    expect(target?.database).toBe("neondb");
    expect(target?.user).toBe("user");
    expect(JSON.stringify(target)).not.toContain("pass");
  });

  it("hanya menampilkan param yang aman", () => {
    const target = describeUrl(
      "postgres://user:pass@db.prisma.io:5432/postgres?sslmode=require&pgbouncer=true&connection_limit=1&password=rahasia",
    );
    expect(target?.params).toEqual({
      sslmode: "require",
      pgbouncer: "true",
      connection_limit: "1",
    });
    expect(JSON.stringify(target)).not.toContain("rahasia");
  });

  it("mengembalikan null untuk URL rusak atau kosong", () => {
    expect(describeUrl("bukan-url")).toBeNull();
    expect(describeUrl("")).toBeNull();
    expect(describeUrl(undefined)).toBeNull();
  });
});

describe("isSameTarget", () => {
  it("menerima pasangan pooler dan direct dari project yang sama", () => {
    expect(isSameTarget(describeUrl(POOLED), describeUrl(DIRECT))).toBe(true);
  });

  it("menolak pasangan dengan database berbeda", () => {
    const other =
      "postgresql://user:pass@ep-abc.ap-southeast-1.aws.neon.tech/postgres?sslmode=require";
    expect(isSameTarget(describeUrl(POOLED), describeUrl(other))).toBe(false);
  });

  it("menolak pasangan dari project berbeda", () => {
    const otherProject =
      "postgresql://user:pass@ep-xyz.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    expect(isSameTarget(describeUrl(POOLED), describeUrl(otherProject))).toBe(false);
  });

  it("mengembalikan null kalau salah satu URL tidak ada", () => {
    expect(isSameTarget(describeUrl(POOLED), null)).toBeNull();
    expect(isSameTarget(null, null)).toBeNull();
  });
});

describe("withConnectTimeout", () => {
  it("menambah connect_timeout dengan pemisah yang benar", () => {
    expect(withConnectTimeout("postgres://user@host/db?sslmode=require")).toBe(
      "postgres://user@host/db?sslmode=require&connect_timeout=20",
    );
    expect(withConnectTimeout("postgres://user@host/db")).toBe(
      "postgres://user@host/db?connect_timeout=20",
    );
  });

  it("tidak menimpa connect_timeout yang sudah ada", () => {
    const url = "postgres://user@host/db?sslmode=require&connect_timeout=45";
    expect(withConnectTimeout(url)).toBe(url);
  });

  it("menghormati nilai detik khusus", () => {
    expect(withConnectTimeout("postgres://user@host/db", 5)).toBe(
      "postgres://user@host/db?connect_timeout=5",
    );
  });

  it("mengembalikan URL kosong tanpa perubahan", () => {
    expect(withConnectTimeout("")).toBe("");
  });
});
