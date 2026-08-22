import { MAX_QUESTIONS } from "./config";

export function getGuessConfidenceThreshold(answerCount: number): number | null {
  if (!Number.isInteger(answerCount) || answerCount < 1 || answerCount >= MAX_QUESTIONS) {
    return null;
  }

  if (answerCount <= 5) return 0.98;
  if (answerCount <= 10) return 0.94;
  if (answerCount <= 20) return 0.84;
  return 0.7;
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

export function isRejectedGuess(name: string, rejectedGuesses: readonly string[]): boolean {
  const normalized = normalizeGuess(name);
  return (
    normalized.length > 0 &&
    rejectedGuesses.some((rejected) => normalizeGuess(rejected) === normalized)
  );
}

