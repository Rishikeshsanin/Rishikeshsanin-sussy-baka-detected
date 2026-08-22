import { describe, expect, it } from "vitest";

import type { CandidateProfile } from "@/lib/engine/candidates";
import {
  analyzeCandidates,
  candidateHasTag,
  mergeCandidatePools,
} from "@/lib/engine/scoring";
import type { GameAnswer } from "@/lib/game/types";

function answer(questionId: string, question: string, value: GameAnswer["answer"], index: number): GameAnswer {
  return {
    questionId,
    question,
    answer: value,
    timestamp: index + 1,
  };
}

describe("dynamic candidate scoring", () => {
  it("treats missing live-extracted traits as unknown instead of false", () => {
    const liveCandidate: CandidateProfile = {
      name: "Current Person",
      tags: ["real"],
      source: "wikimedia",
      prior: 1,
    };
    const staticCandidate: CandidateProfile = {
      name: "Static Person",
      tags: ["real"],
      source: "seed",
      prior: 1,
    };

    const analysis = analyzeCandidates(
      [answer("sports", "Is your person mainly famous for sports?", "yes", 0)],
      [],
      [staticCandidate, liveCandidate],
    );

    expect(analysis.ranked[0]?.candidate.name).toBe("Current Person");
    expect(analysis.ranked[0]?.probability).toBeGreaterThan(0.8);
  });

  it("deduplicates a discovered person against the hot pool and preserves verified tags", () => {
    const seed: CandidateProfile = {
      name: "Pat Cummins",
      tags: ["real", "sports", "cricket"],
      source: "seed",
      prior: 1.1,
    };
    const live: CandidateProfile = {
      name: "Pat Cummins",
      tags: ["real", "australia", "bowler", "captain"],
      source: "wikimedia",
      sourceId: "Q123",
      prior: 1.3,
      popularityScore: 80,
    };

    const merged = mergeCandidatePools([seed], [live]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.source).toBe("seed");
    expect(merged[0]?.tags).toEqual(
      expect.arrayContaining(["real", "sports", "cricket", "australia", "bowler", "captain"]),
    );
    expect(merged[0]?.prior).toBe(1.3);
    expect(merged[0]?.sourceId).toBe("Q123");
  });

  it("derives broad geography from specific country tags", () => {
    const australian: CandidateProfile = {
      name: "Australian Person",
      tags: ["real", "australia"],
      source: "wikimedia",
    };

    expect(candidateHasTag(australian, "oceania")).toBe(true);
    expect(candidateHasTag(australian, "asia")).toBe(false);
  });
});
