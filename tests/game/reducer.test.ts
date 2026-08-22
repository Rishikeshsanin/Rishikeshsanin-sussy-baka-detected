import { describe, expect, it } from "vitest";

import {
  createIdleState,
  FIRST_QUESTION,
  gameReducer,
  type AIMemory,
  type GameState,
} from "@/lib/game";

const MEMORY: AIMemory = {
  summary: "Fictional human detective from books.",
  candidateHypotheses: ["Sherlock Holmes"],
};

function startedState(): GameState {
  return gameReducer(createIdleState("game-test", 1_000), { type: "START_GAME" });
}

function answeredState(answer: "yes" | "no" = "no"): GameState {
  return gameReducer(startedState(), { type: "ANSWER", answer, timestamp: 2_000 });
}

describe("gameReducer", () => {
  it("starts with the deterministic first question", () => {
    const state = startedState();

    expect(state.status).toBe("question");
    expect(state.questionNumber).toBe(1);
    expect(state.currentQuestion).toEqual(FIRST_QUESTION);
    expect(state.history).toEqual([]);
  });

  it("records an answer and enters a single AI turn", () => {
    const state = answeredState("no");

    expect(state.status).toBe("thinking");
    expect(state.turnReason).toBe("answer");
    expect(state.turnId).toBe(1);
    expect(state.history).toEqual([
      { ...FIRST_QUESTION, answer: "no", timestamp: 2_000 },
    ]);
    expect(state.checkpoints).toHaveLength(1);
  });

  it("undo restores the exact pre-answer state and invalidates stale turns", () => {
    const answered = answeredState();
    const withNextQuestion = gameReducer(answered, {
      type: "AI_QUESTION",
      turn: { gameId: answered.gameId, turnId: answered.turnId },
      question: { questionId: "book-origin", question: "Did your character first appear in a book?" },
      confidence: 0.46,
      aiMemory: MEMORY,
    });
    const undone = gameReducer(withNextQuestion, { type: "UNDO" });

    expect(undone.status).toBe("question");
    expect(undone.currentQuestion).toEqual(FIRST_QUESTION);
    expect(undone.history).toEqual([]);
    expect(undone.aiMemory.summary).toBe("");
    expect(undone.checkpoints).toEqual([]);
    expect(undone.turnId).toBeGreaterThan(withNextQuestion.turnId);
  });

  it("remembers a rejected guess and continues without resetting evidence", () => {
    const answered = answeredState();
    const guessing = gameReducer(answered, {
      type: "AI_GUESS",
      turn: { gameId: answered.gameId, turnId: answered.turnId },
      guess: { name: "Sherlock Holmes", confidence: 0.99 },
      aiMemory: MEMORY,
    });
    const continued = gameReducer(guessing, { type: "REJECT_GUESS" });

    expect(continued.status).toBe("thinking");
    expect(continued.turnReason).toBe("rejected_guess");
    expect(continued.rejectedGuesses).toEqual(["Sherlock Holmes"]);
    expect(continued.history).toEqual(answered.history);
    expect(continued.currentGuess).toBeNull();
  });

  it("ignores an AI result from a stale turn", () => {
    const answered = answeredState();
    const state = gameReducer(answered, {
      type: "AI_QUESTION",
      turn: { gameId: answered.gameId, turnId: answered.turnId + 10 },
      question: { questionId: "stale", question: "Is this stale?" },
      confidence: 0.9,
      aiMemory: MEMORY,
    });

    expect(state).toBe(answered);
  });

  it("restart clears every game-specific field", () => {
    const answered = answeredState();
    const restarted = gameReducer(answered, {
      type: "RESTART_GAME",
      gameId: "fresh-game",
      createdAt: 9_000,
    });

    expect(restarted.gameId).toBe("fresh-game");
    expect(restarted.status).toBe("idle");
    expect(restarted.history).toEqual([]);
    expect(restarted.rejectedGuesses).toEqual([]);
    expect(restarted.currentGuess).toBeNull();
    expect(restarted.checkpoints).toEqual([]);
    expect(restarted.confidence).toBe(0.08);
  });
});
