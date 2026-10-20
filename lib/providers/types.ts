export type ProviderKind = "OPENAI_COMPATIBLE" | "OPENROUTER" | "ANTHROPIC" | "GEMINI";

export type ChatMessage = {
  role: string;
  content: unknown;
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  max_completion_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[] | string;
  tools?: unknown[];
  tool_choice?: unknown;
  [key: string]: unknown;
};

export type BuildContext = {
  baseUrl: string;
  apiKey: string;
  upstreamModel: string;
  body: ChatRequest;
  stream: boolean;
};

export type UpstreamTarget = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
};

export type StreamState = {
  modelSlug: string;
  created: number;
  roleSent: boolean;
  finishSent: boolean;
  promptTokens: number;
  completionTokens: number;
  usageReported: boolean;
  contentChars: number;
};

export type SseEvent = {
  event?: string;
  data: string;
};

export type ProviderAdapter = {
  kind: ProviderKind;
  buildRequest(ctx: BuildContext): UpstreamTarget;
  toOpenAIResponse(json: unknown, ctx: { modelSlug: string; created: number }): unknown;
  /** Mengubah satu event SSE upstream menjadi potongan SSE berformat OpenAI. */
  handleSseEvent(event: SseEvent, state: StreamState): string[];
};

export function trimBase(url: string): string {
  return url.replace(/\/+$/, "");
}

export function openAIChunk(
  state: StreamState,
  delta: Record<string, unknown>,
  finishReason: string | null = null,
): string {
  return `data: ${JSON.stringify({
    id: `chatcmpl-${state.modelSlug}-${state.created}`,
    object: "chat.completion.chunk",
    created: state.created,
    model: state.modelSlug,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

export function mapStopReason(reason: unknown): string {
  switch (reason) {
    case "end_turn":
    case "STOP":
      return "stop";
    case "max_tokens":
    case "MAX_TOKENS":
      return "length";
    case "tool_use":
      return "tool_calls";
    default:
      return "stop";
  }
}
