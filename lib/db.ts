import { PrismaClient } from "@prisma/client";
import { withConnectionParams } from "@/lib/db-target";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) return new PrismaClient();
  return new PrismaClient({ datasourceUrl: withConnectionParams(url) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
