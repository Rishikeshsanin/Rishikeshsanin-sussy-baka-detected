"use client";

import { History, RotateCcw, Undo2 } from "lucide-react";

type GameControlsProps = {
  canUndo: boolean;
  disabled?: boolean;
  onUndo: () => void;
  onHistory: () => void;
  onRestart: () => void;
};

const controlClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-medium text-white/50 transition hover:bg-white/[0.055] hover:text-white/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 disabled:cursor-not-allowed disabled:opacity-25";

export function GameControls({
  canUndo,
  disabled = false,
  onUndo,
  onHistory,
  onRestart,
}: GameControlsProps) {
  return (
    <div className="flex items-center justify-center gap-1" aria-label="Game controls">
      <button type="button" onClick={onUndo} disabled={!canUndo || disabled} className={controlClass}>
        <Undo2 size={15} />
        Undo
      </button>
      <button type="button" onClick={onHistory} disabled={disabled} className={controlClass}>
        <History size={15} />
        History
      </button>
      <button type="button" onClick={onRestart} disabled={disabled} className={controlClass}>
        <RotateCcw size={15} />
        Restart
      </button>
    </div>
  );
}
