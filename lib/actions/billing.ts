"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { requestTopUpForUser } from "@/lib/services";
import { validateTopUpInput } from "@/lib/validation";

export type TopUpState = {
  status: "idle" | "error" | "done";
  message: string;
};

export async function requestTopUp(_prev: TopUpState, formData: FormData): Promise<TopUpState> {
  const { user } = await requireUser();

  const credits = Number(formData.get("credits") ?? 0);
  const validation = validateTopUpInput({ credits });
  if (!validation.ok) return { status: "error", message: validation.message };

  const settings = await getSettings();
  const result = await requestTopUpForUser({
    userId: user.id,
    credits,
    note: String(formData.get("note") ?? ""),
    creditsPerUsd: Number(settings.creditsPerUsd) || 1000,
  });

  if (!result.ok) return { status: "error", message: result.message };

  revalidatePath("/dashboard/billing");
  return { status: "done", message: result.message };
}
