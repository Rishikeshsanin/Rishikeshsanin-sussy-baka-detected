import { describe, expect, it } from "vitest";

import {
  isDuplicateQuestion,
  normalizeQuestion,
} from "@/lib/game/question-normalization";

describe("question normalization", () => {
  it("normalizes case, punctuation, apostrophes, and whitespace", () => {
    expect(normalizeQuestion("  IS   your character alive?  ")).toBe(
      "is your character alive",
    );
    expect(normalizeQuestion("Isn’t this fictional?")).toBe(
      "is not this fictional",
    );
  });

  it("detects obvious semantic paraphrases", () => {
    expect(
      isDuplicateQuestion("Is the person a man?", ["Is your character male?"]),
    ).toBe(true);
    expect(
      isDuplicateQuestion("Is your character living?", ["Is the person alive?"]),
    ).toBe(true);
  });

  it("preserves negation so opposite questions are not duplicates", () => {
    expect(
      isDuplicateQuestion("Is your character not alive?", ["Is your character alive?"]),
    ).toBe(false);
  });
});
