import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { authenticateApiKey, consumeRateLimit, jsonError } from "@/lib/api-auth";
import { computeCostCredits, estimateTokens, textOfContent } from "@/lib/billing";
import { getSettings } from "@/lib/settings";
import { recordUsage } from "@/lib/usage";
import { getAdapter, type ChatRequest, type SseEvent, type StreamState } from "@/lib/providers";

export const dynamic = "force-dynamic";

const messageSchema = z
  .object({ role: z.string().min(1), content: z.unknown() })
  .passthrough();

const chatSchema = z
  .object({
    model: z.string().min(1),
    messages: z.array(messageSchema).min(1),
    stream: z.boolean().optional(),
    max_tokens: z.number().int().positive().optional(),
    max_completion_tokens: z.number().int().positive().optional(),
    temperature: z.number().optional(),
    top_p: z.number().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .passthrough();

function estimatePromptTokens(body: ChatRequest): number {
  return body.messages.reduce((total, message) => total + estimateTokens(textOfContent(message.content)), 0);
}

function splitSseBlocks(buffer: string): { blocks: string[]; rest: string } {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  return { blocks: parts, rest };
}

function parseSseEvent(block: string): SseEvent | null {
  let eventName: string | undefined;
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventName = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  if (dataLines.length === 0) return null;
  return { event: eventName, data: dataLines.join("\n") };
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  const auth = await authenticateApiKey(request);
  if (!auth.ok) return auth.response;
  const { apiKey } = auth;

  const withinLimit = await consumeRateLimit(apiKey.id, apiKey.rpmLimit);
  if (!withinLimit) {
    return jsonError(
      429,
      "rate_limited",
      `Batas ${apiKey.rpmLimit} permintaan per menit terlampaui. Coba lagi dalam hitungan detik.`,
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError(400, "invalid_json", "Body harus berupa JSON.");
  }

  const parsed = chatSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(400, "invalid_request", "Body tidak sesuai format chat completion.", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const body = parsed.data as ChatRequest;

  const model = await prisma.model.findUnique({
    where: { slug: body.model },
    include: { provider: true },
  });
  if (!model || !model.enabled) {
    const available = await prisma.model.findMany({
      where: { enabled: true },
      select: { slug: true },
      orderBy: { sortOrder: "asc" },
    });
    return jsonError(404, "model_not_found", `Model "${body.model}" tidak tersedia.`, {
      available_models: available.map((item) => item.slug),
    });
  }
  if (!model.provider.active) {
    return jsonError(
      503,
      "provider_inactive",
      `Provider ${model.provider.name} sedang dinonaktifkan oleh admin.`,
    );
  }
  if (!model.provider.apiKeyEnc) {
    return jsonError(
      503,
      "provider_not_configured",
      `Kredensial provider ${model.provider.name} belum diisi di panel admin.`,
    );
  }
  if (model.priceIn.eq(0) && model.priceOut.eq(0)) {
    return jsonError(
      503,
      "model_price_missing",
      `Harga model ${model.slug} belum diatur oleh admin, model tidak bisa dipakai.`,
    );
  }

  const settings = await getSettings();
  const markupPercent = settings.markupPercent;
  const creditsPerUsd = settings.creditsPerUsd;
  const promptEstimate = estimatePromptTokens(body);
  const maxCompletion =
    body.max_tokens ?? body.max_completion_tokens ?? (model.maxOutput > 0 ? model.maxOutput : 1024);

  const worstCase = computeCostCredits({
    promptTokens: promptEstimate,
    completionTokens: maxCompletion,
    priceIn: model.priceIn,
    priceOut: model.priceOut,
    markupPercent,
    creditsPerUsd,
  });

  const balance = new Prisma.Decimal(apiKey.user.credits);
  if (balance.lt(worstCase)) {
    return jsonError(
      402,
      "insufficient_credits",
      "Saldo tidak cukup untuk permintaan ini. Turunkan max_tokens atau isi saldo.",
      {
        balance_credits: balance.toString(),
        estimated_cost_credits: worstCase.toString(),
        estimated_prompt_tokens: promptEstimate,
        max_completion_tokens: maxCompletion,
      },
    );
  }

  const adapter = getAdapter(model.provider.kind);
  const upstreamApiKey = decryptSecret(model.provider.apiKeyEnc);
  const target = adapter.buildRequest({
    baseUrl: model.provider.baseUrl,
    apiKey: upstreamApiKey,
    upstreamModel: model.upstreamModel,
    body,
    stream: Boolean(body.stream),
  });

  let upstream: Response;
  try {
    upstream = await fetch(target.url, {
      method: "POST",
      headers: target.headers,
      body: JSON.stringify(target.body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungi provider";
    await recordUsage({
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      modelId: model.id,
      modelSlug: model.slug,
      providerSlug: model.provider.slug,
      promptTokens: promptEstimate,
      completionTokens: 0,
      cost: new Prisma.Decimal(0),
      estimated: true,
      latencyMs: Date.now() - startedAt,
      status: "UPSTREAM_ERROR",
      errorMessage: message,
      streaming: Boolean(body.stream),
    });
    return jsonError(502, "upstream_unreachable", `Tidak bisa menghubungi provider: ${message}`);
  }

  if (!upstream.ok) {
    const detail = (await upstream.text().catch(() => "")).slice(0, 400);
    await recordUsage({
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      modelId: model.id,
      modelSlug: model.slug,
      providerSlug: model.provider.slug,
      promptTokens: promptEstimate,
      completionTokens: 0,
      cost: new Prisma.Decimal(0),
      estimated: true,
      latencyMs: Date.now() - startedAt,
      status: "UPSTREAM_ERROR",
      upstreamStatus: upstream.status,
      errorMessage: detail || `Status ${upstream.status}`,
      streaming: Boolean(body.stream),
    });
    return jsonError(
      502,
      "upstream_error",
      `Provider menolak permintaan (status ${upstream.status}).`,
      { detail },
    );
  }

  const created = Math.floor(Date.now() / 1000);

  if (!body.stream) {
    const json = await upstream.json().catch(() => null);
    if (json === null) {
      return jsonError(502, "upstream_error", "Provider mengembalikan body yang tidak bisa dibaca.");
    }
    const converted = adapter.toOpenAIResponse(json, { modelSlug: model.slug, created }) as {
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      choices?: { message?: { content?: string } }[];
    };
    const promptTokens = converted.usage?.prompt_tokens ?? promptEstimate;
    const completionTokens =
      converted.usage?.completion_tokens ??
      estimateTokens(converted.choices?.[0]?.message?.content ?? "");
    const estimated = !converted.usage;
    const cost = computeCostCredits({
      promptTokens,
      completionTokens,
      priceIn: model.priceIn,
      priceOut: model.priceOut,
      markupPercent,
      creditsPerUsd,
    });

    const result = await recordUsage({
      userId: apiKey.userId,
      apiKeyId: apiKey.id,
      modelId: model.id,
      modelSlug: model.slug,
      providerSlug: model.provider.slug,
      promptTokens,
      completionTokens,
      cost,
      estimated,
      latencyMs: Date.now() - startedAt,
      status: "OK",
      streaming: false,
    });

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return Response.json(converted, {
      headers: {
        "x-routingai-credits-charged": result.charged.toString(),
        "x-routingai-balance": result.balance.toString(),
        "x-routingai-model": model.slug,
      },
    });
  }

  const state: StreamState = {
    modelSlug: model.slug,
    created,
    roleSent: false,
    finishSent: false,
    promptTokens: 0,
    completionTokens: 0,
    usageReported: false,
    contentChars: 0,
  };

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const reader = upstream.body?.getReader();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        if (reader) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const { blocks, rest } = splitSseBlocks(buffer);
            buffer = rest;
            for (const block of blocks) {
              const event = parseSseEvent(block);
              if (!event) continue;
              for (const piece of adapter.handleSseEvent(event, state)) {
                controller.enqueue(encoder.encode(piece));
              }
            }
          }
        }

        const remainder = buffer.trim();
        if (remainder) {
          const event = parseSseEvent(remainder);
          if (event) {
            for (const piece of adapter.handleSseEvent(event, state)) {
              controller.enqueue(encoder.encode(piece));
            }
          }
        }

        const promptTokens = state.usageReported ? state.promptTokens : promptEstimate;
        const completionTokens = state.usageReported
          ? state.completionTokens
          : Math.max(1, Math.ceil(state.contentChars / 4));

        const cost = computeCostCredits({
          promptTokens,
          completionTokens,
          priceIn: model.priceIn,
          priceOut: model.priceOut,
          markupPercent,
          creditsPerUsd,
        });

        await recordUsage({
          userId: apiKey.userId,
          apiKeyId: apiKey.id,
          modelId: model.id,
          modelSlug: model.slug,
          providerSlug: model.provider.slug,
          promptTokens,
          completionTokens,
          cost,
          estimated: !state.usageReported,
          latencyMs: Date.now() - startedAt,
          status: "OK",
          streaming: true,
        });

        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        });

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
      "x-routingai-model": model.slug,
    },
  });
}
