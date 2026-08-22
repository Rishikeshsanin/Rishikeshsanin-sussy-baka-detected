import "server-only";

import type { CandidateProfile } from "@/lib/engine/candidates";
import { normalizeCandidateName } from "@/lib/engine/scoring";

import { cacheCandidates, getCachedCandidates, knowledgeCacheKey } from "./cache.server";
import type { KnowledgeSearchPlan } from "./query";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const USER_AGENT = "SussyBakaDetected/2.1 (https://sussy-baka-detected.vercel.app; knowledge-engine)";
const REQUEST_TIMEOUT_MS = 4_500;
const MAX_DISCOVERED_CANDIDATES = 24;

interface WikipediaPage {
  pageid?: number;
  title: string;
  extract?: string;
  pageprops?: {
    wikibase_item?: string;
  };
  pageviews?: Record<string, number | null>;
}

interface WikipediaSearchResponse {
  query?: {
    pages?: WikipediaPage[];
  };
}

interface WikidataClaim {
  mainsnak?: {
    datavalue?: {
      value?: unknown;
    };
  };
}

interface WikidataEntity {
  id: string;
  labels?: Record<string, { value?: string }>;
  descriptions?: Record<string, { value?: string }>;
  aliases?: Record<string, Array<{ value?: string }>>;
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, { title?: string }>;
}

interface WikidataEntitiesResponse {
  entities?: Record<string, WikidataEntity>;
}

interface WikidataSearchResponse {
  search?: Array<{
    id?: string;
    label?: string;
    description?: string;
  }>;
}

const COUNTRY_TAGS: Record<string, string[]> = {
  Q668: ["india"],
  Q30: ["usa"],
  Q408: ["australia"],
  Q145: ["uk", "europe"],
  Q664: ["new_zealand"],
  Q843: ["pakistan"],
  Q258: ["south_africa"],
  Q854: ["sri_lanka"],
  Q902: ["bangladesh"],
  Q889: ["afghanistan"],
  Q766: ["west_indies"], // Jamaica
  Q244: ["west_indies"], // Barbados
  Q754: ["west_indies"], // Trinidad and Tobago
  Q734: ["west_indies", "south_america"], // Guyana
  Q155: ["south_america"], // Brazil
  Q414: ["south_america"], // Argentina
  Q77: ["south_america"], // Uruguay
  Q739: ["south_america"], // Colombia
  Q298: ["south_america"], // Chile
  Q45: ["europe"], // Portugal
  Q29: ["europe"], // Spain
  Q142: ["europe"], // France
  Q183: ["europe"], // Germany
  Q38: ["europe"], // Italy
  Q55: ["europe"], // Netherlands
  Q20: ["europe"], // Norway
  Q34: ["europe"], // Sweden
  Q39: ["europe"], // Switzerland
};

const HUMAN_QID = "Q5";
const MALE_QID = "Q6581097";
const FEMALE_QID = "Q6581072";

function claimEntityIds(entity: WikidataEntity | undefined, property: string): string[] {
  const claims = entity?.claims?.[property] ?? [];
  const ids: string[] = [];
  for (const claim of claims) {
    const value = claim.mainsnak?.datavalue?.value;
    if (value && typeof value === "object" && "id" in value) {
      const id = (value as { id?: unknown }).id;
      if (typeof id === "string") ids.push(id);
    }
  }
  return ids;
}

function firstClaimTime(entity: WikidataEntity | undefined, property: string): string | null {
  const claims = entity?.claims?.[property] ?? [];
  for (const claim of claims) {
    const value = claim.mainsnak?.datavalue?.value;
    if (value && typeof value === "object" && "time" in value) {
      const time = (value as { time?: unknown }).time;
      if (typeof time === "string") return time;
    }
  }
  return null;
}

