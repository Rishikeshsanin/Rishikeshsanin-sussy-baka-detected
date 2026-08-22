import {
  EMPTY_AI_MEMORY,
  FIRST_QUESTION,
  MAX_QUESTIONS,
} from "./config";
import { isRejectedGuess } from "./guess-policy";
import type {
  GameAction,
  GameSnapshot,
  GameState,
  TurnToken,
} from "./types";

function createGameId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `game-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createIdleState(
  gameId = createGameId(),
  createdAt = Date.now(),
): GameState {
  return {
    gameId,
    createdAt,
    turnId: 0,
    status: "idle",
    questionNumber: 0,
    currentQuestion: null,
    currentGuess: null,
    history: [],
    rejectedGuesses: [],
    confidence: 0.08,
    aiMemory: { ...EMPTY_AI_MEMORY, candidateHypotheses: [] },
    turnReason: null,
    giveUpMessage: null,
    error: null,
    localReveal: null,
    checkpoints: [],
  };
}

export const createGameState = createIdleState;

function toSnapshot(state: GameState): GameSnapshot {
  return structuredClone({
    status: state.status,
    questionNumber: state.questionNumber,
    currentQuestion: state.currentQuestion,
    currentGuess: state.currentGuess,
    history: state.history,
    rejectedGuesses: state.rejectedGuesses,
    confidence: state.confidence,
    aiMemory: state.aiMemory,
    turnReason: state.turnReason,
    giveUpMessage: state.giveUpMessage,
    error: state.error,
    localReveal: state.localReveal,
  });
}

function isCurrentTurn(state: GameState, turn: TurnToken): boolean {
  return (
    state.status === "thinking" &&
    state.gameId === turn.gameId &&
    state.turnId === turn.turnId
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "START_GAME":
      if (state.status !== "idle") return state;
      return {
        ...state,
        status: "question",
        questionNumber: 1,
        currentQuestion: { ...FIRST_QUESTION },
      };

    case "ANSWER": {
      if (
        state.status !== "question" ||
        !state.currentQuestion ||
        state.history.length >= MAX_QUESTIONS
      ) {
        return state;
      }

      const history = [
        ...state.history,
        {
          ...state.currentQuestion,
          answer: action.answer,
          timestamp: action.timestamp,
        },
      ];

      return {
        ...state,
        status: "thinking",
        questionNumber: history.length,
        currentQuestion: null,
        currentGuess: null,
        history,
        error: null,
        turnId: state.turnId + 1,
        turnReason: "answer",
        checkpoints: [...state.checkpoints, { snapshot: toSnapshot(state) }],
      };
    }

    case "AI_QUESTION":
      if (!isCurrentTurn(state, action.turn)) return state;
      return {
        ...state,
        status: "question",
        questionNumber: state.history.length + 1,
        currentQuestion: action.question,
        currentGuess: null,
        confidence: action.confidence,
        aiMemory: action.aiMemory,
        error: null,
        turnReason: null,
      };

    case "AI_GUESS":
      if (!isCurrentTurn(state, action.turn)) return state;
      return {
        ...state,
        status: "guessing",
        questionNumber: state.history.length,
        currentQuestion: null,
        currentGuess: action.guess,
        confidence: action.guess.confidence,
        aiMemory: action.aiMemory,
        error: null,
        turnReason: null,
      };

    case "AI_GIVE_UP":
      if (!isCurrentTurn(state, action.turn)) return state;
      return {
        ...state,
        status: "gave_up",
        questionNumber: state.history.length,
        currentQuestion: null,
        currentGuess: null,
        confidence: action.confidence,
        aiMemory: action.aiMemory,
        giveUpMessage: action.message,
        error: null,
        turnReason: null,
      };

    case "REJECT_GUESS": {
      if (state.status !== "guessing" || !state.currentGuess) return state;
      const rejectedGuesses = isRejectedGuess(
        state.currentGuess.name,
        state.rejectedGuesses,
      )
        ? state.rejectedGuesses
        : [...state.rejectedGuesses, state.currentGuess.name];
      return {
        ...state,
        status: "thinking",
        questionNumber: state.history.length,
        rejectedGuesses,
        currentGuess: null,
        error: null,
        turnId: state.turnId + 1,
        turnReason: "rejected_guess",
      };
    }

    case "ACCEPT_GUESS":
      if (state.status !== "guessing" || !state.currentGuess) return state;
      return { ...state, status: "won", turnReason: null, error: null };

    case "AI_ERROR":
      if (!isCurrentTurn(state, action.turn)) return state;
      return {
        ...state,
        status: "error",
        questionNumber: state.history.length,
        currentQuestion: null,
        currentGuess: null,
        error: action.error,
      };

    case "RETRY":
      if (state.status !== "error" || state.history.length === 0) return state;
      return {
        ...state,
        status: "thinking",
        error: null,
        turnId: state.turnId + 1,
        turnReason: state.turnReason ?? "answer",
      };

    case "UNDO": {
      const checkpoint = state.checkpoints.at(-1);
      if (!checkpoint) return state;
      return {
        ...checkpoint.snapshot,
        gameId: state.gameId,
        createdAt: state.createdAt,
        turnId: state.turnId + 1,
        turnReason: null,
        error: null,
        checkpoints: state.checkpoints.slice(0, -1),
      };
    }

    case "RESTART_GAME":
      return createIdleState(action.gameId, action.createdAt);

    case "SUBMIT_REVEAL": {
      if (state.status !== "gave_up") return state;
      const name = action.name.trim().slice(0, 80);
      if (!name) return state;
      return {
        ...state,
        localReveal: { name, submittedAt: action.timestamp },
      };
    }

    default:
      return state;
  }
}
