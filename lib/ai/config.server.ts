import "server-only";

import { GeminiProvider, DEFAULT_GEMINI_MODEL } from "./gemini-provider";
import { MockProvider } from "./mock-provider";
import { DEFAULT_OLLAMA_BASE_URL, OllamaProvider } from "./ollama-provider";
import { AIError, type AIProvider, type AIProviderName } from "./types";

const DEFAULT_PROVIDER: AIProviderName = "gemini";
const DEFAULT_TIMEOUT_MS = 20_000;

export function getConfiguredAIProvider(): AIProvider {
  const providerName = readProviderName(process.env.AI_PROVIDER);
  const timeoutMs = getAITurnTimeoutMs();

  switch (providerName) {
    case "mock":
      return new MockProvider();
    case "gemini":
      return new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY ?? "",
        model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
        timeoutMs,
      });
    case "ollama":
      return new OllamaProvider({
        baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
        model: process.env.OLLAMA_MODEL ?? "",
        timeoutMs,
      });
  }
}

export function getAITurnTimeoutMs(): number {
  const configured = Number(process.env.AI_TIMEOUT_MS);
  if (Number.isInteger(configured) && configured >= 1_000 && configured <= 60_000) {
    return configured;
  }
  return DEFAULT_TIMEOUT_MS;
}

function readProviderName(value: string | undefined): AIProviderName {
  const automaticProvider = process.env.GEMINI_API_KEY?.trim()
    ? DEFAULT_PROVIDER
    : "mock";
  const name = value?.trim().toLocaleLowerCase("en-US") || automaticProvider;
  if (name === "gemini" || name === "ollama" || name === "mock") {
    return name;
  }

  throw new AIError("AI_UNAVAILABLE", "The configured AI provider is not supported.");
}
