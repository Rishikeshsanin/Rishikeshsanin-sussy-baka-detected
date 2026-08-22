"use client";

import { loadGameState } from "./storage";

export type GameFeedbackOutcome = "correct_guess" | "revealed_after_give_up";

export interface GameFeedbackResult {
  accepted: boolean;
  persisted: boolean;
  learned?: boolean;
  canonicalName?: string;
  reason?: string;
}

/** Best-effort anonymous learning feedback. Gameplay never depends on persistence. */
export async function submitCurrentGameFeedback(
  outcome: GameFeedbackOutcome,
  name: string,
): Promise<GameFeedbackResult | null> {
  const state = loadGameState();
  if (!state?.gameId || state.history.length === 0) return null;

  const canonicalName = name.trim().replace(/\s+/g, " ").slice(0, 100);
  if (canonicalName.length < 2) return null;

  const marker = `sbd-feedback:${state.gameId}:${outcome}:${canonicalName.toLocaleLowerCase("en-US")}`;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(marker) === "saved") {
    return { accepted: true, persisted: true };
  }
  sessionStorage?.setItem(marker, "pending");

  try {
    const response = await fetch("/api/game/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome,
        gameId: state.gameId,
        name: canonicalName,
        history: state.history,
        rejectedGuesses: state.rejectedGuesses,
      }),
      keepalive: true,
    });

    const body = await response.json().catch(() => null) as GameFeedbackResult | null;
    if (!response.ok || !body) {
      sessionStorage?.removeItem(marker);
      return null;
    }

    if (body.persisted) sessionStorage?.setItem(marker, "saved");
    else sessionStorage?.removeItem(marker);
    return body;
  } catch {
    sessionStorage?.removeItem(marker);
    return null;
  }
}
