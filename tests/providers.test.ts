import { describe, expect, it } from "vitest";
import { anthropicAdapter, geminiAdapter, openAIAdapter } from "@/lib/providers/adapters";
import type { ChatRequest, StreamState } from "@/lib/providers/types";

const body: ChatRequest = {
  model: "test-model",
  messages: [
    { role: "system", content: "kamu pembantu" },
    { role: "user", content: "halo" },
  ],
  max_tokens: 128,
};

function state(): StreamState {
  return {
    modelSlug: "test-model",
    created: 1700000000,
    roleSent: false,
    finishSent: false,
    promptTokens: 0,
    completionTokens: 0,
    usageReported: false,
    contentChars: 0,
  };
}

describe("openAI adapter", () => {
  it("meneruskan model upstream dan menambah stream_options", () => {
    const target = openAIAdapter().buildRequest({
      baseUrl: "https://api.example.com/v1/",
      apiKey: "kunci",
      upstreamModel: "gpt-4o-mini",
      body,
      stream: true,
    });

    expect(target.url).toBe("https://api.example.com/v1/chat/completions");
    expect(target.headers.authorization).toBe("Bearer kunci");
    expect(target.body.model).toBe("gpt-4o-mini");
    expect(target.body.stream_options).toEqual({ include_usage: true });
  });

  it("membaca usage dari potongan stream", () => {
    const s = state();
    openAIAdapter().handleSseEvent(
      {
        data: JSON.stringify({
          usage: { prompt_tokens: 12, completion_tokens: 34 },
        }),
      },
      s,
    );
    expect(s.promptTokens).toBe(12);
    expect(s.completionTokens).toBe(34);
    expect(s.usageReported).toBe(true);
  });
});

describe("anthropic adapter", () => {
  it("memisahkan system prompt dan memakai header x-api-key", () => {
    const target = anthropicAdapter.buildRequest({
      baseUrl: "https://api.anthropic.com/v1",
      apiKey: "kunci",
      upstreamModel: "claude-haiku",
      body,
      stream: false,
    });

    expect(target.url).toBe("https://api.anthropic.com/v1/messages");
    expect(target.headers["x-api-key"]).toBe("kunci");
    expect(target.body.system).toBe("kamu pembantu");
    expect(target.body.messages).toEqual([{ role: "user", content: "halo" }]);
    expect(target.body.max_tokens).toBe(128);
  });

  it("mengubah respons Anthropic ke format OpenAI", () => {
    const converted = anthropicAdapter.toOpenAIResponse(
      {
        id: "msg_1",
        content: [{ type: "text", text: "halo balik" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 9, output_tokens: 4 },
      },
      { modelSlug: "test-model", created: 1700000000 },
    ) as {
      choices: { message: { content: string } }[];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    expect(converted.choices[0].message.content).toBe("halo balik");
    expect(converted.usage.prompt_tokens).toBe(9);
    expect(converted.usage.completion_tokens).toBe(4);
  });

  it("mengubah event stream menjadi chunk OpenAI", () => {
    const s = state();
    const start = anthropicAdapter.handleSseEvent(
      { data: JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 7 } } }) },
      s,
    );
    const delta = anthropicAdapter.handleSseEvent(
      { data: JSON.stringify({ type: "content_block_delta", delta: { type: "text_delta", text: "halo" } }) },
      s,
    );
    const stop = anthropicAdapter.handleSseEvent(
      { data: JSON.stringify({ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 3 } }) },
      s,
    );

    expect(start[0]).toContain('"role":"assistant"');
    expect(delta[0]).toContain('"content":"halo"');
    expect(stop[0]).toContain('"finish_reason":"stop"');
    expect(s.promptTokens).toBe(7);
    expect(s.completionTokens).toBe(3);
  });
});

describe("gemini adapter", () => {
  it("memakai endpoint generateContent dan header x-goog-api-key", () => {
    const target = geminiAdapter.buildRequest({
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: "kunci",
      upstreamModel: "gemini-2.0-flash",
      body,
      stream: false,
    });

    expect(target.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    );
    expect(target.headers["x-goog-api-key"]).toBe("kunci");
    expect(target.body.systemInstruction).toEqual({ parts: [{ text: "kamu pembantu" }] });
    expect(target.body.contents).toEqual([{ role: "user", parts: [{ text: "halo" }] }]);
  });

  it("mengubah event stream Gemini menjadi chunk OpenAI", () => {
    const s = state();
    const chunks = geminiAdapter.handleSseEvent(
      {
        data: JSON.stringify({
          candidates: [{ content: { parts: [{ text: "halo" }] }, finishReason: "STOP" }],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
        }),
      },
      s,
    );

    expect(chunks[0]).toContain('"role":"assistant"');
    expect(chunks[1]).toContain('"content":"halo"');
    expect(chunks[2]).toContain('"finish_reason":"stop"');
    expect(s.promptTokens).toBe(5);
    expect(s.completionTokens).toBe(2);
  });
});
