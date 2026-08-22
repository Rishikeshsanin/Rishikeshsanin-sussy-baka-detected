import { describe, expect, it } from "vitest";

import { MockProvider } from "../../lib/ai/mock-provider";
import type { AIProviderContext } from "../../lib/ai/types";

type GameAnswer = AIProviderContext["history"][number];

describe("MockProvider", () => {
  it("plays a complete Sherlock Holmes path", async () => {
    const provider = new MockProvider();
    const history: GameAnswer[] = [
      answer("first-question", "Is your character a real person?", "no", 1),
    ];

    let response = await provider.playTurn(context(history));
    while (response.type === "question") {
      history.push(answer(response.questionId, response.question, "yes", history.length + 1));
      response = await provider.playTurn(context(history));
    }

    expect(history).toHaveLength(6);
    expect(response).toMatchObject({
      type: "guess",
      name: "Sherlock Holmes",
      confidence: 0.97,
    });
  });

  it("asks a new question after rejection before making another guess", async () => {
    const provider = new MockProvider();
    const history: GameAnswer[] = [
      answer("first-question", "Is your character a real person?", "no", 1),
      answer("mock-human", "Is your character human?", "yes", 2),
      answer("mock-books", "Did your character first become famous through books?", "yes", 3),
      answer("mock-mysteries", "Is your character known for solving mysteries?", "yes", 4),
      answer("mock-british", "Is your character strongly associated with Britain?", "yes", 5),
      answer(
        "mock-victorian",
        "Are your character's stories set mainly in the Victorian era?",
        "yes",
        6,
      ),
    ];

    const followUp = await provider.playTurn({
      ...context(history),
      rejectedGuesses: ["Sherlock Holmes"],
      turnReason: "rejected_guess",
    });

    expect(followUp).toMatchObject({ type: "question", questionId: "mock-moustache" });
    if (followUp.type !== "question") {
      throw new Error("Expected a follow-up question");
    }

    history.push(answer(followUp.questionId, followUp.question, "yes", 7));
    const nextGuess = await provider.playTurn({
      ...context(history),
      rejectedGuesses: ["Sherlock Holmes"],
    });

    expect(nextGuess).toMatchObject({ type: "guess", name: "Hercule Poirot" });
  });

  it("gives up at the maximum history length", async () => {
    const provider = new MockProvider();
    const history = Array.from({ length: 30 }, (_, index) =>
      answer(`q-${index + 1}`, `Is clue number ${index + 1} true?`, "unknown", index + 1),
    );

    await expect(provider.playTurn(context(history))).resolves.toMatchObject({ type: "give_up" });
  });
});

function context(history: GameAnswer[]): AIProviderContext {
  return {
    gameId: "mock-game",
    questionNumber: history.length,
    history,
    rejectedGuesses: [],
    aiMemory: { summary: "", candidateHypotheses: [] },
    turnReason: "answer",
  };
}

function answer(
  questionId: string,
  question: string,
  value: GameAnswer["answer"],
  timestamp: number,
): GameAnswer {
  return { questionId, question, answer: value, timestamp };
}
