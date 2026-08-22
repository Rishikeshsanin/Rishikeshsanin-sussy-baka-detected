"use client";

import { Check, CircleHelp, Command, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

import { Modal } from "./Modal";

type HowToPlayModalProps = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  "Think of one real person or fictional character.",
  "Keep the name to yourself and answer honestly.",
  "Use Probably or Probably not when the clue is fuzzy.",
  "Choose Don’t know when you genuinely aren’t sure.",
  "When a guess appears, confirm it or send the oracle back to work.",
];

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="A minute to learn" title="How to play">
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] px-3.5 py-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-violet-200/[0.08] text-[0.65rem] font-bold text-violet-100/68">
              {index + 1}
            </span>
            <p className="pt-0.5 text-sm leading-5 text-white/58">{step}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-teal-200/10 bg-teal-200/[0.035] px-4 py-3 text-xs leading-5 text-teal-50/54">
        <Sparkles className="mt-0.5 shrink-0" size={15} />
        The first question is always local, so your game begins instantly. Later answers are sent only to the selected AI provider through the server.
      </div>
    </Modal>
  );
}

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="Game guide" title="Controls & privacy">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.022] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/76">
            <Command size={16} className="text-violet-200/70" /> Keyboard shortcuts
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/48">
            {[["Y", "Yes"], ["N", "No"], ["P", "Probably"], ["O", "Probably not"], ["D / U", "Don’t know"], ["Backspace", "Undo"]].map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-black/10 px-3 py-2">
                <span>{label}</span>
                <kbd className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-1 text-[0.58rem] font-semibold text-white/48">{key}</kbd>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.022] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/76">
            <ShieldCheck size={16} className="text-teal-200/70" /> Privacy by design
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-white/44">
            <li className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-teal-200/60" /> API keys never enter the browser or local storage.</li>
            <li className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-teal-200/60" /> Active game progress stays on this device.</li>
            <li className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-teal-200/60" /> Hidden AI hypotheses are never shown before a guess.</li>
          </ul>
        </section>
        <div className="flex gap-2 px-1 text-[0.68rem] leading-5 text-white/32">
          <KeyRound size={14} className="mt-0.5 shrink-0" />
          AI provider selection is controlled by the server environment: mock, Gemini, or Ollama.
        </div>
      </div>
    </Modal>
  );
}

type RestartModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function RestartModal({ open, onClose, onConfirm }: RestartModalProps) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="Start over" title="Leave this reading?">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/10 bg-amber-200/[0.035] p-4">
        <CircleHelp className="mt-0.5 shrink-0 text-amber-100/60" size={17} />
        <p className="text-sm leading-6 text-white/48">Your questions, answers, and rejected guesses from this game will be cleared.</p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="secondary-button">Keep playing</button>
        <button type="button" onClick={onConfirm} className="primary-button">Start a new game</button>
      </div>
    </Modal>
  );
}
