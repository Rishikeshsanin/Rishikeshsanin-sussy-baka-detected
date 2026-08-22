import "server-only";

import { z } from "zod";

import { GameAnswerSchema, MAX_QUESTIONS } from "@/lib/ai/schema";
import { normalizeCandidateName } from "@/lib/engine/scoring";
import { buildKnowledgeSearchPlan } from "@/lib/knowledge/query";
import { resolveWikidataEntityByName } from "@/lib/knowledge/wikimedia.server";
import { isSbdPersistenceConfigured } from "@/lib/persistence/database.server";
import { upsertLearnedCandidate } from "@/lib/persistence/knowledge-store.server";
import { recordLearningEvent } from "@/lib/persistence/learning-store.server";
import { FixedWindowRateLimiter, getRequestIdentity } from "@/lib/server/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 24 * 1024;
const feedbackRateLimiter = new FixedWindowRateLimiter(12, 60_000);

const FeedbackSchema = z.object({
  outcome: z.enum(["correct_guess", "revealed_after_give_up"]),
  gameId: z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(2).max(100),
  history: z.array(GameAnswerSchema).max(MAX_QUESTIONS),
  rejectedGuesses: z.array(z.string().trim().min(1).max(100)).max(20),
}).strict();

export async function POST(request: Request): Promise<Response> {
  const rateLimit = feedbackRateLimiter.consume(getRequestIdentity(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { accepted: false, persisted: false, reason: "rate_limited" },
      { status: 429, headers: responseHeaders({ "retry-after": String(rateLimit.retryAfterSeconds) }) },
    );
  }

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return Response.json(
      { accepted: false, persisted: false, reason: "invalid_content_type" },
      { status: 415, headers: responseHeaders() },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return Response.json(
      { accepted: false, persisted: false, reason: "request_too_large" },
      { status: 413, headers: responseHeaders() },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { accepted: false, persisted: false, reason: "invalid_json" },
      { status: 400, headers: responseHeaders() },
    );
  }

  const parsed = FeedbackSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { accepted: false, persisted: false, reason: "invalid_feedback" },
      { status: 400, headers: responseHeaders() },
    );
  }

  if (!isSbdPersistenceConfigured()) {
    return Response.json(
      { accepted: true, persisted: false, reason: "persistence_not_configured" },
      { status: 200, headers: responseHeaders() },
    );
  }

  const feedback = parsed.data;

  // Every name that can affect learned priors must resolve to the exact Wikidata
  // label after normalization. We intentionally reject fuzzy first-result matches.
  let verified: Awaited<ReturnType<typeof resolveWikidataEntityByName>> = null;
  try {
    verified = await resolveWikidataEntityByName(feedback.name);
  } catch {
    verified = null;
  }

  if (!verified || normalizeCandidateName(verified.label) !== normalizeCandidateName(feedback.name)) {
    return Response.json(
      { accepted: true, persisted: false, reason: "entity_not_verified" },
      { status: 200, headers: responseHeaders() },
    );
  }

  const persisted = await recordLearningEvent({
    gameId: feedback.gameId,
    outcome: feedback.outcome,
    name: verified.label,
    history: feedback.history,
    rejectedGuesses: feedback.rejectedGuesses,
  });

  if (persisted && feedback.outcome === "revealed_after_give_up") {
    const plan = buildKnowledgeSearchPlan(feedback.history);
    const tags = new Set(plan?.positiveTags ?? []);
    if (plan?.expectsRealPerson === true) tags.add("real");
    if (plan?.expectsFictionalCharacter === true) tags.add("fictional");

    await upsertLearnedCandidate({
      name: verified.label,
      tags: [...tags],
      source: "learned",
      sourceId: verified.id,
      description: verified.description.slice(0, 320),
      prior: 0.86,
      popularityScore: 0,
    });
  }

  return Response.json(
    {
      accepted: true,
      persisted,
      learned: persisted && feedback.outcome === "revealed_after_give_up",
      canonicalName: verified.label,
    },
    { status: 200, headers: responseHeaders() },
  );
}

function responseHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extra,
  };
}
