import "server-only";

import { z } from "zod";

import { buildTurnPrompt, DEDUCTION_SYSTEM_PROMPT } from "./prompt";
import { GAME_AI_RESPONSE_JSON_SCHEMA, parseGameAIResponseText } from "./schema";
import { AIError, type AIProvider, type AIProviderContext, type GameAIResponse } from "./types";

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

const OllamaResponseSchema = z
  .object({
    message: z.object({ content: z.string() }).passthrough(),
  })
  .passthrough();

interface OllamaProviderOptions {
  baseUrl?: string;
  model: string;
  timeoutMs?: number;
}

export class OllamaProvider implements AIProvider {
  readonly name = "ollama" as const;

  private readonly endpoint: URL;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor({
    baseUrl = DEFAULT_OLLAMA_BASE_URL,
    model,
    timeoutMs = 20_000,
  }: OllamaProviderOptions) {
    if (!model.trim()) {
      throw new AIError("AI_UNAVAILABLE", "Choose an Ollama model before using local AI.");
    }

    let parsedBaseUrl: URL;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      throw new AIError("AI_UNAVAILABLE", "The Ollama server address is invalid.");
    }

    if (parsedBaseUrl.protocol !== "http:" && parsedBaseUrl.protocol !== "https:") {
      throw new AIError("AI_UNAVAILABLE", "The Ollama server address must use HTTP or HTTPS.");
    }

    const normalizedBase = parsedBaseUrl.toString().replace(/\/+$/, "") + "/";
    this.endpoint = new URL("api/chat", normalizedBase);
    this.model = model.trim();
    this.timeoutMs = timeoutMs;
  }

  async playTurn(context: AIProviderContext): Promise<GameAIResponse> {
    const timeoutController = new AbortController();
    const abortFromContext = () => timeoutController.abort(context.signal?.reason);
    context.signal?.addEventListener("abort", abortFromContext, { once: true });
    const timeout = setTimeout(() => timeoutController.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: GAME_AI_RESPONSE_JSON_SCHEMA,
          messages: [
            { role: "system", content: DEDUCTION_SYSTEM_PROMPT },
            { role: "user", content: buildTurnPrompt(context) },
          ],
          options: {
            temperature: 0.2,
            num_predict: 700,
          },
        }),
        cache: "no-store",
        signal: timeoutController.signal,
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new AIError("RATE_LIMITED", "The local deduction engine needs a short rest.");
        }
        if (response.status === 404) {
          throw new AIError("AI_UNAVAILABLE", "The configured Ollama model is not available.");
        }
        throw new AIError("AI_UNAVAILABLE", "Ollama is not ready to answer right now.");
      }

      const contentLength = Number(response.headers.get("content-length"));
      if (Number.isFinite(contentLength) && contentLength > 64 * 1024) {
        throw new AIError("INVALID_AI_RESPONSE", "Ollama returned an oversized response.");
      }

      let value: unknown;
      try {
        value = await response.json();
      } catch (error) {
        throw new AIError("INVALID_AI_RESPONSE", "Ollama returned unreadable output.", {
          cause: error,
        });
      }

      const parsedEnvelope = OllamaResponseSchema.safeParse(value);
      if (!parsedEnvelope.success) {
        throw new AIError("INVALID_AI_RESPONSE", "Ollama returned an unexpected response.");
      }

      try {
        return parseGameAIResponseText(parsedEnvelope.data.message.content);
      } catch (error) {
        throw new AIError("INVALID_AI_RESPONSE", "Ollama returned an invalid game action.", {
          cause: error,
        });
      }
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }
      if (isAbortError(error) || timeoutController.signal.aborted) {
        throw new AIError("NETWORK_ERROR", "The local deduction engine took too long to respond.");
      }
      throw new AIError(
        "NETWORK_ERROR",
        "Ollama could not be reached. Make sure it is running locally.",
      );
    } finally {
      clearTimeout(timeout);
      context.signal?.removeEventListener("abort", abortFromContext);
    }
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
