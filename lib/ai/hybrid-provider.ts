import { getGuessConfidenceThreshold } from "@/lib/game/guess-policy";
import { selectRecoveryQuestion } from "@/lib/engine/recovery-question";
import {
  analyzeCandidates,
  selectBestQuestion,
  summarizeAnalysis,
  topCandidateNames,
} from "@/lib/engine/scoring";

import {
  AIError,
  type AIProvider,
  type AIProviderContext,
  type GameAIResponse,
  type GuessAIResponse,
} from "./types";

/**
 * Hybrid deduction engine:
 * 1) deterministic Bayesian-style candidate ranking over a curated seed pool,
 * 2) entropy-based question selection,
 * 3) configured LLM fallback when the local knowledge base is weak/exhausted.
 *
 * The public provider name intentionally remains the underlying provider name so
 * existing diagnostics/configuration do not need a new environment enum.
 */
export class HybridProvider implements AIProvider {
  readonly name: AIProvider["name"];

  constructor(private readonly fallback: AIProvider) {
    this.name = fallback.name;
  }

  async playTurn(context: AIProviderContext): Promise<GameAIResponse> {
    const analysis = analyzeCandidates(context.history, context.rejectedGuesses);
    const hypotheses = topCandidateNames(analysis);
    const memorySummary = summarizeAnalysis(analysis);

    const rejectedLocalGuess = context.rejectedGuesses.length >= 1;
    const shouldEscapeLocalPool =
      rejectedLocalGuess ||
      (context.history.length >= 14 && analysis.confidence < 0.58) ||
      analysis.ranked.length < 2;

    if (!shouldEscapeLocalPool && context.turnReason !== "rejected_guess") {
      const threshold = getGuessConfidenceThreshold(context.history.length);
      const top = analysis.ranked[0];
      const enoughSeparation =
        analysis.topProbability >= 0.52 &&
        analysis.margin >= 0.18 &&
        analysis.recognizedAnswers >= 5;

      if (
        top &&
        threshold !== null &&
        analysis.confidence >= threshold &&
        enoughSeparation
      ) {
        return {
          type: "guess",
          name: top.candidate.name,
          confidence: analysis.confidence,
          memorySummary,
          candidateHypotheses: hypotheses,
        };
      }
    }

    if (!shouldEscapeLocalPool) {
      const next = selectBestQuestion(context.history, context.rejectedGuesses);
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

    // The LLM is a recovery/long-tail layer, not the whole deduction engine.
    // If our curated pool already guessed wrong, clear its shortlist so the LLM
    // is explicitly encouraged to explore outside the seed database.
    const escapeNote = rejectedLocalGuess
      ? "The curated seed pool already produced a rejected guess. Explore outside that shortlist and trust the full answer history."
      : memorySummary;

    try {
      const fallbackResult = await this.fallback.playTurn({
        ...context,
        aiMemory: {
          summary: [context.aiMemory.summary, escapeNote].filter(Boolean).join(" ").slice(0, 1_200),
          candidateHypotheses: rejectedLocalGuess
            ? []
            : hypotheses.length > 0
              ? hypotheses
              : context.aiMemory.candidateHypotheses,
        },
      });

      return fallbackResult.type === "guess"
        ? calibrateFallbackGuess(fallbackResult, context)
        : fallbackResult;
    } catch (error) {
      if (!isRecoverableProviderFailure(error)) {
        throw error;
      }

      console.warn("[hybrid] AI assist unavailable; continuing with local deduction", {
        code: error.code,
        completedAnswers: context.history.length,
      });

      // An upstream outage must not become a dead-end screen. Re-enter the local
      // question engine even if we previously wanted to escape the seed pool.
      const localNext = selectBestQuestion(context.history, context.rejectedGuesses);
      if (localNext) {
        return {
          type: "question",
          question: localNext.question.text,
          questionId: localNext.question.id,
          confidence: analysis.confidence,
          memorySummary: `${memorySummary} AI assist is temporarily unavailable; continuing locally.`.slice(0, 1_200),
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
          memorySummary: `${memorySummary} AI assist is temporarily unavailable; collecting recovery evidence.`.slice(0, 1_200),
          candidateHypotheses: hypotheses,
        };
      }

      return {
        type: "give_up",
        message: "My live lookup is taking a nap and I used every useful local clue. You got me — who were you thinking of?",
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

/**
 * LLM confidence is not a calibrated probability. We therefore treat it only as
 * an upper-bound hint and cap it by evidence depth. The normal server-side guess
 * policy still validates the returned value after this function runs.
 *
 * Early long-tail guesses are deliberately forced below the policy threshold,
 * causing the provider validator to request another discriminating question.
 */
export function calibrateFallbackGuess(
  guess: GuessAIResponse,
  context: Pick<AIProviderContext, "history" | "rejectedGuesses">,
): GuessAIResponse {
  const answers = context.history.length;

  let evidenceCap: number;
  if (answers <= 5) evidenceCap = 0.96;
  else if (answers <= 8) evidenceCap = 0.92;
  else if (answers <= 10) evidenceCap = 0.94;
  else if (answers <= 15) evidenceCap = 0.87;
  else if (answers <= 20) evidenceCap = 0.9;
  else evidenceCap = 0.82;

  const rejectionPenalty = Math.min(0.09, context.rejectedGuesses.length * 0.025);
  const calibrated = Math.max(0, Math.min(guess.confidence, evidenceCap) - rejectionPenalty);

  return {
    ...guess,
    confidence: Number(calibrated.toFixed(3)),
  };
}