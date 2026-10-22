import { z } from "zod";

export type ValidationResult = { ok: true } | { ok: false; message: string };

const playgroundMessageSchema = z
  .object({ role: z.string().min(1), content: z.string().min(1) })
  .passthrough();

export const playgroundSchema = z.object({
  apiKey: z.string().min(12, "Kunci API terlalu pendek.").max(200),
  model: z.string().min(1, "Pilih model dulu."),
  messages: z.array(playgroundMessageSchema).min(1, "Prompt tidak boleh kosong.").max(20),
  max_tokens: z.number().int().positive().max(32000).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export function validatePlaygroundInput(input: unknown): ValidationResult {
  const parsed = playgroundSchema.safeParse(input);
  if (parsed.success) return { ok: true };
  const first = parsed.error.issues[0];
  return {
    ok: false,
    message: first ? first.message : "Input playground tidak valid.",
  };
}
