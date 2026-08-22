"use client";

import { History, RotateCcw, Trophy } from "lucide-react";

import { getWinReaction } from "@/lib/game/reactions";

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
    <section className="screen-enter glass-card sbd-win relative w-full max-w-3xl overflow-hidden rounded-[2rem] px-5 py-8 text-center sm:px-10 sm:py-10">
      <div className="mx-auto -mb-4 flex justify-center">
        <OracleOrb mode="celebrating" size="medium" />
      </div>
      <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-lime-200/10 bg-lime-200/[0.05] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-lime-100/68">
        <Trophy size={13} /> Sussy baka detected
      </span>
      <h1 className="mt-5 text-4xl font-black tracking-[-0.06em] text-white sm:text-6xl">CAUGHT IN 4K.</h1>
      <p className="mt-3 text-xl font-semibold text-fuchsia-100/82">{name}</p>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/44">
        {getWinReaction(questionsAsked)}
      </p>

      <div className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3">
        <div className="stat-tile">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{questionsAsked}</p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-white/32">Questions</p>
        </div>
        <div className="stat-tile">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-white">{guessesAttempted}</p>
          <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-white/32">Guess attempts</p>
        </div>
      </div>

      <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onPlayAgain} className="primary-button flex-1">
          <RotateCcw size={17} /> Run it back
        </button>
        <button type="button" onClick={onHistory} className="secondary-button flex-1">
          <History size={17} /> Inspect the lore
        </button>
      </div>
    </section>
  );
}
