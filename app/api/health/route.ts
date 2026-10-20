import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const REQUIRED_ENV = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "APP_ENCRYPTION_KEY",
] as const;

const RECOMMENDED_ENV = [
  "DIRECT_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "ADMIN_EMAIL",
] as const;

export async function GET() {
  const env: Record<string, boolean> = {};
  for (const key of [...REQUIRED_ENV, ...RECOMMENDED_ENV]) env[key] = Boolean(process.env[key]);

  const db: {
    reachable: boolean;
    error: string | null;
    counts: { users: number; providers: number; models: number } | null;
  } = { reachable: false, error: null, counts: null };

  try {
    await prisma.$queryRaw`SELECT 1`;
    db.reachable = true;
    const [users, providers, models] = await Promise.all([
      prisma.user.count(),
      prisma.provider.count(),
      prisma.model.count(),
    ]);
    db.counts = { users, providers, models };
  } catch (error) {
    db.error =
      error instanceof Error
        ? error.message.split("\n").filter(Boolean).slice(0, 2).join(" ")
        : "error tidak diketahui";
  }

  const missing = REQUIRED_ENV.filter((key) => !env[key]);
  const recommendedMissing = RECOMMENDED_ENV.filter((key) => !env[key]);

  const ok = db.reachable && missing.length === 0;

  return Response.json(
    {
      ok,
      missing,
      recommendedMissing,
      env,
      db,
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
