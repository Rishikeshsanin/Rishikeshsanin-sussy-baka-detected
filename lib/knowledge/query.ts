import type { AnswerType, GameAnswer } from "@/lib/game/types";
import { QUESTION_BY_ID } from "@/lib/engine/questions";

export interface KnowledgeSearchPlan {
  primaryQuery: string;
  secondaryQuery?: string;
  positiveTags: string[];
  negativeTags: string[];
  expectsRealPerson: boolean | null;
  expectsFictionalCharacter: boolean | null;
}

const POSITIVE_ANSWERS = new Set<AnswerType>(["yes", "probably"]);
const NEGATIVE_ANSWERS = new Set<AnswerType>(["no", "probably_not"]);

const SEARCH_TERMS: Record<string, string> = {
  real: "person",
  fictional: "fictional character",
  man: "male",
  woman: "female",
  alive: "living",
  india: "Indian",
  usa: "American",
  europe: "European",
  south_america: "South American",
  australia: "Australian",
  uk: "British",
  new_zealand: "New Zealand",
  pakistan: "Pakistani",
  south_africa: "South African",
  sri_lanka: "Sri Lankan",
  bangladesh: "Bangladeshi",
  west_indies: "West Indian",
  sports: "athlete",
  cricket: "cricketer",
  bowler: "bowler",
  batter: "batter",
  all_rounder: "all-rounder",
  captain: "captain",
  football: "footballer",
  basketball: "basketball player",
  tennis: "tennis player",
  motorsport: "racing driver",
  combat_sports: "combat sports athlete",
  acting: "actor",
  bollywood: "Bollywood",
  tollywood: "Telugu cinema",
  south_cinema: "South Indian cinema",
  hollywood: "Hollywood",
  music: "musician",
  politics: "politician",
  business: "businessperson",
  science: "scientist",
  internet: "internet personality",
  creator: "content creator",
  tech: "technology",
  historical: "historical figure",
  superhero: "superhero",
  supervillain: "villain",
  marvel: "Marvel",
  dc: "DC Comics",
  comics: "comics",
  books: "novel character",
  anime: "anime character",
  japan: "Japanese",
  video_game: "video game character",
  animated: "animated character",
  cartoon: "cartoon character",
  movie: "film character",
  tv: "television character",
  magic: "magic",
  space: "science fiction",
  star_wars: "Star Wars",
  detective: "detective",
  fighter: "fighter",
  ninja: "ninja",
  pirate: "pirate",
};

const QUERY_PRIORITY = [
  "australia",
  "india",
  "usa",
  "uk",
  "new_zealand",
  "pakistan",
  "south_africa",
  "sri_lanka",
  "bangladesh",
  "west_indies",
  "tollywood",
  "bollywood",
  "hollywood",
  "cricket",
  "football",
  "basketball",
  "tennis",
  "motorsport",
  "combat_sports",
  "acting",
  "music",
  "politics",
  "business",
  "science",
  "creator",
  "internet",
  "superhero",
  "supervillain",
  "marvel",
  "dc",
  "anime",
  "video_game",
  "star_wars",
  "cartoon",
  "books",
  "captain",
  "bowler",
  "batter",
  "all_rounder",
  "tech",
  "man",
  "woman",
] as const;

const SPECIFIC_TAGS = new Set([
  "cricket",
  "football",
  "basketball",
  "tennis",
  "motorsport",
  "combat_sports",
  "acting",
  "music",
  "politics",
  "business",
  "science",
  "creator",
  "internet",
  "bollywood",
  "tollywood",
  "hollywood",
  "superhero",
  "supervillain",
  "marvel",
  "dc",
  "anime",
  "video_game",
  "star_wars",
  "cartoon",
  "books",
  "captain",
  "bowler",
  "batter",
  "all_rounder",
]);

const LOCATION_TAGS = new Set([
  "india",
  "usa",
  "europe",
  "south_america",
  "australia",
  "uk",
  "new_zealand",
  "pakistan",
  "south_africa",
  "sri_lanka",
  "bangladesh",
  "west_indies",
]);

function isPositive(answer: AnswerType | undefined): boolean {
  return answer !== undefined && POSITIVE_ANSWERS.has(answer);
}

