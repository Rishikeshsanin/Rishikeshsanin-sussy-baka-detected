"use client";

import { Check, CircleHelp, Command, KeyRound, ShieldCheck, Sparkles } from "lucide-react";

import { Modal } from "./Modal";

type HowToPlayModalProps = {
  open: boolean;
  onClose: () => void;
};

const steps = [
  "Think of one real person or fictional character.",
  "Keep the name to yourself. Snitching defeats the entire point 😭",
  "Answer Yes, No, Probably, Probably not, or Don’t know.",
  "The detector keeps narrowing the suspect pool and chooses the next useful question.",
  "When a guess appears, confirm it or humble the detector and keep going.",
];

export function HowToPlayModal({ open, onClose }: HowToPlayModalProps) {
  return (
    <Modal open={open} onClose={onClose} eyebrow="30 seconds of lore" title="How to play">
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 rounded-xl border border-white/[0.055] bg-white/[0.02] px-3.5 py-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-lime-200/[0.08] text-[0.65rem] font-bold text-lime-100/70">
              {index + 1}
            </span>
            <p className="pt-0.5 text-sm leading-5 text-white/58">{step}</p>
          </li>
        ))}
      </ol>
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-cyan-200/10 bg-cyan-200/[0.035] px-4 py-3 text-xs leading-5 text-cyan-50/58">
        <Sparkles className="mt-0.5 shrink-0" size={15} />
        SBD uses a local probability engine and information-gain question selector first. The configured AI provider handles long-tail recovery when the local seed pool is not enough.
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
    <Modal open={open} onClose={onClose} eyebrow="Detector manual" title="Controls & privacy">
      <div className="space-y-4">
        <section className="rounded-2xl border border-white/[0.06] bg-white/[0.022] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/76">
            <Command size={16} className="text-lime-200/70" /> Keyboard shortcuts
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-white/48 sm:grid-cols-2">
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
            <ShieldCheck size={16} className="text-cyan-200/70" /> Privacy by design
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-5 text-white/44">
            <li className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-cyan-200/60" /> API keys never enter the browser or local storage.</li>
            <li className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-cyan-200/60" /> Active game progress stays on this device.</li>
            <li className="flex gap-2"><Check size={13} className="mt-1 shrink-0 text-cyan-200/60" /> Candidate hypotheses remain hidden until an actual guess.</li>
          </ul>
        </section>
        <div className="flex gap-2 px-1 text-[0.68rem] leading-5 text-white/32">
          <KeyRound size={14} className="mt-0.5 shrink-0" />
          AI fallback is controlled by the server environment: mock, Gemini, or Ollama. Production keys remain server-side.
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
    <Modal open={open} onClose={onClose} eyebrow="Run it back" title="Abandon this suspect?">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200/10 bg-amber-200/[0.035] p-4">
        <CircleHelp className="mt-0.5 shrink-0 text-amber-100/60" size={17} />
        <p className="text-sm leading-6 text-white/48">Your questions, answers, and rejected guesses from this game will be cleared.</p>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="secondary-button">Keep cooking</button>
        <button type="button" onClick={onConfirm} className="primary-button">New suspect</button>
      </div>
    </Modal>
  );
}
