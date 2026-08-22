import type { AnswerType, GameAnswer } from "@/lib/game/types";

import { CANDIDATES, type CandidateProfile } from "./candidates";
import { EXTRA_CANDIDATES } from "./extra-candidates";
import { QUESTION_BY_ID, TRAIT_QUESTIONS, type TraitQuestion } from "./questions";

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
const ALL_CANDIDATES = [...CANDIDATES, ...EXTRA_CANDIDATES] as const;

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function answerLikelihood(answer: AnswerType, expected: boolean): number {
  switch (answer) {
    case "yes":
      return expected ? 0.94 : 0.06;
    case "no":
      return expected ? 0.06 : 0.94;
    case "probably":
      return expected ? 0.74 : 0.26;
    case "probably_not":
      return expected ? 0.26 : 0.74;
    case "unknown":
      return 0.5;
  }
}

function normalizedGuess(name: string): string {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function analyzeCandidates(
  history: readonly GameAnswer[],
  rejectedGuesses: readonly string[] = [],
): CandidateAnalysis {
  const rejected = new Set(rejectedGuesses.map(normalizedGuess));
  const recognized = history
    .map((answer) => ({ answer, question: QUESTION_BY_ID.get(answer.questionId) }))
    .filter((entry): entry is { answer: GameAnswer; question: TraitQuestion } => Boolean(entry.question));

  const scored = ALL_CANDIDATES
    .filter((candidate) => !rejected.has(normalizedGuess(candidate.name)))
    .map((candidate) => {
      let logScore = Math.log(candidate.prior ?? 1);
      for (const { answer, question } of recognized) {
        const expected = candidate.tags.includes(question.tag);
        logScore += Math.log(answerLikelihood(answer.answer, expected) + EPSILON);
      }
      return { candidate, logScore };
    });

  if (scored.length === 0) {
    return {
      ranked: [],
      recognizedAnswers: recognized.length,
      unknownAnswers: history.filter((entry) => entry.answer === "unknown").length,
      topProbability: 0,
      runnerUpProbability: 0,
      margin: 0,
      confidence: 0,
    };
  }

  const maxLog = Math.max(...scored.map((item) => item.logScore));
  const exponentiated = scored.map((item) => ({
    candidate: item.candidate,
    score: Math.exp(item.logScore - maxLog),
  }));
  const denominator = exponentiated.reduce((sum, item) => sum + item.score, 0) || 1;

  const ranked = exponentiated
    .map((item) => ({
      ...item,
      probability: item.score / denominator,
    }))
    .sort((a, b) => b.probability - a.probability);

  const topProbability = ranked[0]?.probability ?? 0;
  const runnerUpProbability = ranked[1]?.probability ?? 0;
  const margin = Math.max(0, topProbability - runnerUpProbability);
  const evidenceFactor = clamp(recognized.length / 12);
  const unknownPenalty = clamp(history.filter((entry) => entry.answer === "unknown").length / 10) * 0.16;

  // This is a game-confidence heuristic derived from the posterior distribution,
  // margin, and amount of structured evidence. It is not supplied by an LLM.
  const confidence = clamp(
    topProbability * 0.72 + margin * 0.34 + evidenceFactor * 0.18 - unknownPenalty,
  );

  return {
    ranked,
    recognizedAnswers: recognized.length,
    unknownAnswers: history.filter((entry) => entry.answer === "unknown").length,
    topProbability,
    runnerUpProbability,
    margin,
    confidence,
  };
}

function binaryEntropy(probability: number): number {
  const p = clamp(probability, EPSILON, 1 - EPSILON);
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
}

export function selectBestQuestion(
  history: readonly GameAnswer[],
  rejectedGuesses: readonly string[] = [],
): { question: TraitQuestion; informationGain: number } | null {
  const analysis = analyzeCandidates(history, rejectedGuesses);
  if (analysis.ranked.length < 2) return null;

  const askedIds = new Set(history.map((entry) => entry.questionId));
  let best: { question: TraitQuestion; informationGain: number } | null = null;

  for (const question of TRAIT_QUESTIONS) {
    if (askedIds.has(question.id)) continue;

    const yesProbability = analysis.ranked.reduce(
      (sum, item) => sum + (item.candidate.tags.includes(question.tag) ? item.probability : 0),
      0,
    );

    // Avoid nearly-certain questions; they add little information and feel repetitive.
    if (yesProbability <= 0.045 || yesProbability >= 0.955) continue;

    const informationGain = binaryEntropy(yesProbability);
    if (!best || informationGain > best.informationGain + 1e-9) {
      best = { question, informationGain };
    }
  }

  return best && best.informationGain >= 0.28 ? best : null;
}

export function topCandidateNames(analysis: CandidateAnalysis, limit = 8): string[] {
  return analysis.ranked.slice(0, limit).map((item) => item.candidate.name);
}

export function summarizeAnalysis(analysis: CandidateAnalysis): string {
  const top = topCandidateNames(analysis, 4);
  if (top.length === 0) return "The deterministic candidate pool has no viable candidates.";
  return `Structured evidence matched ${analysis.recognizedAnswers} question${analysis.recognizedAnswers === 1 ? "" : "s"}. Current local shortlist: ${top.join(", ")}.`;
}
