import { describe, expect, it } from "vitest";

import {
  createMaxQuestionsGiveUp,
  guessConfidenceThreshold,
  playValidatedTurn,
} from "../../lib/ai/provider";
import { AIError, type AIProvider, type AIProviderContext, type GameAIResponse, type TurnRequest } from "../../lib/ai/types";

describe("playValidatedTurn", () => {
  it("corrects one duplicate question and accepts the replacement", async () => {
    const provider = new SequenceProvider([
      question("duplicate", "Is your character a real person?"),
      question("human", "Is your character human?"),
    ]);

    await expect(playValidatedTurn(provider, request())).resolves.toMatchObject({
      type: "question",
      questionId: "human",
    });
    expect(provider.contexts).toHaveLength(2);
    expect(provider.contexts[1]?.correction).toContain("repeated");
  });

  it("requires a question immediately after a rejected guess", async () => {
    const provider = new SequenceProvider([
      guess("Hercule Poirot", 0.99),
      question("moustache", "Is your character famous for a distinctive moustache?"),
    ]);

    await expect(
      playValidatedTurn(
        provider,
        request({
          rejectedGuesses: ["Sherlock Holmes"],
          turnReason: "rejected_guess",
        }),
      ),
    ).resolves.toMatchObject({ type: "question", questionId: "moustache" });
    expect(provider.contexts[1]?.correction).toContain("just rejected");
  });

  it("rejects low-confidence early guesses and retries only once", async () => {
    const provider = new SequenceProvider([
      guess("Sherlock Holmes", 0.9),
      guess("Sherlock Holmes", 0.97),
      question("unused", "Is your character human?"),
    ]);

    await expect(playValidatedTurn(provider, request())).rejects.toMatchObject({
      code: "INVALID_AI_RESPONSE",
    });
    expect(provider.contexts).toHaveLength(2);
  });

  it("never permits a rejected guess again", async () => {
    const provider = new SequenceProvider([
      guess("sherlock-holmes", 0.99),
      question("detective", "Is your character known for detective work?"),
    ]);

    await expect(
      playValidatedTurn(
        provider,
        request({ rejectedGuesses: ["Sherlock Holmes"] }),
      ),
    ).resolves.toMatchObject({ type: "question", questionId: "detective" });
  });

  it("gives up at question 30 without calling the provider", async () => {
    const provider = new SequenceProvider([question("unused", "Is your character human?")]);
    const history = Array.from({ length: 30 }, (_, index) => ({
      questionId: `q-${index + 1}`,
      question: `Is clue number ${index + 1} true?`,
      answer: "unknown" as const,
      timestamp: index + 1,
    }));
    const maxRequest = request({ history, questionNumber: 30 });

    await expect(playValidatedTurn(provider, maxRequest)).resolves.toEqual(
      createMaxQuestionsGiveUp(maxRequest),
    );
    expect(provider.contexts).toHaveLength(0);
  });

  it("turns provider timeouts into a safe typed error", async () => {
    const provider: AIProvider = {
      name: "mock",
      playTurn: async () => new Promise<GameAIResponse>(() => undefined),
    };

    await expect(playValidatedTurn(provider, request(), { timeoutMs: 5 })).rejects.toEqual(
      expect.objectContaining<Partial<AIError>>({ code: "NETWORK_ERROR" }),
    );
  });
});

describe("guessConfidenceThreshold", () => {
  it.each([
    [1, 0.98],
    [5, 0.98],
    [6, 0.94],
    [10, 0.94],
    [11, 0.84],
    [20, 0.84],
    [21, 0.7],
  ])("uses the policy for %i completed questions", (questions, threshold) => {
    expect(guessConfidenceThreshold(questions)).toBe(threshold);
  });
});

class SequenceProvider implements AIProvider {
  readonly name = "mock" as const;
  readonly contexts: AIProviderContext[] = [];

  constructor(private readonly responses: readonly GameAIResponse[]) {}

  async playTurn(context: AIProviderContext): Promise<GameAIResponse> {
    this.contexts.push(context);
    const response = this.responses[Math.min(this.contexts.length - 1, this.responses.length - 1)];
    if (!response) {
      throw new Error("No fake response configured");
    }
    return response;
  }
}

function request(overrides: Partial<TurnRequest> = {}): TurnRequest {
  return {
    gameId: "game-1",
    questionNumber: 1,
    history: [
      {
        questionId: "first-question",
        question: "Is your character a real person?",
        answer: "no",
        timestamp: 1,
      },
    ],
    rejectedGuesses: [],
    aiMemory: { summary: "The character is fictional.", candidateHypotheses: [] },
    turnReason: "answer",
    ...overrides,
  };
}

function question(questionId: string, text: string): GameAIResponse {
  return {
    type: "question",
    questionId,
    question: text,
    confidence: 0.4,
    memorySummary: "The character is likely fictional.",
    candidateHypotheses: [],
  };
}

function guess(name: string, confidence: number): GameAIResponse {
  return {
    type: "guess",
    name,
    confidence,
    memorySummary: "A fictional detective from literature.",
    candidateHypotheses: [name],
  };
}
