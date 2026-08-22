import { describe, expect, it } from "vitest";

import {
  createIdleState,
  gameReducer,
  parseStoredGameState,
  serializeGameState,
} from "@/lib/game";

describe("versioned game persistence", () => {
  it("round-trips a valid active game", () => {
    const started = gameReducer(createIdleState("stored-game", 1_000), {
      type: "START_GAME",
    });
    const restored = parseStoredGameState(serializeGameState(started));

    expect(restored).toEqual(started);
  });

  it("discards corrupt and unsupported storage", () => {
    expect(parseStoredGameState("not-json")).toBeNull();
    expect(
      parseStoredGameState(JSON.stringify({ version: 999, savedAt: 1, state: {} })),
    ).toBeNull();
  });

  it("turns a refreshed thinking state into a recoverable error", () => {
    const started = gameReducer(createIdleState("stored-game", 1_000), {
      type: "START_GAME",
    });
    const thinking = gameReducer(started, {
      type: "ANSWER",
      answer: "no",
      timestamp: 2_000,
    });
    const restored = parseStoredGameState(serializeGameState(thinking));

    expect(restored?.status).toBe("error");
    expect(restored?.error?.retryable).toBe(true);
    expect(restored?.history).toHaveLength(1);
  });
});
