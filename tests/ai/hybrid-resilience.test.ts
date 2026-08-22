import { describe, expect, it, vi } from "vitest";

import { HybridProvider } from "@/lib/ai/hybrid-provider";
import { AIError, type AIProvider, type AIProviderContext } from "@/lib/ai/types";

function baseContext(): AIProviderContext {
  return {
    gameId: "resilience-test",
    questionNumber: 8,
    history: [
      { questionId: "first-real-person", question: "Is your character a real person?", answer: "yes", timestamp: 1 },
      { questionId: "alive", question: "Is your person alive today?", answer: "yes", timestamp: 2 },
      { questionId: "man", question: "Is your person a man?", answer: "yes", timestamp: 3 },
      { questionId: "sports", question: "Is your person mainly famous for sports?", answer: "yes", timestamp: 4 },
      { questionId: "cricket", question: "Is your person famous for cricket?", answer: "yes", timestamp: 5 },
    ],
    rejectedGuesses: ["Virat Kohli"],
    aiMemory: { summary: "", candidateHypotheses: [] },
    turnReason: "rejected_guess",
  };
}

describe("HybridProvider resilience", () => {
  it("continues with a local question when the external AI is unavailable", async () => {
    const fallback: AIProvider & { playTurn: ReturnType<typeof vi.fn> } = {
      name: "gemini",
      playTurn: vi.fn(async () => {
        throw new AIError("NETWORK_ERROR", "Gemini timed out");
      }),
    };

    const provider = new HybridProvider(fallback);
    const result = await provider.playTurn(baseContext());

    expect(fallback.playTurn).toHaveBeenCalledTimes(1);
    expect(result.type).toBe("question");
    if (result.type === "question") {
      expect(result.question).toMatch(/\?$/);
      expect(result.memorySummary).toMatch(/continuing locally|recovery evidence/i);
    }
  });
});
