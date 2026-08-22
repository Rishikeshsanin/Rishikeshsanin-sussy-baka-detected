import { MAX_QUESTIONS } from "./config";
import type { GameAnswer } from "./types";

export const REQUIRED_CONFIRMATION_ANSWERS = 2;
export const MIN_GUESS_ANSWERS = 8;
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

  // SBD should prefer one or two extra useful questions over a flashy early miss.
  if (answerCount <= 12) return 0.95;
  if (answerCount <= 20) return 0.88;
  if (answerCount <= 25) return 0.82;
  return 0.76;
}

export function canMakeGuess(answerCount: number, confidence: number): boolean {
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return false;
  }

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

export function makeConfirmationQuestionId(candidateName: string, baseQuestionId: string): string {
  const prefix = `${CONFIRMATION_PREFIX}${confirmationSlug(candidateName)}${CONFIRMATION_SEPARATOR}`;
  return `${prefix}${baseQuestionId}`.slice(0, 80);
}

export function parseConfirmationQuestionId(
  questionId: string,
): { candidateSlug: string; baseQuestionId: string } | null {
  if (!questionId.startsWith(CONFIRMATION_PREFIX)) return null;
  const separatorIndex = questionId.indexOf(CONFIRMATION_SEPARATOR, CONFIRMATION_PREFIX.length);
  if (separatorIndex < 0) return null;

  const candidateSlug = questionId.slice(CONFIRMATION_PREFIX.length, separatorIndex);
  const baseQuestionId = questionId.slice(separatorIndex + CONFIRMATION_SEPARATOR.length);
  if (!candidateSlug || !baseQuestionId) return null;
  return { candidateSlug, baseQuestionId };
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
    if (!isConfirmationQuestionForCandidate(entry.questionId, candidateName)) continue;
    if (entry.answer === "yes" || entry.answer === "probably") positive += 1;
    else if (entry.answer === "no" || entry.answer === "probably_not") negative += 1;
    else unknown += 1;
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

export function isRejectedGuess(name: string, rejectedGuesses: readonly string[]): boolean {
  const normalized = normalizeGuess(name);
  return (
    normalized.length > 0 &&
    rejectedGuesses.some((rejected) => normalizeGuess(rejected) === normalized)
  );
}
