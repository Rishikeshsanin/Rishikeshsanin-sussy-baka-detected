import { getGuessConfidenceThreshold } from "@/lib/game/guess-policy";
import {
  analyzeCandidates,
  selectBestQuestion,
  summarizeAnalysis,
  topCandidateNames,
} from "@/lib/engine/scoring";

import type { AIProvider, AIProviderContext, GameAIResponse } from "./types";

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

    const shouldEscapeLocalPool =
      context.rejectedGuesses.length >= 1 ||
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
    return this.fallback.playTurn({
      ...context,
      aiMemory: {
        summary: [context.aiMemory.summary, memorySummary].filter(Boolean).join(" ").slice(0, 1_200),
        candidateHypotheses: hypotheses.length > 0 ? hypotheses : context.aiMemory.candidateHypotheses,
      },
    });
  }
}
