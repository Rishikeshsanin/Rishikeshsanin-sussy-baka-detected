"use client";

import { loadGameState } from "./storage";

export type GameFeedbackOutcome = "correct_guess" | "revealed_after_give_up";

/**
 * Best-effort anonymous learning feedback. Gameplay never waits for this request.
 */
export async function submitCurrentGameFeedback(
  outcome: GameFeedbackOutcome,
  name: string,
): Promise<void> {
  const state = loadGameState();
  if (!state?.gameId || state.history.length === 0) return;

  const canonicalName = name.trim().replace(/\s+/g, " ").slice(0, 100);
  if (canonicalName.length < 2) return;

  const marker = `sbd-feedback:${state.gameId}:${outcome}:${canonicalName.toLocaleLowerCase("en-US")}`;
  if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(marker)) return;
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

    const body = await response.json().catch(() => null) as { persisted?: boolean } | null;
    if (!response.ok || body?.persisted !== true) {
      sessionStorage?.removeItem(marker);
      return;
    }

    sessionStorage?.setItem(marker, "saved");
  } catch {
    sessionStorage?.removeItem(marker);
  }
}
