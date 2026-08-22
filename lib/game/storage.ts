import { z } from "zod";

import { GAME_STORAGE_KEY, GAME_STORAGE_VERSION } from "./config";
import { ANSWER_TYPES, GAME_ERROR_CODES, GAME_STATUSES, type GameState } from "./types";

const GameQuestionSchema = z.object({
  questionId: z.string().min(1).max(80),
  question: z.string().min(1).max(180),
});

const GameAnswerSchema = GameQuestionSchema.extend({
  answer: z.enum(ANSWER_TYPES),
  timestamp: z.number().int().nonnegative(),
});

const GameGuessSchema = z.object({
  name: z.string().min(1).max(100),
  confidence: z.number().min(0).max(1),
});

const AIMemorySchema = z.object({
  summary: z.string().max(1_200),
  candidateHypotheses: z.array(z.string().min(1).max(100)).max(8),
});

const GameErrorSchema = z.object({
  code: z.enum(GAME_ERROR_CODES),
  message: z.string().min(1).max(240),
  retryable: z.boolean(),
});

const LocalRevealSchema = z.object({
  name: z.string().min(1).max(80),
  submittedAt: z.number().int().nonnegative(),
});

const SnapshotSchema = z
  .object({
    status: z.enum(GAME_STATUSES),
    questionNumber: z.number().int().min(0).max(30),
    currentQuestion: GameQuestionSchema.nullable(),
    currentGuess: GameGuessSchema.nullable(),
    history: z.array(GameAnswerSchema).max(30),
    rejectedGuesses: z.array(z.string().min(1).max(100)).max(20),
    confidence: z.number().min(0).max(1),
    aiMemory: AIMemorySchema,
    turnReason: z.enum(["answer", "rejected_guess"]).nullable(),
    giveUpMessage: z.string().max(180).nullable(),
    error: GameErrorSchema.nullable(),
    localReveal: LocalRevealSchema.nullable(),
  })
  .strict();

const GameStateSchema = SnapshotSchema.extend({
  gameId: z.string().min(1).max(80),
  createdAt: z.number().int().nonnegative(),
  turnId: z.number().int().nonnegative(),
  checkpoints: z.array(z.object({ snapshot: SnapshotSchema }).strict()).max(30),
}).strict();

const StorageEnvelopeSchema = z
  .object({
    version: z.literal(GAME_STORAGE_VERSION),
    savedAt: z.number().int().nonnegative(),
    state: GameStateSchema,
  })
  .strict();

export function serializeGameState(state: GameState): string {
  return JSON.stringify({ version: GAME_STORAGE_VERSION, savedAt: Date.now(), state });
}

export function parseStoredGameState(value: string): GameState | null {
  try {
    const parsed = StorageEnvelopeSchema.safeParse(JSON.parse(value) as unknown);
    if (!parsed.success) return null;
    const state: GameState = parsed.data.state;

    if (state.status === "thinking") {
      return {
        ...state,
        status: "error",
        error: {
          code: "NETWORK_ERROR",
          message: "The previous reading was interrupted. Your answers are safe; try the turn again.",
          retryable: true,
        },
      };
    }
    return state;
  } catch {
    return null;
  }
}

export function loadGameState(storage?: Storage): GameState | null {
  try {
    const target = storage ?? window.localStorage;
    const value = target.getItem(GAME_STORAGE_KEY);
    return value ? parseStoredGameState(value) : null;
  } catch {
    return null;
  }
}

export function saveGameState(state: GameState, storage?: Storage): boolean {
  try {
    const target = storage ?? window.localStorage;
    target.setItem(GAME_STORAGE_KEY, serializeGameState(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedGame(storage?: Storage): void {
  try {
    const target = storage ?? window.localStorage;
    target.removeItem(GAME_STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy modes; restart still works in memory.
  }
}

export { GAME_STORAGE_KEY };
