"use client";

import { History, RotateCcw, Trophy } from "lucide-react";

import { OracleOrb } from "./OracleOrb";

type WinScreenProps = {
  name: string;
  questionsAsked: number;
  guessesAttempted: number;
  onPlayAgain: () => void;
  onHistory: () => void;
};

export function WinScreen({
  name,
  questionsAsked,
  guessesAttempted,
  onPlayAgain,
  onHistory,
}: WinScreenProps) {
  return (
    <section className="screen-enter glass-card relative w-full max-w-3xl overflow-hidden rounded-[2rem] px-5 py-8 text-center sm:px-10 sm:py-10">
      <div className="mx-auto -mb-4 flex justify-center">
        <OracleOrb mode="celebrating" size="medium" />
      </div>
      <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-200/10 bg-amber-200/[0.05] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-amber-100/64">
        <Trophy size={13} /> Reading complete
      </span>
      <h1 className="mt-5 text-4xl font-semibold tracking-[-0.055em] text-white sm:text-6xl">Got you.</h1>
      <p className="mt-3 text-lg font-medium text-violet-100/72">You were thinking of {name}.</p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/38">
        A good secret leaves just enough of a trail. Yours was hiding in plain sight.
      </p>

      <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3">
        <div className="stat-tile">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{questionsAsked}</p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-white/32">Questions</p>
        </div>
        <div className="stat-tile">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{guessesAttempted}</p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-white/32">Guesses</p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onPlayAgain} className="primary-button flex-1">
          <RotateCcw size={17} /> Play again
        </button>
        <button type="button" onClick={onHistory} className="secondary-button flex-1">
          <History size={17} /> View answers
        </button>
      </div>
    </section>
  );
}
