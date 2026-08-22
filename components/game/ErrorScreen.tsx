"use client";

import { Home, RefreshCw, TriangleAlert } from "lucide-react";

import { OracleOrb } from "./OracleOrb";

type ErrorScreenProps = {
  message?: string;
  retrying?: boolean;
  onRetry: () => void;
  onHome: () => void;
};

export function ErrorScreen({ message, retrying = false, onRetry, onHome }: ErrorScreenProps) {
  return (
    <section className="screen-enter glass-card w-full max-w-xl rounded-[2rem] px-5 py-8 text-center sm:px-10 sm:py-10">
      <div className="mx-auto -mb-5 flex justify-center">
        <OracleOrb mode={retrying ? "thinking" : "dim"} size="medium" />
      </div>
      <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-200/10 bg-amber-200/[0.04] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-amber-100/62">
        <TriangleAlert size={13} /> Connection interrupted
      </span>
      <h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
        The mind-reading crystal needs a moment.
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/44">
        {message ?? "Your answers are safe. We can try the same turn again when the signal settles."}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" onClick={onRetry} disabled={retrying} className="primary-button min-w-40">
          <RefreshCw className={retrying ? "animate-spin" : ""} size={16} />
          {retrying ? "Trying again" : "Try again"}
        </button>
        <button type="button" onClick={onHome} className="secondary-button min-w-40">
          <Home size={16} /> Return home
        </button>
      </div>
    </section>
  );
}
