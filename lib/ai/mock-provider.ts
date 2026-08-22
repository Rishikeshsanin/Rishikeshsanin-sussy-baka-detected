import { canonicalizeGuess, MAX_QUESTIONS } from "./schema";
import type {
  AIProvider,
  AIProviderContext,
  GameAIResponse,
  QuestionAIResponse,
} from "./types";

interface MockQuestion {
  id: string;
  text: string;
}

const SHERLOCK_QUESTIONS: readonly MockQuestion[] = [
  { id: "mock-human", text: "Is your character human?" },
  { id: "mock-books", text: "Did your character first become famous through books?" },
  { id: "mock-mysteries", text: "Is your character known for solving mysteries?" },
  { id: "mock-british", text: "Is your character strongly associated with Britain?" },
  { id: "mock-victorian", text: "Are your character's stories set mainly in the Victorian era?" },
];

const REAL_PERSON_QUESTIONS: readonly MockQuestion[] = [
  { id: "mock-alive", text: "Is your character currently alive?" },
  { id: "mock-entertainment", text: "Is your character primarily famous for entertainment?" },
  { id: "mock-sports", text: "Is your character associated with professional sports?" },
  { id: "mock-india", text: "Is your character strongly associated with India?" },
  { id: "mock-cricket", text: "Is your character best known for cricket?" },
];

const POST_REJECTION_QUESTIONS: readonly MockQuestion[] = [
  { id: "mock-moustache", text: "Is your character famous for a distinctive moustache?" },
  { id: "mock-young-detective", text: "Is your character a young amateur detective?" },
  { id: "mock-superhero-detective", text: "Does your character also operate as a masked hero?" },
];

export class MockProvider implements AIProvider {
  readonly name = "mock" as const;

  async playTurn(context: AIProviderContext): Promise<GameAIResponse> {
    if (context.history.length >= MAX_QUESTIONS) {
      return giveUp(context);
    }

    if (context.turnReason === "rejected_guess") {
      return this.questionAfterRejection(context);
    }

    if (context.rejectedGuesses.length > 0) {
      return this.continueAfterRejection(context);
    }

    const realPersonAnswer = context.history[0]?.answer;
    const followsFictionalPath = realPersonAnswer === "no" || realPersonAnswer === "probably_not";
    const questions = followsFictionalPath ? SHERLOCK_QUESTIONS : REAL_PERSON_QUESTIONS;
    const next = questions.find((question) => !hasAnswered(context, question.id));

    if (next) {
      return makeQuestion(next, context, followsFictionalPath
        ? ["Sherlock Holmes", "Hercule Poirot", "Miss Marple"]
        : ["Virat Kohli", "Taylor Swift", "Lionel Messi"]);
    }

    if (followsFictionalPath && sherlockEvidenceScore(context) >= 4) {
      return {
        type: "guess",
        name: "Sherlock Holmes",
        confidence: 0.97,
        memorySummary: "A fictional human from books, strongly associated with mystery and Britain.",
        candidateHypotheses: ["Sherlock Holmes", "Hercule Poirot", "Miss Marple"],
      };
    }

    if (!followsFictionalPath && isPositive(answerFor(context, "mock-cricket"))) {
      return {
        type: "guess",
        name: "Virat Kohli",
        confidence: 0.95,
        memorySummary: "A living real person strongly associated with Indian professional cricket.",
        candidateHypotheses: ["Virat Kohli", "Rohit Sharma", "Sachin Tendulkar"],
      };
    }

    return giveUp(context);
  }

  private questionAfterRejection(context: AIProviderContext): GameAIResponse {
    const rejectedCount = context.rejectedGuesses.length;
    if (rejectedCount > POST_REJECTION_QUESTIONS.length) {
      return giveUp(context);
    }
    const next = POST_REJECTION_QUESTIONS[Math.min(rejectedCount - 1, POST_REJECTION_QUESTIONS.length - 1)];

    return makeQuestion(next, context, remainingDetectives(context));
  }

  private continueAfterRejection(context: AIProviderContext): GameAIResponse {
    const latestRejectedIndex = Math.min(
      context.rejectedGuesses.length - 1,
      POST_REJECTION_QUESTIONS.length - 1,
    );
    const discriminatingQuestion = POST_REJECTION_QUESTIONS[latestRejectedIndex];

    if (!hasAnswered(context, discriminatingQuestion.id)) {
      return makeQuestion(discriminatingQuestion, context, remainingDetectives(context));
    }

    const answer = answerFor(context, discriminatingQuestion.id);
    const guesses = [
      isPositive(answer) ? "Hercule Poirot" : "Miss Marple",
      isPositive(answer) ? "Nancy Drew" : "Batman",
      isPositive(answer) ? "Batman" : "Nancy Drew",
    ] as const;
    const name = guesses[latestRejectedIndex];

    if (context.rejectedGuesses.some((guess) => canonicalizeGuess(guess) === canonicalizeGuess(name))) {
      return giveUp(context);
    }

    return {
      type: "guess",
      name,
      confidence: 0.95,
      memorySummary: `The previous candidate was rejected; a new detective trait was established with ${answer ?? "unknown"}.`,
      candidateHypotheses: remainingDetectives(context),
    };
  }
}

function makeQuestion(
  question: MockQuestion,
  context: AIProviderContext,
  candidateHypotheses: string[],
): QuestionAIResponse {
  const firstAnswer = context.history[0]?.answer;
  const classification = firstAnswer === "no" || firstAnswer === "probably_not"
    ? "The character is likely fictional."
    : "The character may be a real person.";

  return {
    type: "question",
    question: question.text,
    questionId: question.id,
    confidence: Math.min(0.86, 0.22 + context.history.length * 0.09),
    memorySummary: `${classification} ${context.history.length} answer${context.history.length === 1 ? "" : "s"} recorded.`,
    candidateHypotheses,
  };
}

function giveUp(context: AIProviderContext): GameAIResponse {
  return {
    type: "give_up",
    message: "You got me this time. Who were you thinking of?",
    confidence: 0,
    memorySummary: context.aiMemory.summary || "The available clues did not identify one reliable candidate.",
  };
}

function hasAnswered(context: AIProviderContext, questionId: string): boolean {
  return context.history.some((entry) => entry.questionId === questionId);
}

function answerFor(context: AIProviderContext, questionId: string) {
  return context.history.find((entry) => entry.questionId === questionId)?.answer;
}

function isPositive(answer: ReturnType<typeof answerFor>): boolean {
  return answer === "yes" || answer === "probably";
}

function sherlockEvidenceScore(context: AIProviderContext): number {
  const expectedPositive = ["mock-human", "mock-books", "mock-mysteries", "mock-british", "mock-victorian"];
  const fictional = context.history[0]?.answer === "no" || context.history[0]?.answer === "probably_not";
  return (fictional ? 1 : 0) + expectedPositive.filter((id) => isPositive(answerFor(context, id))).length;
}

function remainingDetectives(context: AIProviderContext): string[] {
  const rejected = new Set(context.rejectedGuesses.map(canonicalizeGuess));
  return ["Sherlock Holmes", "Hercule Poirot", "Miss Marple", "Nancy Drew", "Batman"]
    .filter((candidate) => !rejected.has(canonicalizeGuess(candidate)))
    .slice(0, 4);
}
