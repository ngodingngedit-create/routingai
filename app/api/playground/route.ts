import { getCurrentUser } from "@/lib/session";
import { jsonError, lookupApiKey } from "@/lib/api-auth";
import { runChatCompletion } from "@/lib/chat-completion";
import { validatePlaygroundInput, type playgroundSchema } from "@/lib/playground";
import type { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Playground memakai router yang sama dengan endpoint /v1, jadi biaya, rate limit,
 * pencatatan pemakaian, dan kode error-nya identik dengan panggilan API biasa.
 * Wajib login supaya endpoint ini tidak jadi proxy terbuka ke provider.
 */
export async function POST(request: Request) {
  const current = await getCurrentUser();
  if (!current) {
    return jsonError(401, "unauthorized", "Masuk dulu untuk memakai playground.");
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Body harus berupa JSON.");
  }

  const validation = validatePlaygroundInput(raw);
  if (!validation.ok) {
    return jsonError(400, "invalid_request", validation.message);
  }

  const { apiKey, model, messages, max_tokens, temperature } = raw as z.infer<typeof playgroundSchema>;

  const lookup = await lookupApiKey(apiKey);
  const ownerEmail = lookup.ok ? lookup.apiKey.user.email : null;

  const response = await runChatCompletion({
    apiKey,
    body: {
      model,
      messages,
      max_tokens,
      temperature,
      stream: true,
    },
  });

  if (ownerEmail && ownerEmail !== current.user.email) {
    response.headers.set("x-routingai-key-owner", "other");
  }

  return response;
}
