import type { z } from "zod";

import type {
  GameAIResponseSchema,
  TurnReasonSchema,
  TurnRequestSchema,
} from "./schema";

export type TurnReason = z.infer<typeof TurnReasonSchema>;
export type TurnRequest = z.infer<typeof TurnRequestSchema>;
export type GameAIResponse = z.infer<typeof GameAIResponseSchema>;
export type QuestionAIResponse = Extract<GameAIResponse, { type: "question" }>;
export type GuessAIResponse = Extract<GameAIResponse, { type: "guess" }>;
export type GiveUpAIResponse = Extract<GameAIResponse, { type: "give_up" }>;

export type AIProviderName = "gemini" | "ollama" | "mock";

export interface AIProviderContext extends TurnRequest {
  correction?: string;
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly name: AIProviderName;
  playTurn(context: AIProviderContext): Promise<GameAIResponse>;
}

export const AI_ERROR_CODES = [
  "AI_UNAVAILABLE",
  "RATE_LIMITED",
  "INVALID_AI_RESPONSE",
  "INVALID_REQUEST",
  "NETWORK_ERROR",
  "REQUEST_IN_PROGRESS",
  "INTERNAL_ERROR",
] as const;

export type AIErrorCode = (typeof AI_ERROR_CODES)[number];

export interface APIErrorBody {
  error: {
    code: AIErrorCode;
    message: string;
  };
}

export class AIError extends Error {
  readonly code: AIErrorCode;

  constructor(code: AIErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AIError";
    this.code = code;
  }
}
