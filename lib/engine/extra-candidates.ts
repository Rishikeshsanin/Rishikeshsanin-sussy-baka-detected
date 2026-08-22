import type { CandidateProfile } from "./candidates";

const real = (name: string, tags: readonly string[], prior?: number): CandidateProfile => ({
  name,
  tags: ["real", ...tags],
  prior,
});

/**
 * Extra high-frequency international-cricket candidates.
 * Kept separate from the original seed file so the pool can grow by domain
 * without turning the core candidate module into one giant hand-edited list.
 */
export const EXTRA_CANDIDATES: readonly CandidateProfile[] = [
  real("Pat Cummins", ["alive", "man", "sports", "cricket", "australia", "bowler", "captain", "born_after_1980"], 1.15),
  real("Steve Smith", ["alive", "man", "sports", "cricket", "australia", "batter", "captain", "born_after_1980"], 1.05),
  real("Travis Head", ["alive", "man", "sports", "cricket", "australia", "batter", "born_after_1980"], 0.95),
  real("Mitchell Starc", ["alive", "man", "sports", "cricket", "australia", "bowler", "born_after_1980"], 0.95),
  real("Glenn Maxwell", ["alive", "man", "sports", "cricket", "australia", "all_rounder", "born_after_1980"], 0.9),
  real("David Warner", ["alive", "man", "sports", "cricket", "australia", "batter", "born_after_1980"], 0.95),
  real("Ricky Ponting", ["alive", "man", "sports", "cricket", "australia", "batter", "captain", "born_before_1980"], 1.0),
  real("Brett Lee", ["alive", "man", "sports", "cricket", "australia", "bowler", "born_before_1980"], 0.9),
  real("Adam Gilchrist", ["alive", "man", "sports", "cricket", "australia", "batter", "born_before_1980"], 0.9),
  real("Shane Warne", ["man", "sports", "cricket", "australia", "bowler", "historical", "born_before_1980"], 1.0),
  real("Joe Root", ["alive", "man", "sports", "cricket", "uk", "batter", "captain", "born_after_1980"], 1.0),
  real("Ben Stokes", ["alive", "man", "sports", "cricket", "uk", "all_rounder", "captain", "born_after_1980"], 1.0),
  real("James Anderson", ["alive", "man", "sports", "cricket", "uk", "bowler", "born_after_1980"], 0.95),
  real("Babar Azam", ["alive", "man", "sports", "cricket", "pakistan", "batter", "captain", "born_after_1980"], 1.0),
  real("Shaheen Shah Afridi", ["alive", "man", "sports", "cricket", "pakistan", "bowler", "born_after_1980"], 0.9),
  real("Kane Williamson", ["alive", "man", "sports", "cricket", "new_zealand", "batter", "captain", "born_after_1980"], 1.0),
  real("Trent Boult", ["alive", "man", "sports", "cricket", "new_zealand", "bowler", "born_after_1980"], 0.9),
  real("AB de Villiers", ["alive", "man", "sports", "cricket", "south_africa", "batter", "born_after_1980"], 1.05),
  real("Jacques Kallis", ["alive", "man", "sports", "cricket", "south_africa", "all_rounder", "born_before_1980"], 0.95),
  real("Chris Gayle", ["alive", "man", "sports", "cricket", "west_indies", "batter", "born_before_1980"], 1.0),
  real("Brian Lara", ["alive", "man", "sports", "cricket", "west_indies", "batter", "born_before_1980"], 0.95),
  real("Shakib Al Hasan", ["alive", "man", "sports", "cricket", "bangladesh", "all_rounder", "captain", "born_after_1980"], 0.9),
  real("Kumar Sangakkara", ["alive", "man", "sports", "cricket", "sri_lanka", "batter", "captain", "born_before_1980"], 0.95),
  real("Muttiah Muralitharan", ["alive", "man", "sports", "cricket", "sri_lanka", "bowler", "born_before_1980"], 0.95),
];
