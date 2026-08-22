import type { AnswerType, GameAnswer } from "@/lib/game/types";
import {
  makeConfirmationQuestionId,
  parseConfirmationQuestionId,
} from "@/lib/game/guess-policy";

import { CANDIDATES, type CandidateProfile } from "./candidates";
import { EXTRA_CANDIDATES } from "./extra-candidates";
import {
  isTraitQuestionApplicable,
  QUESTION_BY_ID,
  TRAIT_QUESTIONS,
  type TraitQuestion,
} from "./questions";
import { RECOVERY_QUESTION_BY_ID } from "./recovery-question";

export interface RankedCandidate {
  candidate: CandidateProfile;
  probability: number;
  score: number;
}

export interface CandidateAnalysis {
  ranked: RankedCandidate[];
  recognizedAnswers: number;
  unknownAnswers: number;
  topProbability: number;
  runnerUpProbability: number;
  margin: number;
  confidence: number;
}

const EPSILON = 1e-12;
export const SEED_CANDIDATES: readonly CandidateProfile[] = [
  ...CANDIDATES,
  ...EXTRA_CANDIDATES,
];

const DERIVED_TAGS: Record<string, readonly string[]> = {
  asia: ["india", "pakistan", "bangladesh", "sri_lanka", "afghanistan", "japan", "korea"],
  oceania: ["australia", "new_zealand"],
  north_america: ["usa", "canada"],
  africa: ["south_africa"],
};

const EXCLUSIVE_GROUPS: readonly (readonly string[])[] = [
  ["real", "fictional"],
  ["man", "woman"],
  ["born_before_1980", "born_after_1980"],
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function answerLikelihood(answer: AnswerType, expected: boolean | null): number {
  if (answer === "unknown" || expected === null) return 0.5;

  switch (answer) {
    case "yes": return expected ? 0.94 : 0.06;
    case "no": return expected ? 0.06 : 0.94;
    case "probably": return expected ? 0.74 : 0.26;
    case "probably_not": return expected ? 0.26 : 0.74;
  }
}

export function normalizeCandidateName(name: string): string {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function candidateHasTag(candidate: CandidateProfile, tag: string): boolean {
  if (candidate.tags.includes(tag)) return true;
  return (DERIVED_TAGS[tag] ?? []).some((sourceTag) => candidate.tags.includes(sourceTag));
}

function traitExpectation(candidate: CandidateProfile, tag: string): boolean | null {
  if (candidateHasTag(candidate, tag)) return true;

  const openWorld = candidate.source === "wikimedia" || candidate.source === "learned";
  if (!openWorld) return false;

  for (const group of EXCLUSIVE_GROUPS) {
    if (!group.includes(tag)) continue;
    if (group.some((other) => other !== tag && candidateHasTag(candidate, other))) return false;
  }

  if (tag === "born_after_2000" && candidateHasTag(candidate, "born_before_1980")) return false;
  if (tag === "alive" && candidateHasTag(candidate, "historical")) return false;
  if (tag === "historical" && candidateHasTag(candidate, "alive")) return false;
  return null;
}

export function mergeCandidatePools(
  ...pools: readonly (readonly CandidateProfile[])[]
): CandidateProfile[] {
  const merged = new Map<string, CandidateProfile>();

  for (const pool of pools) {
    for (const candidate of pool) {
      const key = normalizeCandidateName(candidate.name);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, candidate);
        continue;
      }

      merged.set(key, {
        ...candidate,
        ...existing,
        tags: [...new Set([...existing.tags, ...candidate.tags])],
        prior: Math.max(existing.prior ?? 1, candidate.prior ?? 1),
        popularityScore: Math.max(existing.popularityScore ?? 0, candidate.popularityScore ?? 0),
        source: existing.source === "seed" ? "seed" : candidate.source ?? existing.source,
        sourceId: existing.sourceId ?? candidate.sourceId,
        wikipediaTitle: existing.wikipediaTitle ?? candidate.wikipediaTitle,
        description: existing.description ?? candidate.description,
      });
    }
  }

  return [...merged.values()];
}

interface ScoringQuestion { tag: string; }

function baseQuestionId(questionId: string): string {
  return parseConfirmationQuestionId(questionId)?.baseQuestionId ?? questionId;
}

function scoringQuestionForId(questionId: string): ScoringQuestion | undefined {
  const id = baseQuestionId(questionId);
  return QUESTION_BY_ID.get(id) ?? RECOVERY_QUESTION_BY_ID.get(id);
}

