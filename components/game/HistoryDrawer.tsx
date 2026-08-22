"use client";

import { Check, CircleHelp, ThumbsDown, ThumbsUp, X } from "lucide-react";

import type { AnswerType, GameAnswer } from "@/lib/game/types";

import { ANSWER_LABELS } from "./AnswerButtons";
import { Modal } from "./Modal";

type HistoryDrawerProps = {
  answers: GameAnswer[];
  open: boolean;
  onClose: () => void;
};

const answerIcons = {
  yes: Check,
  no: X,
  probably: ThumbsUp,
  probably_not: ThumbsDown,
  unknown: CircleHelp,
} satisfies Record<AnswerType, typeof Check>;

export function HistoryDrawer({ answers, open, onClose }: HistoryDrawerProps) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="Your trail" title="Answer history" className="sm:max-w-xl">
      {answers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/42">
          Your answers will appear here once the reading begins.
        </div>
      ) : (
        <ol className="max-h-[62vh] space-y-3 overflow-y-auto pr-1">
          {answers.map((answer, index) => {
            const Icon = answerIcons[answer.answer];
            return (
              <li key={`${answer.questionId}-${index}`} className="history-row">
                <span className="history-index">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-white/78">{answer.question}</p>
                  <span className={`answer-badge answer-badge--${answer.answer}`}>
                    <Icon size={12} strokeWidth={2.2} />
                    {ANSWER_LABELS[answer.answer]}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Modal>
  );
}