function isNegative(answer: AnswerType | undefined): boolean {
  return answer !== undefined && NEGATIVE_ANSWERS.has(answer);
}

function dedupe<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function inferRecoveryTags(history: readonly GameAnswer[]): { positive: string[]; negative: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];

  const add = (tag: string, answer: AnswerType) => {
    if (isPositive(answer)) positive.push(tag);
    if (isNegative(answer)) negative.push(tag);
  };

  for (const entry of history) {
    switch (entry.questionId) {
      case "recovery-cricket-fast-bowler":
        add("fast_bowler", entry.answer);
        if (isPositive(entry.answer)) positive.push("bowler");
        break;
      case "recovery-cricket-world-cup":
        add("world_cup_winner", entry.answer);
        break;
      case "recovery-active-career":
        add("active", entry.answer);
        break;
      case "recovery-international-fame":
        add("international_fame", entry.answer);
        break;
      case "recovery-fictional-human":
        add("fictional_human", entry.answer);
        break;
      case "recovery-fictional-hero":
        add("hero", entry.answer);
        break;
    }
  }

  return { positive, negative };
}

/**
 * Converts established yes/no evidence into two Wikipedia full-text searches.
 * The first is specific; the second intentionally drops late-game role details
 * so discovery can recover if the user's answer to one fuzzy trait was off.
 */
export function buildKnowledgeSearchPlan(
  history: readonly GameAnswer[],
): KnowledgeSearchPlan | null {
  const positiveTags: string[] = [];
  const negativeTags: string[] = [];

  for (const entry of history) {
    const question = QUESTION_BY_ID.get(entry.questionId);
    if (!question) continue;
    if (isPositive(entry.answer)) positiveTags.push(question.tag);
    if (isNegative(entry.answer)) negativeTags.push(question.tag);
  }

  const recovery = inferRecoveryTags(history);
  positiveTags.push(...recovery.positive);
  negativeTags.push(...recovery.negative);

  const positive = dedupe(positiveTags);
  const negative = dedupe(negativeTags);
  const realAnswer = history.find((entry) => entry.questionId === "first-real-person")?.answer;
  const fictionalAnswer = history.find((entry) => entry.questionId === "fictional")?.answer;

  const expectsRealPerson = realAnswer
    ? isPositive(realAnswer)
      ? true
      : isNegative(realAnswer)
        ? false
        : null
    : null;
  const expectsFictionalCharacter = fictionalAnswer
    ? isPositive(fictionalAnswer)
      ? true
      : isNegative(fictionalAnswer)
        ? false
        : null
    : expectsRealPerson === false
      ? true
      : null;

  const specificCount = positive.filter((tag) => SPECIFIC_TAGS.has(tag)).length;
  const locationCount = positive.filter((tag) => LOCATION_TAGS.has(tag)).length;

  // Avoid expensive, noisy searches such as just "male person". Once enough
  // answers exist we permit discovery with one strong domain clue.
  if (specificCount === 0) return null;
  if (history.length < 6 && specificCount + locationCount < 2) return null;

  const orderedTags = QUERY_PRIORITY.filter((tag) => positive.includes(tag));
  const terms = orderedTags
    .map((tag) => SEARCH_TERMS[tag])
    .filter((term): term is string => Boolean(term));

  if (expectsFictionalCharacter === true && !terms.some((term) => /character/i.test(term))) {
    terms.push("fictional character");
  } else if (expectsRealPerson === true && !terms.some((term) => /person|athlete|player|cricketer|actor|musician|politician|scientist|footballer/i.test(term))) {
    terms.push("person");
  }

  const primaryTerms = dedupe(terms).slice(0, 6);
  if (primaryTerms.length === 0) return null;

  const broadTerms = primaryTerms.filter(
    (term) => !/captain|bowler|batter|all-rounder|male|female|technology|fighter|magic/i.test(term),
  );

  const primaryQuery = primaryTerms.join(" ").slice(0, 160);
  const secondaryQuery = broadTerms.length >= 1 && broadTerms.join(" ") !== primaryQuery
    ? broadTerms.slice(0, 4).join(" ").slice(0, 140)
    : undefined;

  return {
    primaryQuery,
    secondaryQuery,
    positiveTags: positive,
    negativeTags: negative,
    expectsRealPerson,
    expectsFictionalCharacter,
  };
}
