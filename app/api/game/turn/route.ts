import "server-only";

import { getAITurnTimeoutMs, getConfiguredAIProvider } from "@/lib/ai/config.server";
import { createMaxQuestionsGiveUp, playValidatedTurn } from "@/lib/ai/provider";
import { MAX_QUESTIONS, MAX_REQUEST_BYTES, TurnRequestSchema } from "@/lib/ai/schema";
import { AIError, type AIErrorCode, type APIErrorBody } from "@/lib/ai/types";
import { FixedWindowRateLimiter, getRequestIdentity } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const inFlightGameIds = new Set<string>();
const turnRateLimiter = new FixedWindowRateLimiter(45, 60_000);

export async function POST(request: Request): Promise<Response> {
  const rateLimit = turnRateLimiter.consume(getRequestIdentity(request));
  if (!rateLimit.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many detector turns at once. Give it a few seconds and try again.",
      429,
      { "retry-after": String(rateLimit.retryAfterSeconds) },
    );
  }

  let body: unknown;
  try {
    body = await readBoundedJsonBody(request);
  } catch (error) {
    if (error instanceof RequestInputError) {
      return errorResponse("INVALID_REQUEST", error.publicMessage, error.status);
    }
    return errorResponse("INVALID_REQUEST", "The request body must contain valid JSON.", 400);
  }

  const parsedRequest = TurnRequestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return errorResponse("INVALID_REQUEST", "The game state for this turn is invalid.", 400);
  }

  const turnRequest = parsedRequest.data;
  if (turnRequest.history.length >= MAX_QUESTIONS) {
    return Response.json(createMaxQuestionsGiveUp(turnRequest), {
      status: 200,
      headers: responseHeaders(),
    });
  }

  if (inFlightGameIds.has(turnRequest.gameId)) {
    return errorResponse(
      "REQUEST_IN_PROGRESS",
      "That game already has a deduction in progress.",
      409,
    );
  }

  inFlightGameIds.add(turnRequest.gameId);
  try {
    const provider = getConfiguredAIProvider();
    const result = await playValidatedTurn(provider, turnRequest, {
      timeoutMs: getAITurnTimeoutMs(),
    });
    return Response.json(result, {
      status: 200,
      headers: responseHeaders(),
    });
  } catch (error) {
    const aiError = error instanceof AIError
      ? error
      : new AIError("INTERNAL_ERROR", "The deduction engine could not complete this turn.");
    logSafeDevelopmentError(aiError);
    return errorResponse(aiError.code, aiError.message, statusForError(aiError.code));
  } finally {
    inFlightGameIds.delete(turnRequest.gameId);
  }
}

async function readBoundedJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.toLocaleLowerCase("en-US") ?? "";
  const mediaType = contentType.split(";", 1)[0]?.trim();
  if (mediaType !== "application/json") {
    throw new RequestInputError(415, "Send this turn as JSON.");
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader !== null) {
    if (!/^\d+$/.test(contentLengthHeader)) {
      throw new RequestInputError(400, "The request size is invalid.");
    }
    if (Number(contentLengthHeader) > MAX_REQUEST_BYTES) {
      throw new RequestInputError(413, "The game state is too large to process.");
    }
  }

  if (!request.body) {
    throw new RequestInputError(400, "The request body is empty.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteCount = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      byteCount += value.byteLength;
      if (byteCount > MAX_REQUEST_BYTES) {
        await reader.cancel("Request body exceeded the configured limit");
        throw new RequestInputError(413, "The game state is too large to process.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof RequestInputError) {
      throw error;
    }
    throw new RequestInputError(400, "The request body could not be read.");
  } finally {
    reader.releaseLock();
  }

  if (!text.trim()) {
    throw new RequestInputError(400, "The request body is empty.");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestInputError(400, "The request body must contain valid JSON.");
  }
}

function errorResponse(
  code: AIErrorCode,
  message: string,
  status: number,
  extraHeaders?: HeadersInit,
): Response {
  const body: APIErrorBody = { error: { code, message } };
  return Response.json(body, {
    status,
    headers: responseHeaders(extraHeaders),
  });
}

function responseHeaders(extraHeaders?: HeadersInit): HeadersInit {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  };
}

function statusForError(code: AIErrorCode): number {
  switch (code) {
    case "INVALID_REQUEST":
      return 400;
    case "REQUEST_IN_PROGRESS":
      return 409;
    case "RATE_LIMITED":
      return 429;
    case "INVALID_AI_RESPONSE":
      return 502;
    case "AI_UNAVAILABLE":
    case "NETWORK_ERROR":
      return 503;
    case "INTERNAL_ERROR":
      return 500;
  }
}

function logSafeDevelopmentError(error: AIError): void {
  if (process.env.NODE_ENV === "development") {
    console.error("[game-turn] AI request failed", {
      code: error.code,
      name: error.name,
    });
  }
}

class RequestInputError extends Error {
  readonly status: number;
  readonly publicMessage: string;

  constructor(status: number, publicMessage: string) {
    super(publicMessage);
    this.name = "RequestInputError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}
