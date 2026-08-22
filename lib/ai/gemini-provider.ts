import "server-only";

import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";

import { buildTurnPrompt, DEDUCTION_SYSTEM_PROMPT } from "./prompt";
import { GAME_AI_RESPONSE_JSON_SCHEMA, parseGameAIResponseText } from "./schema";
import { AIError, type AIProvider, type AIProviderContext, type GameAIResponse } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";
export const FAST_GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";

const PRIMARY_ATTEMPT_MAX_MS = 7_000;
const FALLBACK_RESERVE_MS = 1_000;
const MIN_FALLBACK_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_TOKENS = 384;

interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor({ apiKey, model = DEFAULT_GEMINI_MODEL, timeoutMs = 15_000 }: GeminiProviderOptions) {
    if (!apiKey.trim()) {
      throw new AIError("AI_UNAVAILABLE", "Gemini is not configured on this server.");
    }

    this.model = model.trim() || DEFAULT_GEMINI_MODEL;
    this.timeoutMs = timeoutMs;
    this.client = new GoogleGenAI({
      apiKey,
      httpOptions: { timeout: timeoutMs },
    });
  }

  async playTurn(context: AIProviderContext): Promise<GameAIResponse> {
    const primaryTimeoutMs = Math.min(this.timeoutMs, PRIMARY_ATTEMPT_MAX_MS);

    try {
      return await this.generate(context, this.model, primaryTimeoutMs);
    } catch (error) {
      const primaryError = toGeminiAIError(error);
      const canUseFastFallback =
        primaryError.code === "NETWORK_ERROR" &&
        this.model !== FAST_GEMINI_FALLBACK_MODEL &&
        !context.signal?.aborted;

      if (!canUseFastFallback) {
        throw primaryError;
      }

      const fallbackTimeoutMs = Math.max(
        MIN_FALLBACK_TIMEOUT_MS,
        this.timeoutMs - primaryTimeoutMs - FALLBACK_RESERVE_MS,
      );

      console.warn("[gemini] primary model stalled; retrying with low-latency fallback", {
        primaryModel: this.model,
        fallbackModel: FAST_GEMINI_FALLBACK_MODEL,
        code: primaryError.code,
      });

      try {
        return await this.generate(context, FAST_GEMINI_FALLBACK_MODEL, fallbackTimeoutMs);
      } catch (fallbackError) {
        throw toGeminiAIError(fallbackError);
      }
    }
  }

  private async generate(
    context: AIProviderContext,
    model: string,
    timeoutMs: number,
  ): Promise<GameAIResponse> {
    const response = await this.client.models.generateContent({
      model,
      contents: buildTurnPrompt(context),
      config: {
        systemInstruction: DEDUCTION_SYSTEM_PROMPT,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        responseMimeType: "application/json",
        responseJsonSchema: GAME_AI_RESPONSE_JSON_SCHEMA,
        httpOptions: { timeout: timeoutMs },
        abortSignal: context.signal,
      },
    });

    if (!response.text) {
      throw new AIError(
        "INVALID_AI_RESPONSE",
        "The deduction engine returned an empty response.",
      );
    }

    try {
      return parseGameAIResponseText(response.text);
    } catch (error) {
      throw new AIError(
        "INVALID_AI_RESPONSE",
        "The deduction engine returned an invalid response.",
        { cause: error },
      );
    }
  }
}

function toGeminiAIError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }

  if (isAbortError(error)) {
    return new AIError("NETWORK_ERROR", "The deduction engine took too long to respond.");
  }

  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new AIError("RATE_LIMITED", "The deduction engine needs a short rest.");
    }
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return new AIError("AI_UNAVAILABLE", "Gemini is unavailable or not configured correctly.");
    }
    if (error.status >= 500) {
      return new AIError("NETWORK_ERROR", "Gemini is temporarily unavailable.");
    }
  }

  return new AIError("NETWORK_ERROR", "Gemini could not complete this turn.");
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (
    error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
