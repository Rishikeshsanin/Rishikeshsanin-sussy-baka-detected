import "server-only";

import type { CandidateProfile } from "@/lib/engine/candidates";

interface CacheEntry {
  expiresAt: number;
  candidates: CandidateProfile[];
}

const MAX_ENTRIES = 80;
const DEFAULT_TTL_MS = 15 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function normalizeKey(key: string): string {
  return key.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ").slice(0, 360);
}

export function getCachedCandidates(key: string): CandidateProfile[] | null {
  const normalized = normalizeKey(key);
  const entry = cache.get(normalized);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(normalized);
    return null;
  }

  // Refresh insertion order for a tiny LRU-like behavior.
  cache.delete(normalized);
  cache.set(normalized, entry);
  return entry.candidates;
}

export function cacheCandidates(
  key: string,
  candidates: readonly CandidateProfile[],
  ttlMs = DEFAULT_TTL_MS,
): void {
  const normalized = normalizeKey(key);
  cache.delete(normalized);
  cache.set(normalized, {
    expiresAt: Date.now() + Math.max(30_000, ttlMs),
    candidates: [...candidates],
  });

  while (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value as string | undefined;
    if (!oldestKey) break;
    cache.delete(oldestKey);
  }
}

export function knowledgeCacheKey(primary: string, secondary?: string): string {
  return [primary, secondary].filter(Boolean).join(" || ");
}
