import "server-only";

import type { CandidateAnalysis } from "@/lib/engine/scoring";
import type { CandidateProfile } from "@/lib/engine/candidates";
import type { GameAnswer } from "@/lib/game/types";

import { buildKnowledgeSearchPlan, type KnowledgeSearchPlan } from "./query";
import { discoverWikimediaCandidates } from "./wikimedia.server";

const DISCOVERY_TIMEOUT_MS = 5_200;

export interface KnowledgeDiscovery {
  plan: KnowledgeSearchPlan;
  candidates: CandidateProfile[];
  durationMs: number;
}

export function shouldAttemptKnowledgeDiscovery(
  history: readonly GameAnswer[],
  analysis: CandidateAnalysis,
  rejectedGuesses: readonly string[],
): boolean {
  if (history.length < 6) return false;
  if (!buildKnowledgeSearchPlan(history)) return false;
  if (rejectedGuesses.length > 0) return true;

  // Before the local engine commits to a likely guess, widen the candidate set
  // so a popular person missing from the bundled hot pool can still enter.
  if (analysis.confidence >= 0.72) return true;

  // By question eight we have enough structured evidence for useful live search.
  return history.length >= 8;
}

export async function discoverKnowledgeCandidates(
  history: readonly GameAnswer[],
  signal?: AbortSignal,
): Promise<KnowledgeDiscovery | null> {
  const plan = buildKnowledgeSearchPlan(history);
  if (!plan) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  const abortListener = () => controller.abort();
  signal?.addEventListener("abort", abortListener, { once: true });
  const startedAt = Date.now();

  try {
    const candidates = await discoverWikimediaCandidates(plan, controller.signal);
    return {
      plan,
      candidates,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    console.warn("[knowledge] live discovery unavailable; continuing without it", {
      query: plan.primaryQuery.slice(0, 80),
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.name : "unknown",
    });
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortListener);
  }
}
