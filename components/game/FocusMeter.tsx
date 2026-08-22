type FocusMeterProps = {
  confidence: number;
  compact?: boolean;
};

function getFocusLabel(confidence: number) {
  if (confidence < 0.22) return "Reading the outline";
  if (confidence < 0.48) return "Clues are forming";
  if (confidence < 0.72) return "Closing in";
  if (confidence < 0.9) return "A strong theory";
  return "Almost certain";
}

export function FocusMeter({ confidence, compact = false }: FocusMeterProps) {
  const safeConfidence = Math.min(1, Math.max(0, confidence));
  const label = getFocusLabel(safeConfidence);

  return (
    <div className={compact ? "w-full max-w-[12rem]" : "w-full"}>
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-[0.63rem] font-semibold uppercase tracking-[0.22em] text-white/42">Focus</span>
        <span className="text-[0.7rem] font-medium text-violet-100/62">{label}</span>
      </div>
      <div
        className="focus-track"
        role="progressbar"
        aria-label={`Oracle focus: ${label}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeConfidence * 100)}
      >
        <span className="focus-fill" style={{ width: `${Math.max(5, safeConfidence * 100)}%` }} />
        <span className="focus-glint" style={{ left: `${Math.min(97, Math.max(3, safeConfidence * 100))}%` }} />
      </div>
    </div>
  );
}
