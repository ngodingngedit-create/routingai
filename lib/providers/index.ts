import {
  anthropicAdapter,
  geminiAdapter,
  openAIAdapter,
  openRouterAdapter,
} from "@/lib/providers/adapters";
import type { ProviderKind } from "@/lib/providers/types";

const ADAPTERS: Record<ProviderKind, ReturnType<typeof openAIAdapter>> = {
  OPENAI_COMPATIBLE: openAIAdapter(),
  OPENROUTER: openRouterAdapter,
  ANTHROPIC: anthropicAdapter,
  GEMINI: geminiAdapter,
};

export function getAdapter(kind: string) {
  return ADAPTERS[kind as ProviderKind] ?? ADAPTERS.OPENAI_COMPATIBLE;
}

export * from "@/lib/providers/types";
