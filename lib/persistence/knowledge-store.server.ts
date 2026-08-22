import "server-only";

import type { CandidateProfile, CandidateSource } from "@/lib/engine/candidates";
import { normalizeCandidateName } from "@/lib/engine/scoring";
import type { KnowledgeSearchPlan } from "@/lib/knowledge/query";

import { getSbdDatabase } from "./database.server";

const SEARCH_CACHE_TTL_HOURS = 6;
const MAX_PERSISTED_CANDIDATES = 40;

function candidateFromUnknown(value: unknown): CandidateProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || !Array.isArray(record.tags)) return null;

  const tags = record.tags.filter((tag): tag is string => typeof tag === "string").slice(0, 80);
  const source = record.source;
  const safeSource: CandidateSource | undefined =
    source === "seed" || source === "wikimedia" || source === "learned" ? source : undefined;

  return {
    name: record.name.slice(0, 100),
    tags,
    prior: typeof record.prior === "number" ? record.prior : undefined,
    source: safeSource,
    sourceId: typeof record.sourceId === "string" ? record.sourceId.slice(0, 100) : undefined,
    description: typeof record.description === "string" ? record.description.slice(0, 320) : undefined,
    wikipediaTitle: typeof record.wikipediaTitle === "string" ? record.wikipediaTitle.slice(0, 200) : undefined,
    popularityScore: typeof record.popularityScore === "number" ? record.popularityScore : undefined,
  };
}

function parseCandidateList(value: unknown): CandidateProfile[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(candidateFromUnknown)
    .filter((candidate): candidate is CandidateProfile => Boolean(candidate))
    .slice(0, MAX_PERSISTED_CANDIDATES);
}

function warnPersistence(operation: string): void {
  console.warn("[persistence] optional database operation unavailable", { operation });
}

export async function getPersistentSearchCandidates(cacheKey: string): Promise<CandidateProfile[] | null> {
  const sql = getSbdDatabase();
  if (!sql) return null;

  try {
    const rows = await sql`
      update sussy_baka_detected.search_cache
      set hit_count = hit_count + 1,
          last_hit_at = now()
      where cache_key = ${cacheKey}
        and expires_at > now()
      returning result_entities
    `;
    if (rows.length === 0) return null;
    const candidates = parseCandidateList(rows[0]?.result_entities);
    return candidates;
  } catch {
    warnPersistence("search-cache-read");
    return null;
  }
}

export async function savePersistentSearchCandidates(
  cacheKey: string,
  plan: KnowledgeSearchPlan,
  candidates: readonly CandidateProfile[],
): Promise<void> {
  const sql = getSbdDatabase();
  if (!sql) return;

  const safeCandidates = candidates.slice(0, MAX_PERSISTED_CANDIDATES);

  try {
    await sql`
      insert into sussy_baka_detected.search_cache (
        cache_key,
        primary_query,
        secondary_query,
        result_entities,
        fetched_at,
        expires_at
      ) values (
        ${cacheKey},
        ${plan.primaryQuery},
        ${plan.secondaryQuery ?? null},
        ${sql.json(safeCandidates)},
        now(),
        now() + (${SEARCH_CACHE_TTL_HOURS} * interval '1 hour')
      )
      on conflict (cache_key) do update
      set primary_query = excluded.primary_query,
          secondary_query = excluded.secondary_query,
          result_entities = excluded.result_entities,
          fetched_at = excluded.fetched_at,
          expires_at = excluded.expires_at
    `;
  } catch {
    warnPersistence("search-cache-write");
  }
}

/**
 * Pull previously verified user-revealed candidates whose learned traits overlap
 * the current structured evidence. This gives legitimate misses a fast path into
 * future rounds even before Wikimedia live search runs again.
 */
export async function getLearnedCandidates(plan: KnowledgeSearchPlan): Promise<CandidateProfile[]> {
  const sql = getSbdDatabase();
  if (!sql) return [];

  try {
    const positiveTags = plan.positiveTags.slice(0, 30);
    const rows = positiveTags.length > 0
      ? await sql`
          select canonical_name, source, source_id, wikipedia_title, description,
                 tags, popularity_score
          from sussy_baka_detected.entity_cache
          where source = 'learned'
            and (expires_at is null or expires_at > now())
            and tags && ${sql.array(positiveTags)}::text[]
          order by popularity_score desc, hit_count desc, verified_at desc
          limit 32
        `
      : await sql`
          select canonical_name, source, source_id, wikipedia_title, description,
                 tags, popularity_score
          from sussy_baka_detected.entity_cache
          where source = 'learned'
            and (expires_at is null or expires_at > now())
          order by popularity_score desc, hit_count desc, verified_at desc
          limit 16
        `;

    return rows.map((row) => ({
      name: String(row.canonical_name),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      source: "learned" as const,
      sourceId: typeof row.source_id === "string" ? row.source_id : undefined,
      wikipediaTitle: typeof row.wikipedia_title === "string" ? row.wikipedia_title : undefined,
      description: typeof row.description === "string" ? row.description : undefined,
      popularityScore: typeof row.popularity_score === "number" ? row.popularity_score : 0,
      prior: 0.82,
    }));
  } catch {
    warnPersistence("learned-candidates-read");
    return [];
  }
}

export async function upsertLearnedCandidate(candidate: CandidateProfile): Promise<void> {
  const sql = getSbdDatabase();
  if (!sql) return;

  const normalizedName = normalizeCandidateName(candidate.name);
  if (!normalizedName) return;

  try {
    await sql`
      insert into sussy_baka_detected.entity_cache (
        normalized_name,
        canonical_name,
        source,
        source_id,
        wikipedia_title,
        description,
        tags,
        popularity_score,
        provenance,
        verified_at,
        expires_at
      ) values (
        ${normalizedName},
        ${candidate.name},
        'learned',
        ${candidate.sourceId ?? null},
        ${candidate.wikipediaTitle ?? null},
        ${candidate.description ?? null},
        ${sql.array([...candidate.tags])}::text[],
        ${Math.max(0, candidate.popularityScore ?? 0)},
        ${sql.json({ verifiedBy: "wikidata", learnedFrom: "give_up_reveal" })},
        now(),
        null
      )
      on conflict (normalized_name) do update
      set canonical_name = excluded.canonical_name,
          source = 'learned',
          source_id = coalesce(excluded.source_id, sussy_baka_detected.entity_cache.source_id),
          wikipedia_title = coalesce(excluded.wikipedia_title, sussy_baka_detected.entity_cache.wikipedia_title),
          description = coalesce(excluded.description, sussy_baka_detected.entity_cache.description),
          tags = excluded.tags,
          popularity_score = greatest(sussy_baka_detected.entity_cache.popularity_score, excluded.popularity_score),
          provenance = excluded.provenance,
          verified_at = now(),
          expires_at = null,
          updated_at = now()
    `;
  } catch {
    warnPersistence("learned-candidate-upsert");
  }
}
