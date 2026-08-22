import type { GameAnswer } from "@/lib/game/types";

export interface RecoveryQuestion {
  questionId: string;
  question: string;
  tag: string;
  when?: (answers: Map<string, GameAnswer["answer"]>) => boolean;
}

const positive = (answer: GameAnswer["answer"] | undefined) =>
  answer === "yes" || answer === "probably";
const negative = (answer: GameAnswer["answer"] | undefined) =>
  answer === "no" || answer === "probably_not";
const likelyReal = (answers: Map<string, GameAnswer["answer"]>) =>
  positive(answers.get("first-real-person"));
const likelyFictional = (answers: Map<string, GameAnswer["answer"]>) =>
  negative(answers.get("first-real-person")) || positive(answers.get("fictional"));

export const RECOVERY_QUESTIONS: readonly RecoveryQuestion[] = [
  {
    questionId: "recovery-cricket-fast-bowler",
    question: "Is your cricketer best known as a fast bowler?",
    tag: "fast_bowler",
    when: (answers) => positive(answers.get("cricket")),
  },
  {
    questionId: "recovery-cricket-world-cup",
    question: "Has your cricketer won a senior Cricket World Cup?",
    tag: "world_cup_winner",
    when: (answers) => positive(answers.get("cricket")),
  },
  {
    questionId: "recovery-sports-team",
    question: "Is your person mainly known for a team sport?",
    tag: "team_sport",
    when: (answers) => positive(answers.get("sports")),
  },
  {
    questionId: "recovery-active-career",
    question: "Is your person still active in the field they are famous for?",
    tag: "active",
    when: likelyReal,
  },
  {
    questionId: "recovery-international-fame",
    question: "Is your person famous internationally?",
    tag: "international_fame",
    when: likelyReal,
  },
  {
    questionId: "recovery-real-modern-fame",
    question: "Did your person become widely famous mainly after the year 2000?",
    tag: "modern_fame",
    when: likelyReal,
  },
  {
    questionId: "recovery-real-entertainment",
    question: "Is your person mainly part of the entertainment industry?",
    tag: "entertainment",
    when: likelyReal,
  },
  {
    questionId: "recovery-real-leadership",
    question: "Is leadership, captaincy, or public office a major part of their fame?",
    tag: "leadership",
    when: likelyReal,
  },
  {
    questionId: "recovery-fictional-human",
    question: "Is your fictional character human?",
    tag: "fictional_human",
    when: likelyFictional,
  },
  {
    questionId: "recovery-fictional-hero",
    question: "Is your fictional character usually portrayed as a hero?",
    tag: "hero",
    when: likelyFictional,
  },
  {
    questionId: "recovery-fictional-antagonist",
    question: "Is your character usually an antagonist or enemy?",
    tag: "antagonist",
    when: likelyFictional,
  },
  {
    questionId: "recovery-fictional-live-action",
    question: "Is your character mainly known from live-action appearances?",
    tag: "live_action",
    when: likelyFictional,
  },
  {
    questionId: "recovery-fictional-series",
    question: "Is your character part of a long-running series or franchise?",
    tag: "long_running_franchise",
    when: likelyFictional,
  },
  {
    questionId: "recovery-fictional-modern",
    question: "Did your character first become widely known after the year 2000?",
    tag: "modern_fiction",
    when: likelyFictional,
  },
  {
    questionId: "recovery-fictional-speaking",
    question: "Does your character normally speak like a human?",
    tag: "speaking_character",
    when: likelyFictional,
  },
];

export const RECOVERY_QUESTION_BY_ID = new Map(
  RECOVERY_QUESTIONS.map((question) => [question.questionId, question]),
);

export function selectRecoveryQuestion(history: readonly GameAnswer[]): RecoveryQuestion | null {
  const asked = new Set(history.map((entry) => entry.questionId));
  const answers = new Map(history.map((entry) => [entry.questionId, entry.answer]));

  return RECOVERY_QUESTIONS.find(
    (candidate) => !asked.has(candidate.questionId) && (!candidate.when || candidate.when(answers)),
  ) ?? null;
}
