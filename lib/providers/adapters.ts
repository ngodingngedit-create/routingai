import { textOfContent } from "@/lib/billing";
import {
  openAIChunk,
  trimBase,
  type ProviderAdapter,
  type SseEvent,
  type StreamState,
} from "@/lib/providers/types";

export function openAIAdapter(extraHeaders: Record<string, string> = {}): ProviderAdapter {
  return {
    kind: "OPENAI_COMPATIBLE",
    buildRequest({ baseUrl, apiKey, upstreamModel, body, stream }) {
      const payload: Record<string, unknown> = { ...body, model: upstreamModel };
      if (stream) payload.stream_options = { include_usage: true };
      return {
        url: `${trimBase(baseUrl)}/chat/completions`,
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: payload,
      };
    },
    toOpenAIResponse(json, ctx) {
      const source = (json ?? {}) as Record<string, unknown>;
      return { ...source, model: ctx.modelSlug };
    },
    handleSseEvent(event: SseEvent, state: StreamState) {
      // Penutup stream di-emerging oleh core supaya chunk usage selalu sebelum [DONE].
      if (event.data === "[DONE]") return [];
      try {
        const payload = JSON.parse(event.data) as {
          usage?: { prompt_tokens?: number; completion_tokens?: number };
          choices?: { delta?: { content?: string } }[];
        };
        if (payload.usage) {
          state.promptTokens = payload.usage.prompt_tokens ?? state.promptTokens;
          state.completionTokens = payload.usage.completion_tokens ?? state.completionTokens;
          state.usageReported = true;
        }
        const content = payload.choices?.[0]?.delta?.content;
        if (typeof content === "string") state.contentChars += content.length;
      } catch {
        // potongan upstream yang bukan JSON diteruskan apa adanya
      }
      return [`data: ${event.data}\n\n`];
    },
  };
}

export const openRouterAdapter = openAIAdapter({
  "HTTP-Referer": "https://routingai.local",
  "X-Title": "RoutingAI",
});

export const anthropicAdapter: ProviderAdapter = {
  kind: "ANTHROPIC",
  buildRequest({ baseUrl, apiKey, upstreamModel, body, stream }) {
    const system = body.messages
      .filter((message) => message.role === "system")
      .map((message) => textOfContent(message.content))
      .join("\n\n");
    const messages = body.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: textOfContent(message.content),
      }));

    const payload: Record<string, unknown> = {
      model: upstreamModel,
      messages,
      max_tokens: body.max_tokens ?? body.max_completion_tokens ?? 4096,
      stream,
    };
    if (system) payload.system = system;
    if (body.temperature !== undefined) payload.temperature = body.temperature;
    if (body.top_p !== undefined) payload.top_p = body.top_p;
    if (body.stop) payload.stop_sequences = Array.isArray(body.stop) ? body.stop : [body.stop];

    return {
      url: `${trimBase(baseUrl)}/messages`,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: payload,
    };
  },
  toOpenAIResponse(json, ctx) {
    const source = (json ?? {}) as {
      id?: string;
      content?: { type?: string; text?: string }[];
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (source.content ?? [])
      .filter((block) => block.type === "text" || typeof block.text === "string")
      .map((block) => block.text ?? "")
      .join("");
    const promptTokens = source.usage?.input_tokens ?? 0;
    const completionTokens = source.usage?.output_tokens ?? 0;
    return {
      id: `chatcmpl-${source.id ?? ctx.modelSlug}`,
      object: "chat.completion",
      created: ctx.created,
      model: ctx.modelSlug,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: source.stop_reason === "max_tokens" ? "length" : "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  },
  handleSseEvent(event: SseEvent, state: StreamState) {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(event.data) as Record<string, unknown>;
    } catch {
      return [];
    }

    const type = payload.type as string | undefined;
    const out: string[] = [];

    if (type === "message_start") {
      const message = payload.message as { usage?: { input_tokens?: number } } | undefined;
      state.promptTokens = message?.usage?.input_tokens ?? state.promptTokens;
      if (!state.roleSent) {
        state.roleSent = true;
        out.push(openAIChunk(state, { role: "assistant" }));
      }
      return out;
    }

    if (type === "content_block_delta") {
      const delta = payload.delta as { type?: string; text?: string } | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        if (!state.roleSent) {
          state.roleSent = true;
          out.push(openAIChunk(state, { role: "assistant" }));
        }
        state.contentChars += delta.text.length;
        out.push(openAIChunk(state, { content: delta.text }));
      }
      return out;
    }

    if (type === "message_delta") {
      const usage = payload.usage as { output_tokens?: number } | undefined;
      if (typeof usage?.output_tokens === "number") {
        state.completionTokens = usage.output_tokens;
        state.usageReported = true;
      }
      const delta = payload.delta as { stop_reason?: string } | undefined;
      if (!state.finishSent) {
        state.finishSent = true;
        out.push(openAIChunk(state, {}, delta?.stop_reason === "max_tokens" ? "length" : "stop"));
      }
      return out;
    }

    if (type === "message_stop") {
      if (!state.finishSent) {
        state.finishSent = true;
        out.push(openAIChunk(state, {}, "stop"));
      }
      return out;
    }

    return out;
  },
};

