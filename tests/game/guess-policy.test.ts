import { describe, expect, it } from "vitest";

import {
  canMakeGuess,
  getGuessConfidenceThreshold,
  isRejectedGuess,
} from "@/lib/game/guess-policy";

describe("guess policy", () => {
  it("uses the staged inclusive confidence thresholds", () => {
    expect(getGuessConfidenceThreshold(1)).toBe(0.98);
    expect(getGuessConfidenceThreshold(6)).toBe(0.94);
    expect(getGuessConfidenceThreshold(11)).toBe(0.84);
    expect(getGuessConfidenceThreshold(21)).toBe(0.7);
    expect(canMakeGuess(6, 0.94)).toBe(true);
    expect(canMakeGuess(6, 0.939)).toBe(false);
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
