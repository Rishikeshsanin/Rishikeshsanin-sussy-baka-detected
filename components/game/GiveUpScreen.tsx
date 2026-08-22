"use client";

import { Crown, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { useState } from "react";

import {
  submitCurrentGameFeedback,
  type GameFeedbackResult,
} from "@/lib/game/feedback.client";

import { OracleOrb } from "./OracleOrb";

type GiveUpScreenProps = {
  message?: string;
  submittedName?: string | null;
  onSubmitName: (name: string) => void;
  onPlayAgain: () => void;
};

function revealReaction(name: string, result: GameFeedbackResult | null): string {
  const canonical = result?.canonicalName ?? name;
  if (result?.learned && result.persisted) {
    return `NAHHH — ${canonical}?! 💀 Okay, that was deep lore. Verified and patched into the detector. Run it back later and SBD has receipts.`;
  }
  if (result?.persisted) {
    return `${canonical}. 😭 Fair play — the detector got humbled, but the evidence is saved for the rematch.`;
  }
  if (result?.reason === "entity_not_verified") {
    return `${name}?! Bro went off the public-lore map 💀 I couldn't verify that exact name, but you definitely cooked the detector.`;
  }
  return `${name}. Yeah, you got me 💀 The reveal landed even if the learning sync didn't. Respect the deep cut.`;
}

export function GiveUpScreen({ message, submittedName, onSubmitName, onPlayAgain }: GiveUpScreenProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

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
        {message ?? "Bro had witness protection. Fine — reveal the lore."}
      </p>

      <div className="soft-divider my-7" />

      {submittedName ? (
        <div className="rounded-2xl border border-cyan-200/10 bg-cyan-200/[0.04] px-5 py-4 text-sm leading-6 text-cyan-50/72">
          {reaction ?? `NAHHH — ${submittedName}?! 💀 Okay, you got me. Lore received.`}
        </div>
      ) : (
        <form
          className="mx-auto max-w-md text-left"
          onSubmit={async (event) => {
            event.preventDefault();
            const cleaned = name.trim();
            if (!cleaned || submitting) return;

            setSubmitting(true);
            const result = await submitCurrentGameFeedback("revealed_after_give_up", cleaned);
            setReaction(revealReaction(cleaned, result));
            onSubmitName(result?.canonicalName ?? cleaned);
            setSubmitting(false);
          }}
        >
          <label htmlFor="secret-character" className="mb-2 block text-xs font-medium text-white/52">
            Alright, who was the sussy baka? <span className="text-white/26">Tell the detector.</span>
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
              disabled={submitting}
            />
            <button type="submit" className="secondary-button shrink-0" disabled={!name.trim() || submitting}>
              {submitting ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />}
              {submitting ? "Checking lore…" : "Reveal"}
            </button>
          </div>
          <p className="mt-2 text-[0.68rem] leading-5 text-white/28">
            Verified public people/characters can improve future rounds. Random names do not poison the detector.
          </p>
        </form>
      )}

      <button type="button" onClick={onPlayAgain} className="primary-button mt-7 min-w-52">
        <RotateCcw size={17} /> Run it back
      </button>
    </section>
  );
}
