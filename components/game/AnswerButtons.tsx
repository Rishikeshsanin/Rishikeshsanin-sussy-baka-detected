"use client";

import {
  Check,
  CircleHelp,
  ThumbsDown,
  ThumbsUp,
  X,
  type LucideIcon,
} from "lucide-react";

import type { AnswerType } from "@/lib/game/types";

type AnswerButtonsProps = {
  disabled?: boolean;
  onAnswer: (answer: AnswerType) => void;
};

type AnswerOption = {
  value: AnswerType;
  label: string;
  hint: string;
  shortcut: string;
  ariaShortcut: string;
  icon: LucideIcon;
  tone: string;
};

export const ANSWER_LABELS: Record<AnswerType, string> = {
  yes: "Yes",
  no: "No",
  probably: "Probably",
  probably_not: "Probably not",
  unknown: "Don’t know",
};

const ANSWERS: AnswerOption[] = [
  { value: "yes", label: "Yes", hint: "Strong match", shortcut: "Y", ariaShortcut: "Y", icon: Check, tone: "answer-button--yes" },
  { value: "no", label: "No", hint: "Strong mismatch", shortcut: "N", ariaShortcut: "N", icon: X, tone: "answer-button--no" },
  { value: "probably", label: "Probably", hint: "Leaning yes", shortcut: "P", ariaShortcut: "P", icon: ThumbsUp, tone: "answer-button--probably" },
  { value: "probably_not", label: "Probably not", hint: "Leaning no", shortcut: "O", ariaShortcut: "O", icon: ThumbsDown, tone: "answer-button--probably-not" },
  { value: "unknown", label: "Don’t know", hint: "Not enough info", shortcut: "D", ariaShortcut: "D U", icon: CircleHelp, tone: "answer-button--unknown" },
];

export function AnswerButtons({ disabled = false, onAnswer }: AnswerButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5" aria-label="Answer choices">
      {ANSWERS.map(({ value, label, hint, shortcut, ariaShortcut, icon: Icon, tone }) => (
        <button
          key={value}
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(value)}
          aria-keyshortcuts={ariaShortcut}
          className={`answer-button ${tone} ${value === "unknown" ? "col-span-2 lg:col-span-1" : ""}`}
        >
          <span className="answer-button__icon" aria-hidden="true">
            <Icon size={19} strokeWidth={2} />
          </span>
          <span className="min-w-0 text-left">
            <span className="block text-[0.8rem] font-semibold leading-tight text-white sm:text-sm">{label}</span>
            <span className="mt-1 hidden text-[0.64rem] leading-none text-white/38 sm:block">{hint}</span>
          </span>
          <kbd className="answer-key" aria-hidden="true">{shortcut}</kbd>
        </button>
      ))}
    </div>
  );
}
