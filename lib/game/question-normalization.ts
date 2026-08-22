const SUBJECT_WORDS = new Set([
  "a",
  "an",
  "the",
  "your",
  "this",
  "that",
  "their",
  "character",
  "person",
  "individual",
  "figure",
  "someone",
  "they",
]);

const PRESENT_AUXILIARIES = new Set(["is", "are", "does", "do", "has", "have"]);

const SEMANTIC_SYNONYMS: Readonly<Record<string, string>> = {
  actress: "actor",
  boy: "male",
  female: "female",
  girl: "female",
  guy: "male",
  lady: "female",
  living: "alive",
  man: "male",
  movie: "film",
  movies: "film",
  woman: "female",
};

const CONTRACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bisn['’]t\b/gu, "is not"],
  [/\baren['’]t\b/gu, "are not"],
  [/\bwasn['’]t\b/gu, "was not"],
  [/\bweren['’]t\b/gu, "were not"],
  [/\bdoesn['’]t\b/gu, "does not"],
  [/\bdon['’]t\b/gu, "do not"],
  [/\bdidn['’]t\b/gu, "did not"],
  [/\bhasn['’]t\b/gu, "has not"],
  [/\bhaven['’]t\b/gu, "have not"],
  [/\bcan['’]t\b/gu, "cannot"],
  [/\bcouldn['’]t\b/gu, "could not"],
  [/\bwouldn['’]t\b/gu, "would not"],
];

/** Produces a stable comparison key without changing player-visible copy. */
export function normalizeQuestion(question: string): string {
  let normalized = question
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u2018\u2019]/gu, "'");

  for (const [pattern, replacement] of CONTRACTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function semanticFingerprint(question: string): string {
  const tokens = normalizeQuestion(question)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !SUBJECT_WORDS.has(token))
    .filter((token) => !PRESENT_AUXILIARIES.has(token))
    .map((token) => SEMANTIC_SYNONYMS[token] ?? token);

  return [...new Set(tokens)].sort().join(" ");
}

/** Conservatively catches textual duplicates and a small set of obvious paraphrases. */
export function isDuplicateQuestion(
  question: string,
  priorQuestions: readonly string[],
): boolean {
  const normalized = normalizeQuestion(question);
  if (normalized.length === 0) {
    return false;
  }

  const fingerprint = semanticFingerprint(question);

  return priorQuestions.some((priorQuestion) => {
    if (normalizeQuestion(priorQuestion) === normalized) {
      return true;
    }

    return fingerprint.length > 0 && semanticFingerprint(priorQuestion) === fingerprint;
  });
}
