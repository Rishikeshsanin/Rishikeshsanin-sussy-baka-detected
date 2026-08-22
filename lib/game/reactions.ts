import type { AnswerType, GameAnswer } from "./types";

type ReactionInput = {
  history: readonly GameAnswer[];
  confidence: number;
  thinking: boolean;
  rejectedGuesses: readonly string[];
};

const LOW = [
  "bro could literally be anybody 💀",
  "zero aura acquired... for now",
  "the suspect list is absolutely cooked",
  "okay okay, gathering the lore",
] as const;

const MID = [
  "hold up... I’m seeing the vision 👀",
  "wait, this is getting suspicious",
  "the lore is starting to connect",
  "bro is running out of hiding spots",
] as const;

const HIGH = [
  "nahhhh I might know bro",
  "sussy levels rising 🚨",
  "I’m dangerously close to clocking this",
  "one more clue and it might be wraps",
] as const;

const THINKING = [
  "let me cook...",
  "cross-checking the lore...",
  "enhancing the sus...",
  "connecting questionable dots...",
] as const;

function stablePick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!;
}

export function getGameReaction({
  history,
  confidence,
  thinking,
  rejectedGuesses,
}: ReactionInput): string {
  const unknownCount = history.filter((entry) => entry.answer === "unknown").length;
  const recentUnknowns = history.slice(-3).filter((entry) => entry.answer === "unknown").length;
  const seed = history.length * 17 + rejectedGuesses.length * 31 + Math.round(confidence * 100);

  if (rejectedGuesses.length >= 2) return "never let me cook again... recovery arc activated 💀";
  if (rejectedGuesses.length === 1) return "I sold once. It will NOT happen again.";
  if (recentUnknowns >= 2) return "YOU picked the person 😭 give me something to work with";
  if (unknownCount >= 5) return "bro got witness protection or what";
  if (thinking) return stablePick(THINKING, seed);
  if (confidence >= 0.78) return stablePick(HIGH, seed);
  if (confidence >= 0.38 || history.length >= 6) return stablePick(MID, seed);
  return stablePick(LOW, seed);
}

export function getAnswerReaction(answer: AnswerType): string {
  switch (answer) {
    case "yes":
      return "locked.";
    case "no":
      return "interesting... noted.";
    case "probably":
      return "we’re working with vibes. valid.";
    case "probably_not":
      return "soft no. I can work with that.";
    case "unknown":
      return "professional yap dodger detected.";
  }
}

export function getWinReaction(questionCount: number): string {
  if (questionCount <= 8) return "ABSOLUTELY CLOCKED. light work.";
  if (questionCount <= 14) return "SUSSY BAKA DETECTED. clean read.";
  if (questionCount <= 22) return "SUSSY BAKA DETECTED. had to lock in for that one.";
  return "bro made me WORK for this 😭 still detected.";
}
