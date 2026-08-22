import type { GameAnswer } from "@/lib/game/types";

export interface TraitQuestion {
  id: string;
  text: string;
  tag: string;
}

/**
 * Questions are intentionally broad-to-specific. The scorer chooses among them
 * by expected information gain, so ordering is only a tie-breaker.
 */
export const TRAIT_QUESTIONS: readonly TraitQuestion[] = [
  { id: "first-real-person", text: "Is your character a real person?", tag: "real" },
  { id: "alive", text: "Is your person alive today?", tag: "alive" },
  { id: "man", text: "Is your person a man?", tag: "man" },
  { id: "woman", text: "Is your person a woman?", tag: "woman" },

  { id: "asia", text: "Is your person strongly associated with Asia?", tag: "asia" },
  { id: "europe", text: "Is your person strongly associated with Europe?", tag: "europe" },
  { id: "north-america", text: "Is your person strongly associated with North America?", tag: "north_america" },
  { id: "south-america", text: "Is your person strongly associated with South America?", tag: "south_america" },
  { id: "africa", text: "Is your person strongly associated with Africa?", tag: "africa" },
  { id: "oceania", text: "Is your person strongly associated with Australia, New Zealand, or Oceania?", tag: "oceania" },

  { id: "india", text: "Is your person strongly associated with India?", tag: "india" },
  { id: "usa", text: "Is your person strongly associated with the United States?", tag: "usa" },
  { id: "australia", text: "Is your person strongly associated with Australia?", tag: "australia" },
  { id: "uk", text: "Is your person strongly associated with the United Kingdom?", tag: "uk" },
  { id: "new-zealand", text: "Is your person strongly associated with New Zealand?", tag: "new_zealand" },
  { id: "pakistan", text: "Is your person strongly associated with Pakistan?", tag: "pakistan" },
  { id: "south-africa", text: "Is your person strongly associated with South Africa?", tag: "south_africa" },
  { id: "sri-lanka", text: "Is your person strongly associated with Sri Lanka?", tag: "sri_lanka" },
  { id: "bangladesh", text: "Is your person strongly associated with Bangladesh?", tag: "bangladesh" },
  { id: "west-indies", text: "Is your person strongly associated with the West Indies or Caribbean?", tag: "west_indies" },
  { id: "japan-person", text: "Is your person strongly associated with Japan?", tag: "japan" },
  { id: "south-korea", text: "Is your person strongly associated with South Korea?", tag: "korea" },
  { id: "canada", text: "Is your person strongly associated with Canada?", tag: "canada" },

  { id: "sports", text: "Is your person mainly famous for sports?", tag: "sports" },
  { id: "acting", text: "Is your person mainly known for acting?", tag: "acting" },
  { id: "music", text: "Is your person mainly known for music?", tag: "music" },
  { id: "politics", text: "Is your person mainly known for politics?", tag: "politics" },
  { id: "business", text: "Is your person mainly known for business?", tag: "business" },
  { id: "science", text: "Is your person mainly known for science or invention?", tag: "science" },
  { id: "internet", text: "Did your person become famous mainly through the internet?", tag: "internet" },
  { id: "creator", text: "Is your person a major online creator or streamer?", tag: "creator" },

  { id: "cricket", text: "Is your person famous for cricket?", tag: "cricket" },
  { id: "cricket-bowler", text: "Is your cricketer mainly known as a bowler?", tag: "bowler" },
  { id: "cricket-batter", text: "Is your cricketer mainly known as a batter?", tag: "batter" },
  { id: "cricket-all-rounder", text: "Is your cricketer mainly known as an all-rounder?", tag: "all_rounder" },
  { id: "cricket-captain", text: "Has your cricketer captained their national team?", tag: "captain" },
  { id: "football", text: "Is your person famous for football (soccer)?", tag: "football" },
  { id: "basketball", text: "Is your person famous for basketball?", tag: "basketball" },
  { id: "tennis", text: "Is your person famous for tennis?", tag: "tennis" },
  { id: "motorsport", text: "Is your person famous for motorsport?", tag: "motorsport" },
  { id: "combat-sports", text: "Is your person famous for boxing, MMA, or another combat sport?", tag: "combat_sports" },

  { id: "bollywood", text: "Is your person strongly associated with Bollywood?", tag: "bollywood" },
  { id: "tollywood", text: "Is your person strongly associated with Telugu cinema?", tag: "tollywood" },
  { id: "south-cinema", text: "Is your person strongly associated with South Indian cinema?", tag: "south_cinema" },
  { id: "hollywood", text: "Is your person strongly associated with Hollywood?", tag: "hollywood" },
  { id: "tech", text: "Is your person strongly associated with technology?", tag: "tech" },
  { id: "historical", text: "Is your person mainly remembered as a historical figure?", tag: "historical" },
  { id: "born-before-1980", text: "Was your person born before 1980?", tag: "born_before_1980" },
  { id: "born-after-1980", text: "Was your person born in 1980 or later?", tag: "born_after_1980" },
  { id: "born-after-2000", text: "Was your person born in 2000 or later?", tag: "born_after_2000" },

  { id: "fictional", text: "Is your character fictional?", tag: "fictional" },
  { id: "superhero", text: "Is your character a superhero?", tag: "superhero" },
  { id: "supervillain", text: "Is your character mainly a villain?", tag: "supervillain" },
  { id: "marvel", text: "Is your character from Marvel?", tag: "marvel" },
  { id: "dc", text: "Is your character from DC?", tag: "dc" },
  { id: "comics", text: "Did your character originate from comics?", tag: "comics" },
  { id: "books", text: "Is your character strongly associated with books or novels?", tag: "books" },
  { id: "anime", text: "Is your character from anime or manga?", tag: "anime" },
  { id: "japan", text: "Is your character from a Japanese franchise?", tag: "japan" },
  { id: "video-game", text: "Is your character primarily from a video game?", tag: "video_game" },
  { id: "animated", text: "Is your character usually animated?", tag: "animated" },
  { id: "cartoon", text: "Is your character mainly from a cartoon series?", tag: "cartoon" },
  { id: "movie", text: "Is your character mainly known from movies?", tag: "movie" },
  { id: "tv", text: "Is your character mainly known from television?", tag: "tv" },
  { id: "magic", text: "Does your character use magic or supernatural powers?", tag: "magic" },
  { id: "space", text: "Is your character strongly associated with space or science fiction?", tag: "space" },
  { id: "star-wars", text: "Is your character from Star Wars?", tag: "star_wars" },
  { id: "detective", text: "Is your character known for solving mysteries?", tag: "detective" },
  { id: "fighter", text: "Is fighting a defining part of your character?", tag: "fighter" },
  { id: "ninja", text: "Is your character a ninja?", tag: "ninja" },
  { id: "pirate", text: "Is your character a pirate?", tag: "pirate" },
];

