import {
  canGiveUp,
  getGuessConfidenceThreshold,
  hasEnoughConfirmationEvidence,
  minimumGiveUpAnswers,
} from "@/lib/game/guess-policy";
import { isDuplicateQuestion } from "@/lib/game/question-normalization";

import {
  canonicalizeGuess,
  GameAIResponseSchema,
  MAX_QUESTIONS,
} from "./schema";
import {
  AIError,
  type AIProvider,
  type GameAIResponse,
  type GiveUpAIResponse,
  type GuessAIResponse,
  type QuestionAIResponse,
  type TurnRequest,
} from "./types";

export const AI_TURN_TIMEOUT_MS = 20_000;
const MAX_INVALID_RESPONSE_RETRIES = 1;

export async function playValidatedTurn(
  provider: AIProvider,
  request: TurnRequest,
  options: { timeoutMs?: number } = {},
): Promise<GameAIResponse> {
  if (request.history.length >= MAX_QUESTIONS) {
    return createMaxQuestionsGiveUp(request);
  }

  let correction: string | undefined;

  for (let attempt = 0; attempt <= MAX_INVALID_RESPONSE_RETRIES; attempt += 1) {
    try {
      const candidate = await callProviderWithTimeout(
        provider,
        request,
        correction,
        options.timeoutMs ?? AI_TURN_TIMEOUT_MS,
      );
      const parsed = GameAIResponseSchema.safeParse(candidate);
      if (!parsed.success) {
        throw new AIError(
          "INVALID_AI_RESPONSE",
          "The deduction engine returned an invalid response.",
        );
      }

      const normalizedResponse = coerceIdentityQuestionToGuess(parsed.data);
      const semanticIssue = validateResponseSemantics(normalizedResponse, request);
      if (!semanticIssue) {
        return normalizedResponse;
      }

      if (attempt < MAX_INVALID_RESPONSE_RETRIES) {
        correction = semanticIssue.correction;
        continue;
      }

      throw new AIError("INVALID_AI_RESPONSE", semanticIssue.publicMessage);
    } catch (error) {
      const aiError = toAIError(error);
      if (aiError.code === "INVALID_AI_RESPONSE" && attempt < MAX_INVALID_RESPONSE_RETRIES) {
        correction =
          "Your previous output was structurally invalid. Return exactly one action matching the JSON schema.";
        continue;
      }
      throw aiError;
    }
  }

  throw new AIError("INVALID_AI_RESPONSE", "The deduction engine could not produce a valid turn.");
}

interface SemanticIssue {
  publicMessage: string;
  correction: string;
}

export function validateResponseSemantics(
  response: GameAIResponse,
  request: TurnRequest,
): SemanticIssue | null {
  if (response.type === "question") return validateQuestion(response, request);
  if (response.type === "guess") return validateGuess(response, request);
  return validateGiveUp(response, request);
}

export const guessConfidenceThreshold = getGuessConfidenceThreshold;

/**
 * A provider must not receive a free identity attempt by disguising it as a
 * QUESTION. If the text is effectively "Is that <candidate>?", normalize it to
 * GUESS first, then let the normal confidence/confirmation policy decide whether
 * the guess is legal. If it is too early, the provider is corrected and the
 * leaked name never reaches the player.
 */
export function coerceIdentityQuestionToGuess(response: GameAIResponse): GameAIResponse {
  if (response.type !== "question") return response;

  const name = extractIdentityName(response);
  if (!name) return response;

  return {
    type: "guess",
    name,
    confidence: response.confidence,
    memorySummary: response.memorySummary,
    candidateHypotheses: [
      name,
      ...response.candidateHypotheses.filter(
        (candidate) => canonicalizeGuess(candidate) !== canonicalizeGuess(name),
      ),
    ].slice(0, 8),
  };
}

function extractIdentityName(response: QuestionAIResponse): string | null {
  const question = response.question.trim();
  const patterns = [
    /^(?:is|was)\s+(?:that|it|this|your\s+(?:person|character)|the\s+(?:person|character))\s+(.+?)\?$/iu,
    /^are\s+you\s+thinking\s+of\s+(.+?)\?$/iu,
    /^could\s+it\s+be\s+(.+?)\?$/iu,
    /^would\s+(?:that|it)\s+be\s+(.+?)\?$/iu,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    const rawName = match?.[1]?.trim();
    if (!rawName) continue;

    const normalizedRaw = canonicalizeGuess(rawName);
    const hypothesis = response.candidateHypotheses.find(
      (candidate) => canonicalizeGuess(candidate) === normalizedRaw,
    );
    if (hypothesis) return hypothesis;

    // If the provider forgot to include the candidate in hypotheses, accept only
    // a short proper-name-looking suffix so ordinary questions such as
    // "Is that person from India?" are never misclassified as guesses.
    const properName = /^[\p{Lu}\d][\p{L}\p{N}'’.-]*(?:\s+[\p{Lu}\d][\p{L}\p{N}'’.-]*){0,4}$/u;
    if (properName.test(rawName)) return rawName;
  }

  return null;
}