export function analyzeCandidates(
  history: readonly GameAnswer[],
  rejectedGuesses: readonly string[] = [],
  candidates: readonly CandidateProfile[] = SEED_CANDIDATES,
): CandidateAnalysis {
  const rejected = new Set(rejectedGuesses.map(normalizeCandidateName));
  const recognized = history
    .map((answer) => ({ answer, question: scoringQuestionForId(answer.questionId) }))
    .filter((entry): entry is { answer: GameAnswer; question: ScoringQuestion } => Boolean(entry.question));

  const scored = candidates
    .filter((candidate) => !rejected.has(normalizeCandidateName(candidate.name)))
    .map((candidate) => {
      let logScore = Math.log(Math.max(candidate.prior ?? 1, 0.05));
      for (const { answer, question } of recognized) {
        logScore += Math.log(answerLikelihood(answer.answer, traitExpectation(candidate, question.tag)) + EPSILON);
      }
      return { candidate, logScore };
    });

  if (scored.length === 0) {
    return {
      ranked: [], recognizedAnswers: recognized.length,
      unknownAnswers: history.filter((entry) => entry.answer === "unknown").length,
      topProbability: 0, runnerUpProbability: 0, margin: 0, confidence: 0,
    };
  }

  const maxLog = Math.max(...scored.map((item) => item.logScore));
  const exponentiated = scored.map((item) => ({ candidate: item.candidate, score: Math.exp(item.logScore - maxLog) }));
  const denominator = exponentiated.reduce((sum, item) => sum + item.score, 0) || 1;
  const ranked = exponentiated
    .map((item) => ({ ...item, probability: item.score / denominator }))
    .sort((a, b) => b.probability - a.probability);

  const topProbability = ranked[0]?.probability ?? 0;
  const runnerUpProbability = ranked[1]?.probability ?? 0;
  const margin = Math.max(0, topProbability - runnerUpProbability);
  const evidenceFactor = clamp(recognized.length / 12);
  const unknownPenalty = clamp(history.filter((entry) => entry.answer === "unknown").length / 10) * 0.16;
  const confidence = clamp(topProbability * 0.72 + margin * 0.34 + evidenceFactor * 0.18 - unknownPenalty);

  return {
    ranked, recognizedAnswers: recognized.length,
    unknownAnswers: history.filter((entry) => entry.answer === "unknown").length,
    topProbability, runnerUpProbability, margin, confidence,
  };
}

function binaryEntropy(probability: number): number {
  const p = clamp(probability, EPSILON, 1 - EPSILON);
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

function askedBaseQuestionIds(history: readonly GameAnswer[]): Set<string> {
  return new Set(history.map((entry) => baseQuestionId(entry.questionId)));
}

export function selectBestQuestion(
  history: readonly GameAnswer[],
  rejectedGuesses: readonly string[] = [],
  candidates: readonly CandidateProfile[] = SEED_CANDIDATES,
): { question: TraitQuestion; informationGain: number } | null {
  const analysis = analyzeCandidates(history, rejectedGuesses, candidates);
  if (analysis.ranked.length < 2) return null;

  const askedIds = askedBaseQuestionIds(history);
  let best: { question: TraitQuestion; informationGain: number } | null = null;

  for (const question of TRAIT_QUESTIONS) {
    if (askedIds.has(question.id) || !isTraitQuestionApplicable(question, history)) continue;
    const yesProbability = analysis.ranked.reduce((sum, item) => {
      const expectation = traitExpectation(item.candidate, question.tag);
      return sum + item.probability * (expectation === null ? 0.5 : expectation ? 1 : 0);
    }, 0);
    if (yesProbability <= 0.045 || yesProbability >= 0.955) continue;

    const informationGain = binaryEntropy(yesProbability);
    if (!best || informationGain > best.informationGain + 1e-9) best = { question, informationGain };
  }

  return best && best.informationGain >= 0.28 ? best : null;
}

/**
 * Ask a fact for which the leading candidate has a known expected answer and
 * close alternatives disagree. Both a correctly expected YES and a correctly
 * expected NO count as confirmation. Once the first confirmation makes the lead
 * overwhelming, a second low-entropy sanity check is still preferable to an
 * immediate reveal because it avoids spending a failed guess on a brittle clue.
 */
export function selectConfirmationQuestion(
  history: readonly GameAnswer[],
  rejectedGuesses: readonly string[] = [],
  candidates: readonly CandidateProfile[] = SEED_CANDIDATES,
): { question: TraitQuestion; informationGain: number; candidateName: string } | null {
  const analysis = analyzeCandidates(history, rejectedGuesses, candidates);
  const top = analysis.ranked[0];
  if (!top) return null;

  const askedIds = askedBaseQuestionIds(history);
  let best: {
    question: TraitQuestion;
    informationGain: number;
    score: number;
    expectedAnswer: boolean;
  } | null = null;

  for (const question of TRAIT_QUESTIONS) {
    if (askedIds.has(question.id) || !isTraitQuestionApplicable(question, history)) continue;
    const topExpectation = traitExpectation(top.candidate, question.tag);
    if (topExpectation === null) continue;

    let disagreementWeight = 0;
    const yesProbability = analysis.ranked.reduce((sum, item, index) => {
      const expectation = traitExpectation(item.candidate, question.tag);
      const yesChance = expectation === null ? 0.5 : expectation ? 1 : 0;
      if (index > 0) {
        disagreementWeight += item.probability * (
          expectation === null ? 0.3 : expectation !== topExpectation ? 1 : 0
        );
      }
      return sum + item.probability * yesChance;
    }, 0);

    const informationGain = binaryEntropy(yesProbability);
    // Prefer actual separators, but never make "the lead is already too strong"
    // a reason to skip the second confirmation. The tiny entropy bonus also keeps
    // a remaining sanity-check fact above a completely universal trait.
    const score = informationGain + disagreementWeight * 0.55;
    if (!best || score > best.score + 1e-9) {
      best = { question, informationGain, score, expectedAnswer: topExpectation };
    }
  }

  if (!best) return null;
  return {
    candidateName: top.candidate.name,
    informationGain: best.informationGain,
    question: {
      ...best.question,
      id: makeConfirmationQuestionId(top.candidate.name, best.question.id, best.expectedAnswer),
    },
  };
}

export function topCandidateNames(analysis: CandidateAnalysis, limit = 8): string[] {
  return analysis.ranked.slice(0, limit).map((item) => item.candidate.name);
}

export function summarizeAnalysis(analysis: CandidateAnalysis): string {
  const top = topCandidateNames(analysis, 4);
  if (top.length === 0) return "The structured candidate pool has no viable candidates.";
  return `Structured evidence matched ${analysis.recognizedAnswers} question${analysis.recognizedAnswers === 1 ? "" : "s"}. Current shortlist: ${top.join(", ")}.`;
}