export const QUESTION_BY_ID = new Map(TRAIT_QUESTIONS.map((question) => [question.id, question]));

const REAL_ONLY_IDS = new Set([
  "alive", "asia", "europe", "north-america", "south-america", "africa", "oceania",
  "india", "usa", "australia", "uk", "new-zealand", "pakistan", "south-africa",
  "sri-lanka", "bangladesh", "west-indies", "japan-person", "south-korea", "canada",
  "sports", "acting", "music", "politics", "business", "science", "internet", "creator",
  "cricket", "football", "basketball", "tennis", "motorsport", "combat-sports",
  "bollywood", "tollywood", "south-cinema", "hollywood", "tech", "historical",
  "born-before-1980", "born-after-1980", "born-after-2000",
]);

const FICTIONAL_ONLY_IDS = new Set([
  "superhero", "supervillain", "marvel", "dc", "comics", "books", "anime", "japan",
  "video-game", "animated", "cartoon", "movie", "tv", "magic", "space", "star-wars",
  "detective", "fighter", "ninja", "pirate",
]);

const SPORTS_CHILD_IDS = new Set(["cricket", "football", "basketball", "tennis", "motorsport", "combat-sports"]);
const CRICKET_CHILD_IDS = new Set(["cricket-bowler", "cricket-batter", "cricket-all-rounder", "cricket-captain"]);
const ACTING_CHILD_IDS = new Set(["bollywood", "tollywood", "south-cinema", "hollywood"]);

const positive = (answer: GameAnswer["answer"] | undefined): boolean =>
  answer === "yes" || answer === "probably";
const negative = (answer: GameAnswer["answer"] | undefined): boolean =>
  answer === "no" || answer === "probably_not";

/** Prevents logically awkward questions once a branch has already been settled. */
export function isTraitQuestionApplicable(
  question: TraitQuestion,
  history: readonly GameAnswer[],
): boolean {
  const answers = new Map(history.map((entry) => [entry.questionId, entry.answer]));
  const realAnswer = answers.get("first-real-person");
  const fictionalAnswer = answers.get("fictional");
  const isReal = positive(realAnswer) || negative(fictionalAnswer);
  const isFictional = negative(realAnswer) || positive(fictionalAnswer);

  if (question.id === "first-real-person" && history.length > 0) return false;
  if (question.id === "fictional" && (isReal || isFictional)) return false;
  if (REAL_ONLY_IDS.has(question.id) && isFictional) return false;
  if (FICTIONAL_ONLY_IDS.has(question.id) && isReal) return false;

  if (question.id === "woman" && positive(answers.get("man"))) return false;
  if (question.id === "man" && positive(answers.get("woman"))) return false;

  if (SPORTS_CHILD_IDS.has(question.id) && negative(answers.get("sports"))) return false;
  if (CRICKET_CHILD_IDS.has(question.id) && !positive(answers.get("cricket"))) return false;
  if (ACTING_CHILD_IDS.has(question.id) && negative(answers.get("acting"))) return false;

  // Once a parent is positively established, its sibling branches remain useful;
  // when explicitly rejected, asking a specialization under it is not.
  if (question.id === "sports" && ["cricket", "football", "basketball", "tennis", "motorsport", "combat-sports"].some((id) => positive(answers.get(id)))) {
    return false;
  }
  if (question.id === "acting" && ["bollywood", "tollywood", "south-cinema", "hollywood"].some((id) => positive(answers.get(id)))) {
    return false;
  }

  return true;
}
