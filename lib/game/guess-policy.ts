import { MAX_QUESTIONS } from "./config";
import type { GameAnswer } from "./types";

export const REQUIRED_CONFIRMATION_ANSWERS = 2;
export const MIN_GUESS_ANSWERS = 8;
export const MIN_REAL_GIVE_UP_ANSWERS = 26;
export const MIN_FICTIONAL_GIVE_UP_ANSWERS = 28;
const CONFIRMATION_PREFIX = "confirm_";
const CONFIRMATION_SEPARATOR = "__";

export function getGuessConfidenceThreshold(answerCount: number): number | null {
  if (
    !Number.isInteger(answerCount) ||
    answerCount < MIN_GUESS_ANSWERS ||
    answerCount >= MAX_QUESTIONS
  ) {
    return null;
  }

  if (answerCount <= 12) return 0.95;
  if (answerCount <= 20) return 0.88;
  if (answerCount <= 25) return 0.82;
  return 0.76;
}

export function canMakeGuess(answerCount: number, confidence: number): boolean {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return false;
  const threshold = getGuessConfidenceThreshold(answerCount);
  return threshold !== null && confidence >= threshold;
}

export function normalizeGuess(name: string): string {
  return name
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function confirmationSlug(name: string): string {
  return normalizeGuess(name)
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 28) || "candidate";
}

export function makeConfirmationQuestionId(
  candidateName: string,
  baseQuestionId: string,
  expectedAnswer: boolean,
): string {
  const expectation = expectedAnswer ? "y" : "n";
  const prefix = `${CONFIRMATION_PREFIX}${confirmationSlug(candidateName)}${CONFIRMATION_SEPARATOR}${expectation}${CONFIRMATION_SEPARATOR}`;
  return `${prefix}${baseQuestionId}`.slice(0, 80);
}

export function parseConfirmationQuestionId(
  questionId: string,
): { candidateSlug: string; expectedAnswer: boolean; baseQuestionId: string } | null {
  if (!questionId.startsWith(CONFIRMATION_PREFIX)) return null;
  const first = questionId.indexOf(CONFIRMATION_SEPARATOR, CONFIRMATION_PREFIX.length);
  if (first < 0) return null;
  const second = questionId.indexOf(CONFIRMATION_SEPARATOR, first + CONFIRMATION_SEPARATOR.length);
  if (second < 0) return null;

  const candidateSlug = questionId.slice(CONFIRMATION_PREFIX.length, first);
  const expectation = questionId.slice(first + CONFIRMATION_SEPARATOR.length, second);
  const baseQuestionId = questionId.slice(second + CONFIRMATION_SEPARATOR.length);
  if (!candidateSlug || !baseQuestionId || (expectation !== "y" && expectation !== "n")) return null;
  return { candidateSlug, expectedAnswer: expectation === "y", baseQuestionId };
}

export function isConfirmationQuestionForCandidate(questionId: string, candidateName: string): boolean {
  const parsed = parseConfirmationQuestionId(questionId);
  return parsed?.candidateSlug === confirmationSlug(candidateName);
}

export function candidateConfirmationEvidence(
  history: readonly GameAnswer[],
  candidateName: string,
): { positive: number; negative: number; unknown: number } {
  let positive = 0;
  let negative = 0;
  let unknown = 0;

  for (const entry of history) {
    const parsed = parseConfirmationQuestionId(entry.questionId);
    if (!parsed || parsed.candidateSlug !== confirmationSlug(candidateName)) continue;
    if (entry.answer === "unknown") {
      unknown += 1;
      continue;
    }

    const userPositive = entry.answer === "yes" || entry.answer === "probably";
    const agrees = parsed.expectedAnswer ? userPositive : !userPositive;
    if (agrees) positive += 1;
    else negative += 1;
  }

  return { positive, negative, unknown };
}

export function hasEnoughConfirmationEvidence(
  history: readonly GameAnswer[],
  candidateName: string,
): boolean {
  const evidence = candidateConfirmationEvidence(history, candidateName);
  return evidence.negative === 0 && evidence.positive >= REQUIRED_CONFIRMATION_ANSWERS;
}

export function minimumGiveUpAnswers(history: readonly GameAnswer[]): number {
  const first = history.find((entry) => entry.questionId === "first-real-person")?.answer;
  const fictional = first === "no" || first === "probably_not";
  return fictional ? MIN_FICTIONAL_GIVE_UP_ANSWERS : MIN_REAL_GIVE_UP_ANSWERS;
}

export function canGiveUp(history: readonly GameAnswer[]): boolean {
  return history.length >= minimumGiveUpAnswers(history);
}

export function isRejectedGuess(name: string, rejectedGuesses: readonly string[]): boolean {
  const normalized = normalizeGuess(name);
  return (
    normalized.length > 0 &&
    rejectedGuesses.some((rejected) => normalizeGuess(rejected) === normalized)
  );
}
