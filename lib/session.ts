import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/tx";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;

  const user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        status: true,
        credits: true,
        createdAt: true,
      },
    }),
  );
  if (!user) return null;
  return { session, user };
}

export async function requireUser() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");
  return current;
}

export async function requireAdmin() {
  const current = await requireUser();
  if (current.user.role !== "ADMIN") redirect("/dashboard");
  return current;
}
