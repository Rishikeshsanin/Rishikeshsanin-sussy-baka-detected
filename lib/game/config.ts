import type { AIMemory, GameQuestion } from "./types";

export const MAX_QUESTIONS = 30;
export const GAME_STORAGE_VERSION = 1 as const;
export const GAME_STORAGE_KEY = "veyra.game.v1";

export const FIRST_QUESTION: GameQuestion = Object.freeze({
  questionId: "first-real-person",
  question: "Is your character a real person?",
});

export const EMPTY_AI_MEMORY: AIMemory = Object.freeze({
  summary: "",
  candidateHypotheses: [],
});

export const DEFAULT_GIVE_UP_MESSAGE = "You got me this time.";

