import type { CandidateProfile } from "@/lib/engine/candidates";
import {
  canGiveUp,
  getGuessConfidenceThreshold,
  hasEnoughConfirmationEvidence,
  normalizeGuess,
} from "@/lib/game/guess-policy";
import { selectRecoveryQuestion } from "@/lib/engine/recovery-question";
import {
  analyzeCandidates,
  mergeCandidatePools,
  SEED_CANDIDATES,
  selectBestQuestion,
  selectConfirmationQuestion,
  summarizeAnalysis,
  topCandidateNames,
  type CandidateAnalysis,
} from "@/lib/engine/scoring";
import { buildKnowledgeSearchPlan } from "@/lib/knowledge/query";

import {
  AIError,
  type AIProvider,
  type AIProviderContext,
  type GameAIResponse,
  type GuessAIResponse,
} from "./types";

export interface KnowledgeDiscoveryResult {
  plan: { primaryQuery: string };
  candidates: CandidateProfile[];
  durationMs: number;
}

export type KnowledgeDiscoveryFn = (
  history: AIProviderContext["history"],
  signal?: AbortSignal,
) => Promise<KnowledgeDiscoveryResult | null>;

const noLiveDiscovery: KnowledgeDiscoveryFn = async () => null;

function shouldAttemptKnowledgeDiscovery(
  history: AIProviderContext["history"],
  analysis: CandidateAnalysis,
  rejectedGuesses: readonly string[],
): boolean {
  if (history.length < 6) return false;
  if (!buildKnowledgeSearchPlan(history)) return false;
  if (rejectedGuesses.length > 0) return true;
  if (analysis.confidence >= 0.72) return true;
  return history.length >= 8;
}

export class HybridProvider implements AIProvider {
  readonly name: AIProvider["name"];

  constructor(
    private readonly fallback: AIProvider,
    private readonly discoverKnowledge: KnowledgeDiscoveryFn = noLiveDiscovery,
  ) {
    this.name = fallback.name;
  }

