import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError } from "better-auth/api";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getSetting } from "@/lib/settings";

if (!env.authSecret) {
  console.warn(
    "[auth] BETTER_AUTH_SECRET kosong. Session akan kedaluwarsa tiap restart. Isi .env sebelum production.",
  );
}

const secret = env.authSecret || randomBytes(32).toString("hex");

export const auth = betterAuth({
  secret,
  baseURL: env.authUrl,
  basePath: "/api/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: false },
  socialProviders: {
    google: {
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
    },
  },
  plugins: [nextCookies()],
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/social": { window: 60, max: 10 },
      "/callback/:id": { window: 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if ((await getSetting("maintenanceMode")) === "true") {
            throw new APIError("FORBIDDEN", { message: "Pendaftaran ditutup sementara." });
          }
          const allowed = (await getSetting("allowedEmailDomains")).trim();
          if (allowed) {
            const domain = (user.email.split("@")[1] ?? "").toLowerCase();
            const list = allowed
              .split(",")
              .map((d) => d.trim().toLowerCase())
              .filter(Boolean);
            if (!list.includes(domain)) {
              throw new APIError("FORBIDDEN", {
                message: "Domain email ini belum diizinkan untuk mendaftar.",
              });
            }
          }
          const isAdmin = env.adminEmail !== "" && user.email.toLowerCase() === env.adminEmail;
          return { data: { ...user, role: isAdmin ? "ADMIN" : "USER", status: "ACTIVE", credits: 0 } };
        },
        after: async (user) => {
          const signupCredits = Number(await getSetting("signupCredits"));
          if (!signupCredits || signupCredits <= 0) return;
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: { credits: signupCredits },
            });
            await prisma.creditTx.create({
              data: {
                userId: user.id,
                type: "TOPUP",
                amount: signupCredits,
                balanceAfter: signupCredits,
                note: "Kredit awal pendaftaran",
              },
            });
          } catch (error) {
            console.error("[auth] gagal memberi kredit awal", error);
          }
        },
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
