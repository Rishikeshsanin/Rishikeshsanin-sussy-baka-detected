import "server-only";

import { createHash } from "node:crypto";

import { normalizeCandidateName } from "@/lib/engine/scoring";
import type { GameAnswer } from "@/lib/game/types";

import { getSbdDatabase } from "./database.server";

export type LearningOutcome = "correct_guess" | "revealed_after_give_up";

interface LearningEventInput {
  gameId: string;
  outcome: LearningOutcome;
  name: string;
  history: readonly GameAnswer[];
  rejectedGuesses: readonly string[];
}

function gameIdHash(gameId: string): string {
  return createHash("sha256").update(gameId, "utf8").digest("hex").slice(0, 32);
}

function minimizedHistory(history: readonly GameAnswer[]): Array<{
  questionId: string;
  question: string;
  answer: GameAnswer["answer"];
}> {
  return history.slice(0, 30).map(({ questionId, question, answer }) => ({
    questionId,
    question: question.slice(0, 180),
    answer,
  }));
}

export async function recordLearningEvent(input: LearningEventInput): Promise<boolean> {
  const sql = getSbdDatabase();
  if (!sql) return false;

  const canonicalName = input.name.trim().replace(/\s+/g, " ").slice(0, 100);
  const normalizedName = normalizeCandidateName(canonicalName);
  if (!canonicalName || !normalizedName) return false;

  const evidence = Math.min(30, input.history.length);
  const historyPayload = minimizedHistory(input.history);
  const rejected = input.rejectedGuesses.slice(0, 20).map((guess) => guess.slice(0, 100));

  try {
    const stored = await sql.begin(async (tx) => {
      const eventRows = await tx`
        insert into sussy_baka_detected.learning_events (
          game_id_hash,
          outcome,
          revealed_name,
          normalized_revealed_name,
          rejected_guesses,
          answer_history,
          question_count,
          engine_version
        ) values (
          ${gameIdHash(input.gameId)},
          ${input.outcome},
          ${canonicalName},
          ${normalizedName},
          ${tx.array(rejected)}::text[],
          ${tx.json(historyPayload)},
          ${evidence},
          'knowledge-v1-persistent'
        )
        on conflict do nothing
        returning id
      `;

      // Replayed browser/network requests must not increment aggregate stats twice.
      if (eventRows.length === 0) return false;

      if (input.outcome === "correct_guess") {
        await tx`
          insert into sussy_baka_detected.candidate_stats (
            normalized_name,
            canonical_name,
            wins,
            total_evidence,
            learned_prior,
            last_seen_at,
            updated_at
          ) values (
            ${normalizedName},
            ${canonicalName},
            1,
            ${evidence},
            1.02,
            now(),
            now()
          )
          on conflict (normalized_name) do update
          set canonical_name = excluded.canonical_name,
              wins = sussy_baka_detected.candidate_stats.wins + 1,
              total_evidence = sussy_baka_detected.candidate_stats.total_evidence + excluded.total_evidence,
              learned_prior = least(2.5, sussy_baka_detected.candidate_stats.learned_prior + 0.015),
              last_seen_at = now(),
              updated_at = now()
        `;
      } else {
        await tx`
          insert into sussy_baka_detected.candidate_stats (
            normalized_name,
            canonical_name,
            revealed_misses,
            total_evidence,
            learned_prior,
            last_seen_at,
            updated_at
          ) values (
            ${normalizedName},
            ${canonicalName},
            1,
            ${evidence},
            1.08,
            now(),
            now()
          )
          on conflict (normalized_name) do update
          set canonical_name = excluded.canonical_name,
              revealed_misses = sussy_baka_detected.candidate_stats.revealed_misses + 1,
              total_evidence = sussy_baka_detected.candidate_stats.total_evidence + excluded.total_evidence,
              learned_prior = least(2.8, sussy_baka_detected.candidate_stats.learned_prior + 0.04),
              last_seen_at = now(),
              updated_at = now()
        `;
      }

      return true;
    });
    return stored;
  } catch {
    console.warn("[persistence] optional database operation unavailable", { operation: "learning-event-write" });
    return false;
  }
}