function extractYear(time: string | null): number | null {
  if (!time) return null;
  const match = time.match(/^([+-]?\d{1,6})-/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

function pageviewTotal(page: WikipediaPage): number {
  return Object.values(page.pageviews ?? {}).reduce<number>(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function popularityPrior(views: number, searchIndex: number): { prior: number; score: number } {
  const viewSignal = Math.log10(Math.max(10, views + 10));
  const rankSignal = Math.max(0, 1 - searchIndex / 20);
  const score = viewSignal * 18 + rankSignal * 12;
  return {
    prior: Number(clamp(0.58 + viewSignal * 0.13 + rankSignal * 0.16, 0.58, 1.5).toFixed(3)),
    score: Number(score.toFixed(2)),
  };
}

function addTextTags(tags: Set<string>, text: string): void {
  const normalized = text.toLocaleLowerCase("en-US");
  const has = (pattern: RegExp) => pattern.test(normalized);

  if (has(/\bcricket(?:er)?\b|\bcricketer\b/)) tags.add("cricket"), tags.add("sports");
  if (has(/\bfast bowler\b|\bpace bowler\b|\bfast-medium\b|\bseam bowler\b/)) tags.add("fast_bowler"), tags.add("bowler"), tags.add("cricket"), tags.add("sports");
  else if (has(/\bbowler\b|\bbowling\b/)) tags.add("bowler"), tags.add("cricket"), tags.add("sports");
  if (has(/\bbatter\b|\bbatsman\b|\bbatting\b/)) tags.add("batter"), tags.add("cricket"), tags.add("sports");
  if (has(/\ball[- ]rounder\b/)) tags.add("all_rounder"), tags.add("cricket"), tags.add("sports");
  if (has(/\bcaptain(?:ed|cy)?\b/)) tags.add("captain");
  if (has(/\bworld cup\b/)) tags.add("world_cup_winner");

  if (has(/\bassociation football\b|\bfootballer\b|\bsoccer player\b/)) tags.add("football"), tags.add("sports");
  if (has(/\bbasketball player\b|\bbasketballer\b/)) tags.add("basketball"), tags.add("sports");
  if (has(/\btennis player\b/)) tags.add("tennis"), tags.add("sports");
  if (has(/\bracing driver\b|\bformula one\b|\bformula 1\b|\bmotorsport\b/)) tags.add("motorsport"), tags.add("sports");
  if (has(/\bboxer\b|\bmixed martial artist\b|\bmma fighter\b|\bprofessional wrestler\b/)) tags.add("combat_sports"), tags.add("sports");

  if (has(/\bactor\b|\bactress\b|\bfilm actor\b|\btelevision actor\b/)) tags.add("acting");
  if (has(/\bbollywood\b|\bhindi cinema\b|\bhindi-language film\b/)) tags.add("bollywood"), tags.add("acting"), tags.add("india");
  if (has(/\btelugu cinema\b|\btelugu-language film\b/)) tags.add("tollywood"), tags.add("acting"), tags.add("india");
  if (has(/\bsouth indian cinema\b|\btamil cinema\b|\bmalayalam cinema\b|\bkannada cinema\b/)) tags.add("south_cinema"), tags.add("acting"), tags.add("india");
  if (has(/\bhollywood\b/)) tags.add("hollywood"), tags.add("acting");

  if (has(/\bsinger\b|\brapper\b|\bmusician\b|\bsongwriter\b|\brecord producer\b/)) tags.add("music");
  if (has(/\bpolitician\b|\bprime minister\b|\bpresident of\b|\bmember of parliament\b/)) tags.add("politics");
  if (has(/\bentrepreneur\b|\bbusinessman\b|\bbusinesswoman\b|\bbusiness magnate\b|\bchief executive\b|\bceo\b/)) tags.add("business");
  if (has(/\bscientist\b|\bphysicist\b|\bchemist\b|\bmathematician\b|\binventor\b|\bastronomer\b/)) tags.add("science");
  if (has(/\byoutuber\b|\bstreamer\b|\binternet personality\b|\bcontent creator\b|\bsocial media personality\b/)) tags.add("internet"), tags.add("creator");
  if (has(/\btechnology entrepreneur\b|\bsoftware engineer\b|\bcomputer scientist\b|\btechnology company\b/)) tags.add("tech");

  if (has(/\bsuperhero\b/)) tags.add("superhero"), tags.add("fictional");
  if (has(/\bsupervillain\b|\bfictional villain\b/)) tags.add("supervillain"), tags.add("fictional");
  if (has(/\bmarvel comics\b|\bmarvel cinematic universe\b|\bmarvel character\b/)) tags.add("marvel"), tags.add("comics"), tags.add("fictional");
  if (has(/\bdc comics\b|\bdc universe\b/)) tags.add("dc"), tags.add("comics"), tags.add("fictional");
  if (has(/\banime\b|\bmanga\b/)) tags.add("anime"), tags.add("japan"), tags.add("fictional");
  if (has(/\bvideo game character\b|\bvideo game franchise\b/)) tags.add("video_game"), tags.add("fictional");
  if (has(/\bcartoon character\b|\banimated character\b/)) tags.add("cartoon"), tags.add("animated"), tags.add("fictional");
  if (has(/\bfictional character\b/)) tags.add("fictional");
  if (has(/\bstar wars\b/)) tags.add("star_wars"), tags.add("space"), tags.add("fictional");
  if (has(/\bdetective\b/)) tags.add("detective");
  if (has(/\bninja\b/)) tags.add("ninja");
  if (has(/\bpirate\b/)) tags.add("pirate");
  if (has(/\bmagic\b|\bwizard\b|\bwitch\b|\bsorcerer\b|\bsupernatural powers?\b/)) tags.add("magic");
  if (has(/\bspace opera\b|\bscience fiction\b|\bextraterrestrial\b|\balien\b/)) tags.add("space");

  if (has(/\bindian\b|\bindia\b/)) tags.add("india");
  if (has(/\baustralian\b|\baustralia\b/)) tags.add("australia");
  if (has(/\bamerican\b|\bunited states\b|\bu\.s\.\b/)) tags.add("usa");
  if (has(/\bbritish\b|\benglish\b|\bunited kingdom\b/)) tags.add("uk"), tags.add("europe");
  if (has(/\bnew zealand\b|\bnew zealander\b/)) tags.add("new_zealand");
  if (has(/\bpakistani\b|\bpakistan\b/)) tags.add("pakistan");
  if (has(/\bsouth african\b|\bsouth africa\b/)) tags.add("south_africa");
  if (has(/\bsri lankan\b|\bsri lanka\b/)) tags.add("sri_lanka");
  if (has(/\bbangladeshi\b|\bbangladesh\b/)) tags.add("bangladesh");
  if (has(/\bwest indies\b|\bwest indian\b/)) tags.add("west_indies");
  if (has(/\bargentine\b|\bargentinian\b|\bbrazilian\b|\bcolombian\b|\bchilean\b|\buruguayan\b/)) tags.add("south_america");
  if (has(/\beuropean\b|\bfrench\b|\bgerman\b|\bspanish\b|\bportuguese\b|\bitalian\b|\bdutch\b|\bserbian\b|\bswiss\b|\bswedish\b|\bnorwegian\b/)) tags.add("europe");
}

function isNoisyWikipediaTitle(title: string): boolean {
  return /^(list of|category:|template:|portal:|outline of|index of)/i.test(title) ||
    /\bseason\b|\btournament\b|\bteam squad\b|\broster\b/i.test(title);
}

function entityIsHuman(entity: WikidataEntity | undefined): boolean {
  return claimEntityIds(entity, "P31").includes(HUMAN_QID);
}

function candidateFromPage(
  page: WikipediaPage,
  entity: WikidataEntity | undefined,
  plan: KnowledgeSearchPlan,
  searchIndex: number,
): CandidateProfile | null {
  if (!entity || !page.pageprops?.wikibase_item) return null;
  if (isNoisyWikipediaTitle(page.title)) return null;

  const human = entityIsHuman(entity);
  if (plan.expectsRealPerson === true && !human) return null;
  if (plan.expectsFictionalCharacter === true && human) return null;

  const name = entity.labels?.en?.value?.trim() || page.title.trim();
  if (!name || name.length > 100) return null;

  const description = entity.descriptions?.en?.value?.trim() || page.extract?.trim() || "";
  const text = [name, description, page.extract ?? ""].join(" ");
  const tags = new Set<string>();

  if (human) tags.add("real");
  addTextTags(tags, text);

  if (!human && plan.expectsFictionalCharacter === true) tags.add("fictional");
  if (claimEntityIds(entity, "P21").includes(MALE_QID)) tags.add("man");
  if (claimEntityIds(entity, "P21").includes(FEMALE_QID)) tags.add("woman");

  for (const countryId of claimEntityIds(entity, "P27")) {
    for (const tag of COUNTRY_TAGS[countryId] ?? []) tags.add(tag);
  }

  const deathDate = firstClaimTime(entity, "P570");
  if (human && !deathDate) tags.add("alive");
  if (human && deathDate) tags.add("historical");

  const birthYear = extractYear(firstClaimTime(entity, "P569"));
  if (birthYear !== null) {
    if (birthYear < 1980) tags.add("born_before_1980");
    if (birthYear >= 1980) tags.add("born_after_1980");
    if (birthYear >= 2000) tags.add("born_after_2000");
  }

  // Respect strong type evidence even if the Wikipedia lead is terse.
  if (plan.expectsRealPerson === true) tags.add("real");
  if (plan.expectsFictionalCharacter === true) tags.add("fictional");

  const views = pageviewTotal(page);
  const popularity = popularityPrior(views, searchIndex);

  return {
    name,
    tags: [...tags],
    prior: popularity.prior,
    source: "wikimedia",
    sourceId: entity.id,
    wikipediaTitle: page.title,
    description: description.slice(0, 320),
    popularityScore: popularity.score,
  };
}

async function fetchJson<T>(url: URL, signal?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortListener = () => controller.abort();
  signal?.addEventListener("abort", abortListener, { once: true });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Wikimedia request failed with ${response.status}`);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortListener);
  }
}

async function searchWikipedia(query: string, signal?: AbortSignal): Promise<WikipediaPage[]> {
  const url = new URL(WIKIPEDIA_API);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "0",
    gsrlimit: "12",
    prop: "pageprops|extracts|pageviews",
    exintro: "1",
    explaintext: "1",
    exsentences: "3",
    pvipdays: "30",
    redirects: "1",
  }).toString();

  const response = await fetchJson<WikipediaSearchResponse>(url, signal);
  return response.query?.pages ?? [];
}

async function fetchWikidataEntities(
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<Map<string, WikidataEntity>> {
  const uniqueIds = [...new Set(ids.filter((id) => /^Q\d+$/.test(id)))].slice(0, 50);
  if (uniqueIds.length === 0) return new Map();

  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: "wbgetentities",
    format: "json",
    formatversion: "2",
    ids: uniqueIds.join("|"),
    props: "labels|descriptions|aliases|claims|sitelinks",
    languages: "en",
  }).toString();

  const response = await fetchJson<WikidataEntitiesResponse>(url, signal);
  return new Map(Object.entries(response.entities ?? {}));
}

function dedupePages(pages: readonly WikipediaPage[]): WikipediaPage[] {
  const seen = new Set<string>();
  const result: WikipediaPage[] = [];
  for (const page of pages) {
    const key = page.pageprops?.wikibase_item ?? page.title.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(page);
  }
  return result;
}

export async function discoverWikimediaCandidates(
  plan: KnowledgeSearchPlan,
  signal?: AbortSignal,
): Promise<CandidateProfile[]> {
  const key = knowledgeCacheKey(plan.primaryQuery, plan.secondaryQuery);
  const cached = getCachedCandidates(key);
  if (cached) return cached;

  const searches = [plan.primaryQuery, plan.secondaryQuery].filter(
    (query): query is string => Boolean(query),
  );

  const settled = await Promise.allSettled(searches.map((query) => searchWikipedia(query, signal)));
  const pages = dedupePages(
    settled.flatMap((result) => result.status === "fulfilled" ? result.value : []),
  ).slice(0, 24);

  if (pages.length === 0) {
    cacheCandidates(key, [], 2 * 60 * 1000);
    return [];
  }

  const entities = await fetchWikidataEntities(
    pages.map((page) => page.pageprops?.wikibase_item ?? ""),
    signal,
  );

  const candidates = pages
    .map((page, index) => candidateFromPage(
      page,
      entities.get(page.pageprops?.wikibase_item ?? ""),
      plan,
      index,
    ))
    .filter((candidate): candidate is CandidateProfile => Boolean(candidate));

  const deduped = new Map<string, CandidateProfile>();
  for (const candidate of candidates) {
    const keyName = normalizeCandidateName(candidate.name);
    const current = deduped.get(keyName);
    if (!current || (candidate.popularityScore ?? 0) > (current.popularityScore ?? 0)) {
      deduped.set(keyName, candidate);
    }
  }

  const ranked = [...deduped.values()]
    .sort((a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0))
    .slice(0, MAX_DISCOVERED_CANDIDATES);

  cacheCandidates(key, ranked);
  return ranked;
}

/**
 * Resolve a user-supplied reveal against Wikidata. This is intentionally strict:
 * a miss can become a learned candidate only after it maps to a real entity.
 */
export async function resolveWikidataEntityByName(
  name: string,
  signal?: AbortSignal,
): Promise<{ id: string; label: string; description: string } | null> {
  const cleaned = name.trim().replace(/\s+/g, " ").slice(0, 100);
  if (cleaned.length < 2) return null;

  const url = new URL(WIKIDATA_API);
  url.search = new URLSearchParams({
    action: "wbsearchentities",
    format: "json",
    language: "en",
    uselang: "en",
    type: "item",
    limit: "5",
    search: cleaned,
  }).toString();

  const response = await fetchJson<WikidataSearchResponse>(url, signal, 3_500);
  const normalizedInput = normalizeCandidateName(cleaned);
  const best = (response.search ?? []).find(
    (item) => item.id && item.label && normalizeCandidateName(item.label) === normalizedInput,
  ) ?? response.search?.[0];

  if (!best?.id || !best.label) return null;
  return {
    id: best.id,
    label: best.label,
    description: best.description ?? "",
  };
}
