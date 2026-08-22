import { describe, expect, it } from "vitest";

import {
  analyzeCandidates,
  selectBestQuestion,
  selectConfirmationQuestion,
} from "@/lib/engine/scoring";
import {
  hasEnoughConfirmationEvidence,
  parseConfirmationQuestionId,
} from "@/lib/game/guess-policy";
import type { AnswerType, GameAnswer } from "@/lib/game/types";

function answer(questionId: string, question: string, value: AnswerType): GameAnswer {
  return { questionId, question, answer: value, timestamp: 1 };
}

describe("SBD candidate engine", () => {
  it("uses structured answers to concentrate probability on the correct category", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "yes"),
      answer("alive", "Is your person alive today?", "yes"),
      answer("man", "Is your person a man?", "yes"),
      answer("india", "Is your person strongly associated with India?", "yes"),
      answer("sports", "Is your person mainly famous for sports?", "yes"),
      answer("cricket", "Is your person famous for cricket?", "yes"),
    ];

    const analysis = analyzeCandidates(history);
    const topNames = analysis.ranked.slice(0, 8).map((item) => item.candidate.name);

    expect(analysis.recognizedAnswers).toBe(6);
    expect(topNames).toContain("Virat Kohli");
    expect(topNames).toContain("MS Dhoni");
    expect(analysis.topProbability).toBeGreaterThan(0);
    expect(analysis.confidence).toBeGreaterThan(0);
    expect(analysis.confidence).toBeLessThanOrEqual(1);
  });

  it("selects a new high-information question instead of repeating history", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "yes"),
    ];

    const selected = selectBestQuestion(history);
    expect(selected).not.toBeNull();
    expect(selected?.question.id).not.toBe("first-real-person");
    expect(selected?.informationGain).toBeGreaterThan(0.28);
  });

  it("does not ask real-person questions after the user established fiction", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "no"),
    ];
    const selected = selectBestQuestion(history);
    const realOnly = new Set(["alive", "india", "usa", "sports", "acting", "music", "politics", "business", "cricket"]);
    expect(selected).not.toBeNull();
    expect(realOnly.has(selected?.question.id ?? "")).toBe(false);
  });

  it("uses two candidate-specific confirmation questions before a Pat Cummins guess", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "yes"),
      answer("man", "Is your person a man?", "yes"),
      answer("sports", "Is your person mainly famous for sports?", "yes"),
      answer("cricket", "Is your person famous for cricket?", "yes"),
      answer("australia", "Is your person strongly associated with Australia?", "yes"),
      answer("cricket-bowler", "Is your cricketer mainly known as a bowler?", "yes"),
      answer("cricket-captain", "Has your cricketer captained their national team?", "yes"),
      answer("born-after-1980", "Was your person born in 1980 or later?", "yes"),
    ];

    const first = selectConfirmationQuestion(history);
    expect(first?.candidateName).toBe("Pat Cummins");
    expect(first?.question.id).toMatch(/^confirm_pat-cummins__/);
    const firstMeta = first ? parseConfirmationQuestionId(first.question.id) : null;
    expect(firstMeta).not.toBeNull();

    const withFirst = first && firstMeta
      ? [...history, answer(first.question.id, first.question.text, firstMeta.expectedAnswer ? "yes" : "no")]
      : history;
    const second = selectConfirmationQuestion(withFirst);
    expect(second?.candidateName).toBe("Pat Cummins");
    const secondMeta = second ? parseConfirmationQuestionId(second.question.id) : null;
    expect(secondMeta).not.toBeNull();

    const withSecond = second && secondMeta
      ? [...withFirst, answer(second.question.id, second.question.text, secondMeta.expectedAnswer ? "yes" : "no")]
      : withFirst;
    expect(hasEnoughConfirmationEvidence(withSecond, "Pat Cummins")).toBe(true);
  });

  it("removes explicitly rejected guesses from the posterior", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "no"),
      answer("superhero", "Is your character a superhero?", "yes"),
      answer("marvel", "Is your character from Marvel?", "yes"),
    ];

    const before = analyzeCandidates(history);
    const rejectedName = before.ranked[0]?.candidate.name;
    expect(rejectedName).toBeTruthy();

    const after = analyzeCandidates(history, rejectedName ? [rejectedName] : []);
    expect(after.ranked.some((item) => item.candidate.name === rejectedName)).toBe(false);
  });

  it("treats unknown answers as weak evidence instead of eliminating candidates", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", "yes"),
      answer("india", "Is your person strongly associated with India?", "unknown"),
    ];

    const analysis = analyzeCandidates(history);
    expect(analysis.unknownAnswers).toBe(1);
    expect(analysis.ranked.length).toBeGreaterThan(50);
  });
});
