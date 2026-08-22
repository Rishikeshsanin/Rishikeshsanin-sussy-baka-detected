import { describe, expect, it, vi } from "vitest";

import { HybridProvider } from "@/lib/ai/hybrid-provider";
import type { AIProvider, AIProviderContext, GameAIResponse } from "@/lib/ai/types";

function context(overrides: Partial<AIProviderContext> = {}): AIProviderContext {
  return {
    gameId: "game-test",
    questionNumber: 1,
    history: [
      {
        questionId: "first-real-person",
        question: "Is your character a real person?",
        answer: "yes",
        timestamp: 1,
      },
    ],
    rejectedGuesses: [],
    aiMemory: { summary: "", candidateHypotheses: [] },
    turnReason: "answer",
    ...overrides,
  };
}

function fallbackProvider(result: GameAIResponse): AIProvider & { playTurn: ReturnType<typeof vi.fn> } {
  return {
    name: "mock",
    playTurn: vi.fn(async () => result),
  };
}

describe("HybridProvider", () => {
  it("uses the deterministic engine before spending an AI call", async () => {
    const fallback = fallbackProvider({
      type: "question",
      question: "Is this fallback?",
      questionId: "fallback-question",
      confidence: 0.2,
      memorySummary: "fallback",
      candidateHypotheses: [],
    });
    const provider = new HybridProvider(fallback);

    const result = await provider.playTurn(context());

    expect(result.type).toBe("question");
    expect(result.type === "question" ? result.questionId : "").not.toBe("fallback-question");
    expect(fallback.playTurn).not.toHaveBeenCalled();
  });

  it("escapes the curated pool after a rejected guess", async () => {
    const fallback = fallbackProvider({
      type: "question",
      question: "Is your person known for a niche field?",
      questionId: "long-tail-recovery",
      confidence: 0.4,
      memorySummary: "exploring beyond the seed pool",
      candidateHypotheses: [],
    });
    const provider = new HybridProvider(fallback);

    const result = await provider.playTurn(
      context({
        rejectedGuesses: ["Virat Kohli"],
        turnReason: "rejected_guess",
      }),
    );

    expect(result.type).toBe("question");
    expect(fallback.playTurn).toHaveBeenCalledTimes(1);
    const forwarded = fallback.playTurn.mock.calls[0]?.[0] as AIProviderContext;
    expect(forwarded.aiMemory.candidateHypotheses).toEqual([]);
    expect(forwarded.aiMemory.summary).toMatch(/Explore outside/i);
  });
});
