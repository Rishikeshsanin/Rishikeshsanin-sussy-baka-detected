"use client";

import { ArrowRight, BookOpen, ShieldCheck, Sparkles, UserRound, WandSparkles } from "lucide-react";

import { brand } from "@/lib/brand";

import { OracleOrb } from "./OracleOrb";

type HomeScreenProps = {
  onStart: () => void;
  onHowToPlay: () => void;
};

export function HomeScreen({ onStart, onHowToPlay }: HomeScreenProps) {
  return (
    <div className="screen-enter grid w-full items-center gap-4 pb-8 lg:grid-cols-[1.03fr_0.97fr] lg:gap-10">
      <section className="order-2 mx-auto w-full max-w-2xl text-center lg:order-1 lg:mx-0 lg:text-left">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200/10 bg-violet-200/[0.045] px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-violet-100/58">
          <Sparkles size={13} aria-hidden="true" />
          An original AI deduction game
        </div>
        <h1 className="text-balance text-[clamp(2.65rem,7.2vw,5.75rem)] font-semibold leading-[0.95] tracking-[-0.07em] text-white">
          Think of anyone.
          <span className="mt-2 block bg-gradient-to-r from-violet-200 via-white to-teal-200 bg-clip-text text-transparent">
            Keep it secret.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-7 text-white/50 sm:text-lg sm:leading-8 lg:mx-0">
          {brand.description} Every answer leaves a trail; {brand.name} follows it until one name remains.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
          <button type="button" onClick={onStart} className="primary-button min-w-48">
            Begin the reading
            <ArrowRight size={17} aria-hidden="true" />
          </button>
          <button type="button" onClick={onHowToPlay} className="secondary-button min-w-40">
            <BookOpen size={16} aria-hidden="true" />
            How to play
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.68rem] font-medium text-white/34 lg:justify-start">
          <span className="inline-flex items-center gap-1.5"><UserRound size={13} /> Real or fictional</span>
          <span className="inline-flex items-center gap-1.5"><WandSparkles size={13} /> Five answer strengths</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Keys stay server-side</span>
        </div>
      </section>

      <div className="order-1 flex min-h-[15rem] items-center justify-center lg:order-2 lg:min-h-[34rem]">
        <div className="relative">
          <p className="absolute left-1/2 top-[10%] z-10 -translate-x-1/2 whitespace-nowrap text-[0.58rem] font-semibold uppercase tracking-[0.28em] text-white/28">
            {brand.tagline}
          </p>
          <OracleOrb mode="resting" size="large" />
        </div>
      </div>
    </div>
  );
}
