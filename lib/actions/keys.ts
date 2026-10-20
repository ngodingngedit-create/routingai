"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { createKeyForUser, revokeKeyForUser } from "@/lib/services";

export type KeyFormState = {
  status: "idle" | "error" | "created";
  message: string;
  plainKey?: string;
  createdName?: string;
};

export async function createApiKey(
  _prev: KeyFormState,
  formData: FormData,
): Promise<KeyFormState> {
  const { user } = await requireUser();

  const result = await createKeyForUser({
    userId: user.id,
    name: String(formData.get("name") ?? ""),
    rpm: Number(formData.get("rpm") ?? 60),
  });

  if (!result.ok) {
    return { status: "error", message: result.message };
  }

  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard");

  return {
    status: "created",
    message: result.message,
    plainKey: String(result.data?.plainKey ?? ""),
    createdName: String(result.data?.name ?? ""),
  };
}

export async function revokeApiKey(formData: FormData) {
  const { user } = await requireUser();
  await revokeKeyForUser({
    userId: user.id,
    id: String(formData.get("id") ?? ""),
  });

  revalidatePath("/dashboard/api-keys");
  revalidatePath("/dashboard");
}
