import { describe, expect, it } from "vitest";

import {
  canMakeGuess,
  getGuessConfidenceThreshold,
  isRejectedGuess,
} from "@/lib/game/guess-policy";

describe("guess policy", () => {
  it("uses the confirmation-first confidence thresholds", () => {
    expect(getGuessConfidenceThreshold(1)).toBeNull();
    expect(getGuessConfidenceThreshold(7)).toBeNull();
    expect(getGuessConfidenceThreshold(8)).toBe(0.95);
    expect(getGuessConfidenceThreshold(12)).toBe(0.95);
    expect(getGuessConfidenceThreshold(13)).toBe(0.88);
    expect(getGuessConfidenceThreshold(20)).toBe(0.88);
    expect(getGuessConfidenceThreshold(21)).toBe(0.82);
    expect(getGuessConfidenceThreshold(25)).toBe(0.82);
    expect(getGuessConfidenceThreshold(26)).toBe(0.76);
    expect(canMakeGuess(8, 0.95)).toBe(true);
    expect(canMakeGuess(8, 0.949)).toBe(false);
  });

  it("forbids zero-answer and maximum-question guesses", () => {
    expect(getGuessConfidenceThreshold(0)).toBeNull();
    expect(getGuessConfidenceThreshold(30)).toBeNull();
    expect(canMakeGuess(0, 1)).toBe(false);
    expect(canMakeGuess(30, 1)).toBe(false);
  });

  it("matches rejected guesses without case or punctuation sensitivity", () => {
    expect(isRejectedGuess("Sherlock-Holmes", ["sherlock holmes"])).toBe(true);
  });
});
