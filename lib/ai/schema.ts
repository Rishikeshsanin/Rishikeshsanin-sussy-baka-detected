import { z } from "zod";

export const MAX_QUESTIONS = 30;
export const MAX_REQUEST_BYTES = 32 * 1024;

export const AnswerTypeSchema = z.enum([
  "yes",
  "no",
  "probably",
  "probably_not",
  "unknown",
]);

export const TurnReasonSchema = z.enum(["answer", "rejected_guess"]);

export const GameAnswerSchema = z
  .object({
    questionId: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/, "Question IDs may only contain letters, numbers, underscores, and hyphens"),
    question: z.string().trim().min(3).max(180),
    answer: AnswerTypeSchema,
    timestamp: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

export const AIMemorySchema = z
  .object({
    summary: z.string().trim().max(1_200),
    candidateHypotheses: z.array(z.string().trim().min(1).max(100)).max(8),
  })
  .strict();

export const TurnRequestSchema = z
  .object({
    gameId: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/, "Game IDs may only contain letters, numbers, underscores, and hyphens"),
    questionNumber: z.number().int().min(1).max(MAX_QUESTIONS),
    history: z.array(GameAnswerSchema).min(1).max(MAX_QUESTIONS),
    rejectedGuesses: z.array(z.string().trim().min(1).max(100)).max(20),
    aiMemory: AIMemorySchema,
    turnReason: TurnReasonSchema,
  })
  .strict()
  .superRefine((request, context) => {
    if (request.questionNumber !== request.history.length) {
      context.addIssue({
        code: "custom",
        path: ["questionNumber"],
        message: "questionNumber must equal the number of completed answers",
      });
    }

    const questionIds = new Set<string>();
    for (const [index, answer] of request.history.entries()) {
      if (questionIds.has(answer.questionId)) {
        context.addIssue({
          code: "custom",
          path: ["history", index, "questionId"],
          message: "Question IDs must be unique",
        });
      }
      questionIds.add(answer.questionId);
    }

    const guesses = request.rejectedGuesses.map(canonicalizeGuess);
    if (new Set(guesses).size !== guesses.length) {
      context.addIssue({
        code: "custom",
        path: ["rejectedGuesses"],
        message: "Rejected guesses must be unique",
      });
    }

    if (request.turnReason === "rejected_guess" && request.rejectedGuesses.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["turnReason"],
        message: "A rejected-guess turn requires at least one rejected guess",
      });
    }
  });

const ConfidenceSchema = z.number().min(0).max(1);
const MemorySummarySchema = z.string().trim().min(1).max(1_200);
const CandidateHypothesesSchema = z.array(z.string().trim().min(1).max(100)).max(8);

export const QuestionAIResponseSchema = z
  .object({
    type: z.literal("question"),
    question: z.string().trim().min(3).max(160),
    questionId: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[A-Za-z0-9_-]+$/),
    confidence: ConfidenceSchema,
    memorySummary: MemorySummarySchema,
    candidateHypotheses: CandidateHypothesesSchema,
  })
  .strict();

export const GuessAIResponseSchema = z
  .object({
    type: z.literal("guess"),
    name: z.string().trim().min(1).max(100),
    confidence: ConfidenceSchema,
    memorySummary: MemorySummarySchema,
    candidateHypotheses: CandidateHypothesesSchema,
  })
  .strict();

export const GiveUpAIResponseSchema = z
  .object({
    type: z.literal("give_up"),
    message: z.string().trim().min(1).max(160),
    confidence: z.literal(0),
    memorySummary: MemorySummarySchema,
  })
  .strict();

export const GameAIResponseSchema = z.discriminatedUnion("type", [
  QuestionAIResponseSchema,
  GuessAIResponseSchema,
  GiveUpAIResponseSchema,
]);

/**
 * JSON Schema sent to providers that support constrained structured output.
 * Runtime trust still comes exclusively from GameAIResponseSchema above.
 */
export const GAME_AI_RESPONSE_JSON_SCHEMA = {
  anyOf: [
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["question"] },
        question: { type: "string" },
        questionId: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        memorySummary: { type: "string" },
        candidateHypotheses: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: [
        "type",
        "question",
        "questionId",
        "confidence",
        "memorySummary",
        "candidateHypotheses",
      ],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["guess"] },
        name: { type: "string" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        memorySummary: { type: "string" },
        candidateHypotheses: {
          type: "array",
          maxItems: 8,
          items: { type: "string" },
        },
      },
      required: ["type", "name", "confidence", "memorySummary", "candidateHypotheses"],
    },
    {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["give_up"] },
        message: { type: "string" },
        confidence: { type: "number", enum: [0] },
        memorySummary: { type: "string" },
      },
      required: ["type", "message", "confidence", "memorySummary"],
    },
  ],
} as const;

export function canonicalizeGuess(name: string): string {
  return name
    .normalize("NFKD")
    .toLocaleLowerCase("en-US")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function parseGameAIResponseText(text: string): z.infer<typeof GameAIResponseSchema> {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("The AI provider did not return valid JSON");
  }

  const parsed = GameAIResponseSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("The AI provider returned JSON that did not match the response schema");
  }

  return parsed.data;
}
