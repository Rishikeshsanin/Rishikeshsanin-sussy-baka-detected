import { getGuessConfidenceThreshold } from "@/lib/game/guess-policy";
import { selectRecoveryQuestion } from "@/lib/engine/recovery-question";
import {
  analyzeCandidates,
  mergeCandidatePools,
  SEED_CANDIDATES,
  selectBestQuestion,
  summarizeAnalysis,
  topCandidateNames,
} from "@/lib/engine/scoring";
import {
  discoverKnowledgeCandidates,
  shouldAttemptKnowledgeDiscovery,
  type KnowledgeDiscovery,
} from "@/lib/knowledge/discovery.server";

import {
  AIError,
  type AIProvider,
  type AIProviderContext,
  type GameAIResponse,
  type GuessAIResponse,
} from "./types";

type KnowledgeDiscoveryFn = (
  history: AIProviderContext["history"],
  signal?: AbortSignal,
) => Promise<KnowledgeDiscovery | null>;

/**
 * Hybrid deduction engine:
 * 1) deterministic Bayesian-style ranking over a bundled hot pool,
 * 2) live Wikimedia/Wikidata candidate discovery when enough evidence exists,
 * 3) entropy-based question selection over the combined pool,
 * 4) configured LLM recovery for semantic/long-tail gaps.
 *
 * External knowledge and AI are both optional accelerators: an upstream outage
 * must never end a playable round while useful local/recovery questions remain.
 */
export class HybridProvider implements AIProvider {
  readonly name: AIProvider["name"];

  constructor(
    private readonly fallback: AIProvider,
    private readonly discoverKnowledge: KnowledgeDiscoveryFn = discoverKnowledgeCandidates,
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
    let discovery: KnowledgeDiscovery | null = null;

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

    // The LLM is a recovery layer, not the knowledge base. Candidate hypotheses
    // now include verified Wikimedia discoveries when available, giving Gemini a
    // compact shortlist without delegating confidence/calibration to the model.
    const escapeNote = rejectedLocalGuess
      ? "A previous guess was rejected. Explore beyond that candidate and trust the full answer history."
      : discovery?.candidates.length
        ? `${memorySummary} Live Wikimedia discovery added ${discovery.candidates.length} verified entities.`
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

      return fallbackResult.type === "guess"
        ? calibrateFallbackGuess(fallbackResult, context)
        : fallbackResult;
    } catch (error) {
      if (!isRecoverableProviderFailure(error)) {
        throw error;
      }

      console.warn("[hybrid] AI assist unavailable; continuing with structured deduction", {
        code: error.code,
        completedAnswers: context.history.length,
        knowledgeCandidates: discovery?.candidates.length ?? 0,
      });

      // Re-enter the combined structured pool even if the policy previously
      // wanted to escape it. This keeps upstream AI failures invisible to users.
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

      return {
        type: "give_up",
        message: "You survived every clue I had. Who were you thinking of?",
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
