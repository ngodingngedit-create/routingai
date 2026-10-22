import { jsonError } from "@/lib/api-auth";
import { runChatCompletion } from "@/lib/chat-completion";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const apiKey = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!apiKey) {
    return jsonError(
      401,
      "missing_api_key",
      "Kunci API tidak ditemukan. Kirim header Authorization: Bearer sk-rly-...",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Body harus berupa JSON.");
  }

  return runChatCompletion({ apiKey, body });
}
