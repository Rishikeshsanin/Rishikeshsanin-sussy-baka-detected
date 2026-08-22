"use client";

import { useEffect, useState } from "react";

const PHRASES = [
  "Following the strongest clue…",
  "Narrowing the possibilities…",
  "Testing a new theory…",
  "Looking for the telltale detail…",
];

export function ThinkingState() {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % PHRASES.length);
    }, 1450);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[7.25rem] flex-col items-center justify-center text-center" role="status" aria-live="polite">
      <div className="thinking-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="mt-5 text-lg font-medium tracking-[-0.02em] text-white/82">{PHRASES[phraseIndex]}</p>
      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-white/30">The oracle is listening</p>
    </div>
  );
}
