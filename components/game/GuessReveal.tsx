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
    <section className="screen-enter glass-card relative w-full max-w-3xl overflow-hidden rounded-[2rem] px-5 py-8 text-center sm:px-10 sm:py-10">
      <div className="reveal-halo" aria-hidden="true" />
      <div className="mx-auto -mb-3 flex justify-center">
        <OracleOrb mode="guessing" size="medium" />
      </div>
      <p className="eyebrow-label">I think I know</p>
      <h1 className="reveal-name mx-auto mt-6">{name}</h1>
      <p className="mx-auto mt-5 max-w-md text-base leading-7 text-white/52">
        Is this the character you’ve been keeping in mind?
      </p>
      <div className="mx-auto mt-7 max-w-xs">
        <FocusMeter confidence={confidence} />
      </div>
      <div className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onAccept} className="primary-button flex-1">
          <Check size={17} /> Yes — you got it
        </button>
        <button type="button" onClick={onReject} className="secondary-button flex-1">
          <SearchX size={17} /> No, keep going
        </button>
      </div>
    </section>
  );
}
