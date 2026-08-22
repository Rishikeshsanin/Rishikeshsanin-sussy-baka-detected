import { getGuessConfidenceThreshold } from "@/lib/game/guess-policy";
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

      const semanticIssue = validateResponseSemantics(parsed.data, request);
      if (!semanticIssue) {
        return parsed.data;
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
  if (response.type === "question") {
    return validateQuestion(response, request);
  }
  if (response.type === "guess") {
    return validateGuess(response, request);
  }
  return null;
}

export const guessConfidenceThreshold = getGuessConfidenceThreshold;

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
          ? "Return a useful QUESTION instead of a guess at this point in the game."
          : `A guess after ${request.history.length} completed answers requires confidence >= ${threshold.toFixed(2)}. Return a useful QUESTION unless a different candidate genuinely clears that threshold.`,
    };
  }

  return null;
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
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function createMaxQuestionsGiveUp(request: TurnRequest): GameAIResponse {
  return {
    type: "give_up",
    message: "You got me this time. Who were you thinking of?",
    confidence: 0,
    memorySummary:
      request.aiMemory.summary || "Thirty questions were answered without one reliable candidate.",
  };
}

function toAIError(error: unknown): AIError {
  if (error instanceof AIError) {
    return error;
  }
  return new AIError("INTERNAL_ERROR", "The deduction engine could not complete this turn.");
}
