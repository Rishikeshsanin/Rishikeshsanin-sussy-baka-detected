"use client";

import type { AnswerType } from "@/lib/game/types";

import { AnswerButtons } from "./AnswerButtons";
import { FocusMeter } from "./FocusMeter";
import { GameControls } from "./GameControls";
import { OracleOrb } from "./OracleOrb";
import { ThinkingState } from "./ThinkingState";

type QuestionScreenProps = {
  questionNumber: number;
  question: string | null;
  confidence: number;
  thinking: boolean;
  canUndo: boolean;
  onAnswer: (answer: AnswerType) => void;
  onUndo: () => void;
  onHistory: () => void;
  onRestart: () => void;
};

export function QuestionScreen({
  questionNumber,
  question,
  confidence,
  thinking,
  canUndo,
  onAnswer,
  onUndo,
  onHistory,
  onRestart,
}: QuestionScreenProps) {
  return (
    <div className="screen-enter game-panel glass-card">
      <div className="grid items-center gap-2 sm:grid-cols-[9.5rem_1fr_9.5rem]">
        <div className="hidden justify-self-start sm:block">
          <OracleOrb mode={thinking ? "thinking" : "resting"} size="small" />
        </div>
        <div className="text-center">
          <p className="eyebrow-label">{thinking ? "Reading your answer" : `Question ${questionNumber}`}</p>
          <p className="mt-2 text-xs text-white/30">Answer from your first instinct</p>
        </div>
        <div className="mt-3 w-full justify-self-end sm:mt-0">
          <FocusMeter confidence={confidence} compact />
        </div>
      </div>

      <div className="question-card mt-3 sm:mt-1">
        {thinking ? (
          <ThinkingState />
        ) : (
          <h1 className="question-text">{question}</h1>
        )}
      </div>

      <div className="mt-3 sm:mt-4">
        <AnswerButtons disabled={thinking || !question} onAnswer={onAnswer} />
      </div>

      <div className="mt-2 border-t border-white/[0.045] pt-2">
        <GameControls
          canUndo={canUndo}
          disabled={thinking}
          onUndo={onUndo}
          onHistory={onHistory}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
}
