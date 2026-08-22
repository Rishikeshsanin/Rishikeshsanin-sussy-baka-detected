"use client";

import { Check, SearchX } from "lucide-react";

import { FocusMeter } from "./FocusMeter";
import { OracleOrb } from "./OracleOrb";

type GuessRevealProps = {
  name: string;
  confidence: number;
  onAccept: () => void;
  onReject: () => void;
};

export function GuessReveal({ name, confidence, onAccept, onReject }: GuessRevealProps) {
  return (
    <section className="screen-enter glass-card sbd-reveal relative w-full max-w-3xl overflow-hidden rounded-[2rem] px-5 py-8 text-center sm:px-10 sm:py-10">
      <div className="reveal-halo" aria-hidden="true" />
      <div className="siren-bar" aria-hidden="true"><span /><span /><span /></div>
      <div className="mx-auto -mb-3 flex justify-center">
        <OracleOrb mode="guessing" size="medium" />
      </div>
      <p className="eyebrow-label">🚨 suspect acquired 🚨</p>
      <p className="mx-auto mt-3 max-w-md text-sm font-medium text-lime-100/60">nahhhh... I’m calling it.</p>
      <h1 className="reveal-name mx-auto mt-5">{name}</h1>
      <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/52">
        Is this the sussy baka you’ve been hiding in your head?
      </p>
      <div className="mx-auto mt-7 max-w-xs">
        <FocusMeter confidence={confidence} />
      </div>
      <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onAccept} className="primary-button flex-1">
          <Check size={17} /> Yep — clocked me
        </button>
        <button type="button" onClick={onReject} className="secondary-button flex-1">
          <SearchX size={17} /> Wrong bozo
        </button>
      </div>
    </section>
  );
}
