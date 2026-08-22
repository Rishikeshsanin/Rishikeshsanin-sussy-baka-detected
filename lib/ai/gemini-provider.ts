import "server-only";

import { ApiError, GoogleGenAI } from "@google/genai";

import { buildTurnPrompt, DEDUCTION_SYSTEM_PROMPT } from "./prompt";
import { GAME_AI_RESPONSE_JSON_SCHEMA, parseGameAIResponseText } from "./schema";
import { AIError, type AIProvider, type AIProviderContext, type GameAIResponse } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.6-flash";

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
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: buildTurnPrompt(context),
        config: {
          systemInstruction: DEDUCTION_SYSTEM_PROMPT,
          temperature: 0.2,
          maxOutputTokens: 700,
          responseMimeType: "application/json",
          responseJsonSchema: GAME_AI_RESPONSE_JSON_SCHEMA,
          httpOptions: { timeout: this.timeoutMs },
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
    } catch (error) {
      if (error instanceof AIError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new AIError("NETWORK_ERROR", "The deduction engine took too long to respond.");
      }

      if (error instanceof ApiError) {
        if (error.status === 429) {
          throw new AIError("RATE_LIMITED", "The deduction engine needs a short rest.");
        }
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          throw new AIError("AI_UNAVAILABLE", "Gemini is unavailable or not configured correctly.");
        }
        if (error.status >= 500) {
          throw new AIError("NETWORK_ERROR", "Gemini is temporarily unavailable.");
        }
      }

      throw new AIError("NETWORK_ERROR", "Gemini could not complete this turn.");
    }
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (
    error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
