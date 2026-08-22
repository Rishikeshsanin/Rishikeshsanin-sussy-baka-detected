import type { GameAnswer } from "@/lib/game/types";

export interface RecoveryQuestion {
  questionId: string;
  question: string;
  tag: string;
  when?: (answers: Map<string, GameAnswer["answer"]>) => boolean;
}

const positive = (answer: GameAnswer["answer"] | undefined) =>
  answer === "yes" || answer === "probably";

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
    when: (answers) => positive(answers.get("first-real-person")),
  },
  {
    questionId: "recovery-international-fame",
    question: "Is your person famous internationally?",
    tag: "international_fame",
    when: (answers) => positive(answers.get("first-real-person")),
  },
  {
    questionId: "recovery-fictional-human",
    question: "Is your fictional character human?",
    tag: "fictional_human",
    when: (answers) => positive(answers.get("fictional")),
  },
  {
    questionId: "recovery-fictional-hero",
    question: "Is your fictional character usually portrayed as a hero?",
    tag: "hero",
    when: (answers) => positive(answers.get("fictional")),
  },
];

export const RECOVERY_QUESTION_BY_ID = new Map(
  RECOVERY_QUESTIONS.map((question) => [question.questionId, question]),
);

/**
 * Last-resort questions used when external discovery/AI is unavailable and the
 * structured scorer has no high-information question left. The answers remain
 * first-class structured evidence on later turns.
 */
export function selectRecoveryQuestion(history: readonly GameAnswer[]): RecoveryQuestion | null {
  const asked = new Set(history.map((entry) => entry.questionId));
  const answers = new Map(history.map((entry) => [entry.questionId, entry.answer]));

  return RECOVERY_QUESTIONS.find(
    (candidate) => !asked.has(candidate.questionId) && (!candidate.when || candidate.when(answers)),
  ) ?? null;
}