  async playTurn(context: AIProviderContext): Promise<GameAIResponse> {
    const seedAnalysis = analyzeCandidates(
      context.history,
      context.rejectedGuesses,
      SEED_CANDIDATES,
    );

    let candidatePool = [...SEED_CANDIDATES];
    let discovery: KnowledgeDiscoveryResult | null = null;

    if (
      shouldAttemptKnowledgeDiscovery(
        context.history,
        seedAnalysis,
        context.rejectedGuesses,
      )
    ) {
      discovery = await this.discoverKnowledge(context.history, context.signal);
      if (discovery?.candidates.length) {
        candidatePool = mergeCandidatePools(SEED_CANDIDATES, discovery.candidates);
        console.info("[knowledge] live candidates joined the round", {
          discovered: discovery.candidates.length,
          combined: candidatePool.length,
          durationMs: discovery.durationMs,
          query: discovery.plan.primaryQuery.slice(0, 80),
        });
      }
    }

    const analysis = analyzeCandidates(
      context.history,
      context.rejectedGuesses,
      candidatePool,
    );
    const hypotheses = topCandidateNames(analysis);
    const memorySummary = summarizeAnalysis(analysis);

    const rejectedLocalGuess = context.rejectedGuesses.length >= 1;
    const shouldEscapeStructuredPool =
      rejectedLocalGuess ||
      (context.history.length >= 14 && analysis.confidence < 0.58) ||
      analysis.ranked.length < 2;

    if (!shouldEscapeStructuredPool && context.turnReason !== "rejected_guess") {
      const threshold = getGuessConfidenceThreshold(context.history.length);
      const top = analysis.ranked[0];
      const enoughSeparation =
        analysis.topProbability >= 0.55 &&
        analysis.margin >= 0.2 &&
        analysis.recognizedAnswers >= 6;
      const strongLead =
        top &&
        threshold !== null &&
        analysis.confidence >= threshold &&
        enoughSeparation;

      if (strongLead && top) {
        if (hasEnoughConfirmationEvidence(context.history, top.candidate.name)) {
          return {
            type: "guess",
            name: top.candidate.name,
            confidence: analysis.confidence,
            memorySummary,
            candidateHypotheses: hypotheses,
          };
        }

        const confirmation = selectConfirmationQuestion(
          context.history,
          context.rejectedGuesses,
          candidatePool,
        );
        if (
          confirmation &&
          normalizeGuess(confirmation.candidateName) === normalizeGuess(top.candidate.name)
        ) {
          return {
            type: "question",
            question: confirmation.question.text,
            questionId: confirmation.question.id,
            confidence: analysis.confidence,
            memorySummary: `${memorySummary} A strong lead exists, but SBD is verifying it before spending a guess.`.slice(0, 1_200),
            candidateHypotheses: hypotheses,
          };
        }
      }
    }

    if (!shouldEscapeStructuredPool) {
      const next = selectBestQuestion(
        context.history,
        context.rejectedGuesses,
        candidatePool,
      );
      if (next) {
        return {
          type: "question",
          question: next.question.text,
          questionId: next.question.id,
          confidence: analysis.confidence,
          memorySummary,
          candidateHypotheses: hypotheses,
        };
      }
    }

    const escapeNote = rejectedLocalGuess
      ? "A previous guess was rejected. Explore beyond that candidate and trust the full answer history."
      : discovery?.candidates.length
        ? `${memorySummary} Live knowledge discovery added ${discovery.candidates.length} verified entities.`
        : memorySummary;

    try {
      const fallbackResult = await this.fallback.playTurn({
        ...context,
        aiMemory: {
          summary: [context.aiMemory.summary, escapeNote]
            .filter(Boolean)
            .join(" ")
            .slice(0, 1_200),
          candidateHypotheses: rejectedLocalGuess
            ? hypotheses.filter(
                (name) => !context.rejectedGuesses.some(
                  (rejected) => rejected.toLocaleLowerCase("en-US") === name.toLocaleLowerCase("en-US"),
                ),
              )
            : hypotheses.length > 0
              ? hypotheses
              : context.aiMemory.candidateHypotheses,
        },
      });

      if (fallbackResult.type === "give_up" && !canGiveUp(context.history)) {
        const next = selectBestQuestion(context.history, context.rejectedGuesses, candidatePool);
        const recovery = selectRecoveryQuestion(context.history);
        const question = next?.question ?? (recovery
          ? { id: recovery.questionId, text: recovery.question }
          : null);
        if (question) {
          return {
            type: "question",
            question: question.text,
            questionId: question.id,
            confidence: analysis.confidence,
            memorySummary: `${memorySummary} The long-tail search is not exhausted yet.`.slice(0, 1_200),
            candidateHypotheses: hypotheses,
          };
        }
      }

      if (fallbackResult.type === "guess") {
        const calibrated = calibrateFallbackGuess(fallbackResult, context);
        if (hasEnoughConfirmationEvidence(context.history, calibrated.name)) {
          return calibrated;
        }

        // For a structured top candidate, keep the suspected name internal and
        // verify it with a discriminating trait instead of burning a guess.
        const top = analysis.ranked[0];
        if (top && normalizeGuess(top.candidate.name) === normalizeGuess(calibrated.name)) {
          const confirmation = selectConfirmationQuestion(
            context.history,
            context.rejectedGuesses,
            candidatePool,
          );
          if (confirmation) {
            return {
              type: "question",
              question: confirmation.question.text,
              questionId: confirmation.question.id,
              confidence: Math.min(calibrated.confidence, analysis.confidence),
              memorySummary: `${memorySummary} SBD has a lead and is verifying it before revealing the name.`.slice(0, 1_200),
              candidateHypotheses: [calibrated.name, ...hypotheses.filter((name) => normalizeGuess(name) !== normalizeGuess(calibrated.name))].slice(0, 8),
            };
          }
        }

        // Rare LLM-only candidates are passed to the semantic validator. If the
        // confirmation policy is not satisfied, the validator sends a correction
        // and the model must ask another candidate-discriminating question.
        return calibrated;
      }

      return fallbackResult;
    } catch (error) {
      if (!isRecoverableProviderFailure(error)) {
        throw error;
      }

      console.warn("[hybrid] AI assist unavailable; continuing with structured deduction", {
        code: error.code,
        completedAnswers: context.history.length,
        knowledgeCandidates: discovery?.candidates.length ?? 0,
      });

      const structuredNext = selectBestQuestion(
        context.history,
        context.rejectedGuesses,
        candidatePool,
      );
      if (structuredNext) {
        return {
          type: "question",
          question: structuredNext.question.text,
          questionId: structuredNext.question.id,
          confidence: analysis.confidence,
          memorySummary: `${memorySummary} AI assist is temporarily unavailable; continuing with verified/local candidates.`.slice(0, 1_200),
          candidateHypotheses: hypotheses,
        };
      }

      const recovery = selectRecoveryQuestion(context.history);
      if (recovery) {
        return {
          type: "question",
          question: recovery.question,
          questionId: recovery.questionId,
          confidence: analysis.confidence,
          memorySummary: `${memorySummary} Collecting one more structured clue while AI assist recovers.`.slice(0, 1_200),
          candidateHypotheses: hypotheses,
        };
      }

      if (!canGiveUp(context.history)) {
        throw new AIError(
          "AI_UNAVAILABLE",
          "The long-tail detector is still searching. Try this turn again.",
        );
      }

      return {
        type: "give_up",
        message: "You survived the full investigation. Alright, drop the name — who was it?",
        confidence: 0,
        memorySummary,
      };
    }
  }
}

function isRecoverableProviderFailure(error: unknown): error is AIError {
  return error instanceof AIError && (
    error.code === "NETWORK_ERROR" ||
    error.code === "RATE_LIMITED" ||
    error.code === "AI_UNAVAILABLE" ||
    error.code === "INVALID_AI_RESPONSE"
  );
}

export function calibrateFallbackGuess(
  guess: GuessAIResponse,
  context: Pick<AIProviderContext, "history" | "rejectedGuesses">,
): GuessAIResponse {
  const answers = context.history.length;

  let evidenceCap: number;
  if (answers <= 7) evidenceCap = 0.93;
  else if (answers <= 12) evidenceCap = 0.94;
  else if (answers <= 18) evidenceCap = 0.9;
  else if (answers <= 24) evidenceCap = 0.88;
  else evidenceCap = 0.84;

  const rejectionPenalty = Math.min(0.12, context.rejectedGuesses.length * 0.035);
  const calibrated = Math.max(0, Math.min(guess.confidence, evidenceCap) - rejectionPenalty);

  return {
    ...guess,
    confidence: Number(calibrated.toFixed(3)),
  };
}