export const geminiAdapter: ProviderAdapter = {
  kind: "GEMINI",
  buildRequest({ baseUrl, apiKey, upstreamModel, body, stream }) {
    const system = body.messages
      .filter((message) => message.role === "system")
      .map((message) => textOfContent(message.content))
      .join("\n\n");
    const contents = body.messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: textOfContent(message.content) }],
      }));

    const generationConfig: Record<string, unknown> = {};
    const maxTokens = body.max_tokens ?? body.max_completion_tokens;
    if (typeof maxTokens === "number") generationConfig.maxOutputTokens = maxTokens;
    if (body.temperature !== undefined) generationConfig.temperature = body.temperature;
    if (body.top_p !== undefined) generationConfig.topP = body.top_p;
    if (body.stop) generationConfig.stopSequences = Array.isArray(body.stop) ? body.stop : [body.stop];

    const payload: Record<string, unknown> = { contents, generationConfig };
    if (system) payload.systemInstruction = { parts: [{ text: system }] };

    const action = stream ? "streamGenerateContent?alt=sse" : "generateContent";
    return {
      url: `${trimBase(baseUrl)}/models/${encodeURIComponent(upstreamModel)}:${action}`,
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: payload,
    };
  },
  toOpenAIResponse(json, ctx) {
    const source = (json ?? {}) as {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const candidate = source.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join("");
    const promptTokens = source.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = source.usageMetadata?.candidatesTokenCount ?? 0;
    return {
      id: `chatcmpl-${ctx.modelSlug}-${ctx.created}`,
      object: "chat.completion",
      created: ctx.created,
      model: ctx.modelSlug,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: text },
          finish_reason: candidate?.finishReason === "MAX_TOKENS" ? "length" : "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  },
  handleSseEvent(event: SseEvent, state: StreamState) {
    let payload: {
      candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    try {
      payload = JSON.parse(event.data);
    } catch {
      return [];
    }

    const out: string[] = [];
    const candidate = payload.candidates?.[0];
    const text = (candidate?.content?.parts ?? []).map((part) => part.text ?? "").join("");

    if (!state.roleSent) {
      state.roleSent = true;
      out.push(openAIChunk(state, { role: "assistant" }));
    }
    if (text) {
      state.contentChars += text.length;
      out.push(openAIChunk(state, { content: text }));
    }

    const usage = payload.usageMetadata;
    if (usage) {
      state.promptTokens = usage.promptTokenCount ?? state.promptTokens;
      state.completionTokens = usage.candidatesTokenCount ?? state.completionTokens;
      state.usageReported = true;
    }

    if (candidate?.finishReason && !state.finishSent) {
      state.finishSent = true;
      out.push(openAIChunk(state, {}, candidate.finishReason === "MAX_TOKENS" ? "length" : "stop"));
    }

    return out;
  },
};
