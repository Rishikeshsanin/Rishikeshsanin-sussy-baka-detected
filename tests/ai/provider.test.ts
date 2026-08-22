import { describe, expect, it } from "vitest";

import {
  createMaxQuestionsGiveUp,
  guessConfidenceThreshold,
  playValidatedTurn,
} from "../../lib/ai/provider";
import { makeConfirmationQuestionId } from "../../lib/game/guess-policy";
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

  it("turns an unconfirmed strong lead into another question", async () => {
    const history = Array.from({ length: 8 }, (_, index) => ({
      questionId: `evidence-${index + 1}`,
      question: `Is evidence clue ${index + 1} true?`,
      answer: "yes" as const,
      timestamp: index + 1,
    }));
    const provider = new SequenceProvider([
      guess("Pat Cummins", 0.99),
      question("confirm-bowling-style", "Is your person primarily known as a bowler?"),
    ]);

    await expect(
      playValidatedTurn(provider, request({ history, questionNumber: 8 })),
    ).resolves.toMatchObject({ type: "question", questionId: "confirm-bowling-style" });
    expect(provider.contexts[1]?.correction).toMatch(/do NOT guess yet/i);
  });

  it("converts a direct identity question into a counted guess when confirmation is satisfied", async () => {
    const history = [
      evidence("real", 1),
      evidence("male", 2),
      evidence("actor", 3),
      evidence("telugu", 4),
      evidence("alive", 5),
      evidence("modern", 6),
      {
        questionId: makeConfirmationQuestionId("Vijay Deverakonda", "acting", true),
        question: "Is your person mainly known for acting?",
        answer: "yes" as const,
        timestamp: 7,
      },
      {
        questionId: makeConfirmationQuestionId("Vijay Deverakonda", "tollywood", true),
        question: "Is your person strongly associated with Telugu cinema?",
        answer: "probably" as const,
        timestamp: 8,
      },
    ];
    const provider = new SequenceProvider([
      identityQuestion("Is that Vijay Deverakonda?", "Vijay Deverakonda", 0.97),
    ]);

    await expect(
      playValidatedTurn(provider, request({ history, questionNumber: 8 })),
    ).resolves.toMatchObject({
      type: "guess",
      name: "Vijay Deverakonda",
    });
    expect(provider.contexts).toHaveLength(1);
  });

  it("never exposes a direct identity question for free before confirmation", async () => {
    const history = Array.from({ length: 8 }, (_, index) => evidence(`clue-${index + 1}`, index + 1));
    const provider = new SequenceProvider([
      identityQuestion("Is that Vijay Deverakonda?", "Vijay Deverakonda", 0.99),
      question("film-industry", "Is your person mainly known for acting in films?"),
    ]);

    await expect(
      playValidatedTurn(provider, request({ history, questionNumber: 8 })),
    ).resolves.toMatchObject({ type: "question", questionId: "film-industry" });
    expect(provider.contexts).toHaveLength(2);
    expect(provider.contexts[1]?.correction).toMatch(/do NOT guess yet/i);
    expect(provider.contexts[1]?.correction).toMatch(/do NOT put the candidate's name/i);
  });

  it("does not allow an early give-up on a long-tail round", async () => {
    const history = Array.from({ length: 12 }, (_, index) => ({
      questionId: `long-tail-${index + 1}`,
      question: `Is long-tail clue ${index + 1} true?`,
      answer: "unknown" as const,
      timestamp: index + 1,
    }));
    const provider = new SequenceProvider([
      giveUp(),
      question("keep-searching", "Is your character part of a long-running franchise?"),
    ]);

    await expect(
      playValidatedTurn(provider, request({ history, questionNumber: 12 })),
    ).resolves.toMatchObject({ type: "question", questionId: "keep-searching" });
    expect(provider.contexts[1]?.correction).toMatch(/Do not GIVE_UP yet/i);
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
    [1, null],
    [7, null],
    [8, 0.95],
    [12, 0.95],
    [13, 0.88],
    [20, 0.88],
    [21, 0.82],
    [25, 0.82],
    [26, 0.76],
  ])("uses the confirmation-first policy for %i completed questions", (questions, threshold) => {
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
    if (!response) throw new Error("No fake response configured");
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

function evidence(questionId: string, timestamp: number) {
  return {
    questionId,
    question: `Is ${questionId} true?`,
    answer: "yes" as const,
    timestamp,
  };
}

function question(questionId: string, text: string): GameAIResponse {
  return {
    type: "question",
    questionId,
    question: text,
    confidence: 0.4,
    memorySummary: "The detector is still narrowing the field.",
    candidateHypotheses: [],
  };
}

function identityQuestion(text: string, name: string, confidence: number): GameAIResponse {
  return {
    type: "question",
    questionId: "identity-leak",
    question: text,
    confidence,
    memorySummary: "The detector has a strong lead.",
    candidateHypotheses: [name],
  };
}

function guess(name: string, confidence: number): GameAIResponse {
  return {
    type: "guess",
    name,
    confidence,
    memorySummary: "A strong candidate exists.",
    candidateHypotheses: [name],
  };
}

function giveUp(): GameAIResponse {
  return {
    type: "give_up",
    message: "I give up.",
    confidence: 0,
    memorySummary: "The candidate is obscure.",
  };
}
