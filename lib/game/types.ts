export const ANSWER_TYPES = [
  "yes",
  "no",
  "probably",
  "probably_not",
  "unknown",
] as const;

export type AnswerType = (typeof ANSWER_TYPES)[number];

export const GAME_STATUSES = [
  "idle",
  "thinking",
  "question",
  "guessing",
  "won",
  "gave_up",
  "error",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];

export type TurnReason = "answer" | "rejected_guess";

export interface GameQuestion {
  questionId: string;
  question: string;
}

export type CurrentQuestion = GameQuestion;

export interface GameAnswer extends GameQuestion {
  answer: AnswerType;
  timestamp: number;
}

export interface GameGuess {
  name: string;
  confidence: number;
}

export type CurrentGuess = GameGuess;

export interface AIMemory {
  summary: string;
  candidateHypotheses: string[];
}

export const GAME_ERROR_CODES = [
  "AI_UNAVAILABLE",
  "RATE_LIMITED",
  "INVALID_AI_RESPONSE",
  "INVALID_REQUEST",
  "NETWORK_ERROR",
  "REQUEST_IN_PROGRESS",
  "INTERNAL_ERROR",
] as const;

export type GameErrorCode = (typeof GAME_ERROR_CODES)[number];

export interface GameError {
  code: GameErrorCode;
  message: string;
  retryable: boolean;
}

export interface LocalReveal {
  name: string;
  submittedAt: number;
}

export interface GameSnapshot {
  status: GameStatus;
  questionNumber: number;
  currentQuestion: GameQuestion | null;
  currentGuess: GameGuess | null;
  history: GameAnswer[];
  rejectedGuesses: string[];
  confidence: number;
  aiMemory: AIMemory;
  turnReason: TurnReason | null;
  giveUpMessage: string | null;
  error: GameError | null;
  localReveal: LocalReveal | null;
}

export interface GameCheckpoint {
  snapshot: GameSnapshot;
}

export interface GameState extends GameSnapshot {
  gameId: string;
  createdAt: number;
  /** Monotonic client-side token used to discard stale AI results. */
  turnId: number;
  checkpoints: GameCheckpoint[];
}

export interface TurnToken {
  gameId: string;
  turnId: number;
}

export type GameAction =
  | { type: "HYDRATE"; state: GameState }
  | { type: "START_GAME" }
  | { type: "ANSWER"; answer: AnswerType; timestamp: number }
  | {
      type: "AI_QUESTION";
      turn: TurnToken;
      question: GameQuestion;
      confidence: number;
      aiMemory: AIMemory;
    }
  | {
      type: "AI_GUESS";
      turn: TurnToken;
      guess: GameGuess;
      aiMemory: AIMemory;
    }
  | {
      type: "AI_GIVE_UP";
      turn: TurnToken;
      message: string;
      confidence: number;
      aiMemory: AIMemory;
    }
  | { type: "REJECT_GUESS" }
  | { type: "ACCEPT_GUESS" }
  | { type: "AI_ERROR"; turn: TurnToken; error: GameError }
  | { type: "RETRY" }
  | { type: "UNDO" }
  | { type: "RESTART_GAME"; gameId: string; createdAt: number }
  | { type: "SUBMIT_REVEAL"; name: string; timestamp: number };