function validateQuestion(
  response: QuestionAIResponse,
  request: TurnRequest,
): SemanticIssue | null {
  const question = response.question.trim();
  const questionMarks = question.match(/\?/g)?.length ?? 0;
  const words = question.split(/\s+/).filter(Boolean);
  const yesNoOpening = /^(?:is|are|was|were|do|does|did|has|have|had|can|could|would|will)\b/i;

  if (!yesNoOpening.test(question) || !question.endsWith("?") || questionMarks !== 1) {
    return {
      publicMessage: "The deduction engine did not return a yes-or-no style question.",
      correction:
        "Return one direct yes/no-style QUESTION ending in one question mark. Do not ask who, what, where, when, why, how, or which.",
    };
  }

  if (words.length > 24 || /[\r\n]/.test(question)) {
    return {
      publicMessage: "The deduction engine returned a question that was not concise.",
      correction: "Return one concise QUESTION of at most 24 words with no preamble or line breaks.",
    };
  }

  if (request.history.some((entry) => entry.questionId === response.questionId)) {
    return {
      publicMessage: "The deduction engine reused a previous question identifier.",
      correction: "Return a useful new QUESTION with a questionId not present in history.",
    };
  }

  if (isDuplicateQuestion(question, request.history.map((entry) => entry.question))) {
    return {
      publicMessage: "The deduction engine repeated a previous question.",
      correction:
        "The question repeated or paraphrased established information. Return a materially different yes/no QUESTION that best splits the remaining candidates.",
    };
  }

  return null;
}

function hasStableLongTailEvidence(response: GuessAIResponse, request: TurnRequest): boolean {
  const previousLead = request.aiMemory.candidateHypotheses[0];
  if (!previousLead || canonicalizeGuess(previousLead) !== canonicalizeGuess(response.name)) {
    return false;
  }

  if (request.history.length < 14 || response.confidence < 0.9) return false;
  const recent = request.history.slice(-3);
  return recent.length === 3 && recent.every((entry) => entry.answer !== "unknown");
}

function validateGuess(
  response: GuessAIResponse,
  request: TurnRequest,
): SemanticIssue | null {
  if (request.turnReason === "rejected_guess") {
    return {
      publicMessage: "The deduction engine guessed again before asking a new question.",
      correction:
        "The last guess was just rejected. You must return a useful new QUESTION before making another guess.",
    };
  }

  const normalizedGuess = canonicalizeGuess(response.name);
  if (
    request.rejectedGuesses.some(
      (rejectedGuess) => canonicalizeGuess(rejectedGuess) === normalizedGuess,
    )
  ) {
    return {
      publicMessage: "The deduction engine repeated a rejected guess.",
      correction:
        "That candidate was explicitly rejected. Return a useful QUESTION or a different non-rejected candidate that meets the confidence policy.",
    };
  }

  const threshold = guessConfidenceThreshold(request.history.length);
  if (threshold === null || response.confidence < threshold) {
    return {
      publicMessage: "The deduction engine tried to guess before it had enough evidence.",
      correction:
        threshold === null
          ? "Do not reveal a name yet. Return a useful candidate-discriminating QUESTION instead."
          : `A guess after ${request.history.length} completed answers requires confidence >= ${threshold.toFixed(2)}. Return a useful QUESTION unless a candidate genuinely clears that threshold.`,
    };
  }

  const structuredConfirmation = hasEnoughConfirmationEvidence(request.history, response.name);
  const longTailConfirmation = hasStableLongTailEvidence(response, request);
  if (!structuredConfirmation && !longTailConfirmation) {
    return {
      publicMessage: "The deduction engine tried to reveal a strong lead before confirming it.",
      correction:
        "You may have the right candidate, but do NOT guess yet and do NOT put the candidate's name in question text. Ask another concise fact-based QUESTION that this suspected candidate should satisfy and that distinguishes close alternatives. Keep the suspected candidate first in candidateHypotheses. SBD prefers confirmation over a failed guess.",
    };
  }

  return null;
}

function validateGiveUp(
  _response: GiveUpAIResponse,
  request: TurnRequest,
): SemanticIssue | null {
  if (canGiveUp(request.history)) return null;

  return {
    publicMessage: "The deduction engine gave up while useful investigation time remained.",
    correction:
      `Do not GIVE_UP yet. This round should continue to at least ${minimumGiveUpAnswers(request.history)} answered questions unless the server reaches its hard limit. Ask the single most useful new yes/no QUESTION, explore a new category/franchise/geography if needed, and use UNKNOWN answers as neutral evidence.`,
  };
}

async function callProviderWithTimeout(
  provider: AIProvider,
  request: TurnRequest,
  correction: string | undefined,
  timeoutMs: number,
): Promise<GameAIResponse> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new AIError("NETWORK_ERROR", "The deduction engine took too long to respond."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      provider.playTurn({ ...request, correction, signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export function createMaxQuestionsGiveUp(request: TurnRequest): GameAIResponse {
  return {
    type: "give_up",
    message: "Thirty questions. You actually survived the detector. Fine — drop the name. Who was it? 💀",
    confidence: 0,
    memorySummary:
      request.aiMemory.summary || "Thirty questions were answered without one reliable confirmed candidate.",
  };
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) return error;
  return new AIError("INTERNAL_ERROR", "The deduction engine could not complete this turn.");
}
