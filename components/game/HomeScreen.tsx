"use client";

import { ArrowRight, BookOpen, Brain, Crosshair, ShieldCheck, Sparkles } from "lucide-react";

import { brand } from "@/lib/brand";

import { OracleOrb } from "./OracleOrb";

type HomeScreenProps = {
  onStart: () => void;
  onHowToPlay: () => void;
};

export function HomeScreen({ onStart, onHowToPlay }: HomeScreenProps) {
  return (
    <div className="screen-enter grid w-full items-center gap-5 pb-8 lg:grid-cols-[1.06fr_0.94fr] lg:gap-12">
      <section className="order-2 mx-auto w-full max-w-2xl text-center lg:order-1 lg:mx-0 lg:text-left">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-200/10 bg-lime-200/[0.045] px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-lime-100/62">
          <Sparkles size={13} aria-hidden="true" />
          chronically-online deduction technology
        </div>

        <h1 className="text-balance text-[clamp(2.65rem,7.4vw,5.9rem)] font-black leading-[0.9] tracking-[-0.075em] text-white">
          Think of someone.
          <span className="mt-2 block bg-gradient-to-r from-lime-200 via-white to-fuchsia-200 bg-clip-text text-transparent">
            Don’t snitch.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-white/52 sm:text-lg sm:leading-8 lg:mx-0">
          {brand.description} The serious math stays under the hood. The brainrot is purely for morale.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
          <button type="button" onClick={onStart} className="primary-button min-w-48">
            Lock in
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={onHowToPlay} className="secondary-button min-w-40">
            <BookOpen size={16} aria-hidden="true" />
            How this works
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.68rem] font-medium text-white/36 lg:justify-start">
          <span className="inline-flex items-center gap-1.5"><Crosshair size={13} /> Adaptive questions</span>
          <span className="inline-flex items-center gap-1.5"><Brain size={13} /> Probability + AI</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> API keys stay server-side</span>
        </div>
      </section>

      <div className="order-1 flex min-h-[16rem] items-center justify-center lg:order-2 lg:min-h-[34rem]">
        <div className="relative">
          <div className="detector-chip absolute left-1/2 top-[4%] z-20 -translate-x-1/2 whitespace-nowrap">
            <span className="detector-dot" /> DETECTOR ONLINE
          </div>
          <p className="absolute left-1/2 top-[15%] z-10 -translate-x-1/2 whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-white/30">
            {brand.tagline}
          </p>
          <OracleOrb mode="resting" size="large" />
          <div className="absolute bottom-[4%] left-1/2 w-[min(84vw,22rem)] -translate-x-1/2 rounded-2xl border border-white/[0.065] bg-black/25 px-4 py-3 text-center backdrop-blur-md">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-white/32">Current mission</p>
            <p className="mt-1 text-sm font-medium text-white/70">identify the sussy baka in ~20 questions</p>
          </div>
        </div>
      </div>
    </div>
  );
}
