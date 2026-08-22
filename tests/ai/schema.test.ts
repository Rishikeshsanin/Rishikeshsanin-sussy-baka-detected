import { describe, expect, it } from "vitest";

import {
  GameAIResponseSchema,
  TurnRequestSchema,
} from "../../lib/ai/schema";

describe("GameAIResponseSchema", () => {
  it.each([
    {
      type: "question",
      question: "Is your character fictional?",
      questionId: "fictional-2",
      confidence: 0.42,
      memorySummary: "The character's origin is unresolved.",
      candidateHypotheses: [],
    },
    {
      type: "guess",
      name: "Sherlock Holmes",
      confidence: 0.96,
      memorySummary: "A fictional British detective from literature.",
      candidateHypotheses: ["Sherlock Holmes", "Hercule Poirot"],
    },
    {
      type: "give_up",
      message: "You got me this time.",
      confidence: 0,
      memorySummary: "The clues did not isolate a reliable candidate.",
    },
  ] as const)("accepts the $type action", (response) => {
    expect(GameAIResponseSchema.safeParse(response).success).toBe(true);
  });

  it("rejects malformed, overconfident, and extra output", () => {
    expect(
      GameAIResponseSchema.safeParse({
        type: "guess",
        name: "Sherlock Holmes",
        confidence: 1.2,
        memorySummary: "A detective.",
        candidateHypotheses: [],
        chainOfThought: "secret",
      }).success,
    ).toBe(false);
  });

  it("requires give-up confidence to be exactly zero", () => {
    expect(
      GameAIResponseSchema.safeParse({
        type: "give_up",
        message: "You got me.",
        confidence: 0.2,
        memorySummary: "No reliable candidate.",
      }).success,
    ).toBe(false);
  });
});

describe("TurnRequestSchema", () => {
  const answer = {
    questionId: "first-question",
    question: "Is your character a real person?",
    answer: "no" as const,
    timestamp: 1,
  };

  it("accepts the bounded route contract", () => {
    expect(
      TurnRequestSchema.safeParse({
        gameId: "game-1",
        questionNumber: 1,
        history: [answer],
        rejectedGuesses: [],
        aiMemory: { summary: "", candidateHypotheses: [] },
        turnReason: "answer",
      }).success,
    ).toBe(true);
  });

  it("rejects a question number that disagrees with history", () => {
    const result = TurnRequestSchema.safeParse({
      gameId: "game-1",
      questionNumber: 2,
      history: [answer],
      rejectedGuesses: [],
      aiMemory: { summary: "", candidateHypotheses: [] },
      turnReason: "answer",
    });

    expect(result.success).toBe(false);
  });

  it("requires a rejected candidate on a rejected-guess turn", () => {
    const result = TurnRequestSchema.safeParse({
      gameId: "game-1",
      questionNumber: 1,
      history: [answer],
      rejectedGuesses: [],
      aiMemory: { summary: "", candidateHypotheses: [] },
      turnReason: "rejected_guess",
    });

    expect(result.success).toBe(false);
  });
});
