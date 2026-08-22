"use client";

import { Crown, RotateCcw, Send } from "lucide-react";
import { useState } from "react";

import { OracleOrb } from "./OracleOrb";

type GiveUpScreenProps = {
  message?: string;
  submittedName?: string | null;
  onSubmitName: (name: string) => void;
  onPlayAgain: () => void;
};

export function GiveUpScreen({ message, submittedName, onSubmitName, onPlayAgain }: GiveUpScreenProps) {
  const [name, setName] = useState("");

  return (
    <section className="screen-enter glass-card w-full max-w-2xl rounded-[2rem] px-5 py-8 text-center sm:px-10 sm:py-10">
      <div className="mx-auto -mb-5 flex justify-center">
        <OracleOrb mode="dim" size="medium" />
      </div>
      <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-white/44">
        <Crown size={13} /> you got the detector
      </span>
      <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] text-white sm:text-5xl">I’m cooked. 💀</h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/44">
        {message ?? "Bro had witness protection. Who were you thinking of?"}
      </p>

      <div className="soft-divider my-7" />

      {submittedName ? (
        <div className="rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.04] px-5 py-4 text-sm text-cyan-50/66">
          Okay, <span className="font-semibold text-white">{submittedName}</span>. Lore acquired. This reveal stays on your device for now.
        </div>
      ) : (
        <form
          className="mx-auto max-w-md text-left"
          onSubmit={(event) => {
            event.preventDefault();
            const cleaned = name.trim();
            if (cleaned) onSubmitName(cleaned);
          }}
        >
          <label htmlFor="secret-character" className="mb-2 block text-xs font-medium text-white/52">
            Alright, who was the sussy baka? <span className="text-white/26">(optional)</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="secret-character"
              className="field-input"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              placeholder="Person / character name"
              autoComplete="off"
            />
            <button type="submit" className="secondary-button shrink-0" disabled={!name.trim()}>
              <Send size={15} /> Reveal
            </button>
          </div>
        </form>
      )}

      <button type="button" onClick={onPlayAgain} className="primary-button mt-7 min-w-52">
        <RotateCcw size={17} /> Run it back
      </button>
    </section>
  );
}
