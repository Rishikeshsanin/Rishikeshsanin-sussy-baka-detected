import { describe, expect, it } from "vitest";

import { analyzeCandidates } from "@/lib/engine/scoring";
import type { GameAnswer } from "@/lib/game/types";

const answer = (
  questionId: string,
  question: string,
  timestamp: number,
): GameAnswer => ({
  questionId,
  question,
  answer: "yes",
  timestamp,
});

describe("international cricket candidate pool", () => {
  it("ranks Pat Cummins first from distinctive structured evidence", () => {
    const history: GameAnswer[] = [
      answer("first-real-person", "Is your character a real person?", 1),
      answer("alive", "Is your person alive today?", 2),
      answer("man", "Is your person a man?", 3),
      answer("sports", "Is your person mainly famous for sports?", 4),
      answer("cricket", "Is your person famous for cricket?", 5),
      answer("australia", "Is your person strongly associated with Australia?", 6),
      answer("cricket-bowler", "Is your cricketer mainly known as a bowler?", 7),
      answer("cricket-captain", "Has your cricketer captained their national team?", 8),
      answer("born-after-1980", "Was your person born in 1980 or later?", 9),
    ];

    const analysis = analyzeCandidates(history);

    expect(analysis.ranked[0]?.candidate.name).toBe("Pat Cummins");
    expect(analysis.topProbability).toBeGreaterThan(0.5);
  });
});
