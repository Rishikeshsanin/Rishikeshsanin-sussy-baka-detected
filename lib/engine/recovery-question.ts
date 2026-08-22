import type { GameAnswer } from "@/lib/game/types";

interface RecoveryQuestion {
  questionId: string;
  question: string;
  when?: (answers: Map<string, GameAnswer["answer"]>) => boolean;
}

const positive = (answer: GameAnswer["answer"] | undefined) =>
  answer === "yes" || answer === "probably";

const RECOVERY_QUESTIONS: readonly RecoveryQuestion[] = [
  {
    questionId: "recovery-cricket-fast-bowler",
    question: "Is your cricketer best known as a fast bowler?",
    when: (answers) => positive(answers.get("cricket")),
  },
  {
    questionId: "recovery-cricket-world-cup",
    question: "Has your cricketer won a senior Cricket World Cup?",
    when: (answers) => positive(answers.get("cricket")),
  },
  {
    questionId: "recovery-sports-team",
    question: "Is your person mainly known for a team sport?",
    when: (answers) => positive(answers.get("sports")),
  },
  {
    questionId: "recovery-active-career",
    question: "Is your person still active in the field they are famous for?",
    when: (answers) => positive(answers.get("first-real-person")),
  },
  {
    questionId: "recovery-international-fame",
    question: "Is your person famous internationally?",
    when: (answers) => positive(answers.get("first-real-person")),
  },
  {
    questionId: "recovery-fictional-human",
    question: "Is your fictional character human?",
    when: (answers) => positive(answers.get("fictional")),
  },
  {
    questionId: "recovery-fictional-hero",
    question: "Is your fictional character usually portrayed as a hero?",
    when: (answers) => positive(answers.get("fictional")),
  },
];

/**
 * Last-resort questions used only when the external AI layer is unavailable and
 * the structured scorer has no high-information question left. They preserve
 * the round and collect useful evidence for a later AI turn without pretending
 * an outage is a game failure.
 */
export function selectRecoveryQuestion(history: readonly GameAnswer[]): RecoveryQuestion | null {
  const asked = new Set(history.map((entry) => entry.questionId));
  const answers = new Map(history.map((entry) => [entry.questionId, entry.answer]));

  return RECOVERY_QUESTIONS.find(
    (candidate) => !asked.has(candidate.questionId) && (!candidate.when || candidate.when(answers)),
  ) ?? null;
}
