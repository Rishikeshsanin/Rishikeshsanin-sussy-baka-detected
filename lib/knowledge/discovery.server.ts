import "server-only";

import type { CandidateProfile } from "@/lib/engine/candidates";
import type { CandidateAnalysis } from "@/lib/engine/scoring";
import { normalizeCandidateName } from "@/lib/engine/scoring";
import type { GameAnswer } from "@/lib/game/types";
import {
  getLearnedCandidates,
  getPersistentSearchCandidates,
  savePersistentSearchCandidates,
} from "@/lib/persistence/knowledge-store.server";

import { cacheCandidates, knowledgeCacheKey } from "./cache.server";
import { buildKnowledgeSearchPlan, type KnowledgeSearchPlan } from "./query";
import { discoverWikimediaCandidates } from "./wikimedia.server";

const DISCOVERY_TIMEOUT_MS = 5_200;
const MAX_COMBINED_CANDIDATES = 40;

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

function mergeCandidates(...groups: readonly CandidateProfile[][]): CandidateProfile[] {
  const merged = new Map<string, CandidateProfile>();
  for (const group of groups) {
    for (const candidate of group) {
      const key = normalizeCandidateName(candidate.name);
      if (!key) continue;
      const current = merged.get(key);
      if (!current || (candidate.popularityScore ?? candidate.prior ?? 0) > (current.popularityScore ?? current.prior ?? 0)) {
        merged.set(key, candidate);
      }
    }
  }
  return [...merged.values()].slice(0, MAX_COMBINED_CANDIDATES);
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
  const cacheKey = knowledgeCacheKey(plan.primaryQuery, plan.secondaryQuery);

  try {
    const [persistedSearch, learned] = await Promise.all([
      getPersistentSearchCandidates(cacheKey),
      getLearnedCandidates(plan),
    ]);

    if (persistedSearch) {
      cacheCandidates(cacheKey, persistedSearch);
      return {
        plan,
        candidates: mergeCandidates(learned, persistedSearch),
        durationMs: Date.now() - startedAt,
      };
    }

    const liveCandidates = await discoverWikimediaCandidates(plan, controller.signal);
    const candidates = mergeCandidates(learned, liveCandidates);

    // Persistence is best-effort. A database outage must never block a round.
    void savePersistentSearchCandidates(cacheKey, plan, liveCandidates);

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
