# SBD Architecture

> **The LLM suggests; the engine decides.**

This document describes the current architecture of **Sussy Baka Detected (SBD)**. The README explains the product; this file explains how the detector actually works.

## Design goals

SBD is built around five constraints:

1. **Do real deduction instead of pretending an LLM has a candidate distribution.**
2. **Cover current/not-preloaded notable entities without maintaining a giant hand-written list.**
3. **Avoid cheap failed guesses through confirmation-first policies.**
4. **Keep the game playable when Gemini, Wikimedia, or PostgreSQL is unavailable.**
5. **Allow verified failures to improve future rounds without trusting arbitrary user input.**

---

## High-level pipeline

```text
Player answer
    │
    ▼
Normalize evidence
    │
    ▼
Candidate scoring
    │
    ├── bundled candidates
    ├── learned candidates
    └── live-discovered candidates
    │
    ▼
Posterior distribution
    │
    ▼
Question selector / guess policy
    │
    ├── ask high-information structured question
    ├── run live discovery when useful
    ├── ask candidate-specific confirmations
    ├── use Gemini for semantic/long-tail assistance
    └── reveal a legal guess only after server policy accepts it
```

The browser never gets authority over candidate confidence or verification.

---

## 1. Structured candidate engine

The deterministic engine is the core of SBD.

Candidates contain traits/tags that map to structured questions. Player answers contribute weighted evidence rather than binary elimination.

Approximate evidence interpretation:

```text
YES            strong positive evidence
PROBABLY       moderate positive evidence
DON'T KNOW     near-neutral / uncertainty
PROBABLY NOT   moderate negative evidence
NO             strong negative evidence
```

The scorer produces a normalized distribution so SBD can reason about:

- top candidate probability;
- runner-up probability;
- margin between candidates;
- evidence depth;
- uncertainty;
- whether a proposed question will actually split the remaining field.

### Open-world scoring

Live Wikimedia entities are often incomplete.

If Wikidata does not contain a trait, SBD does **not** automatically interpret that as `false`. Missing metadata is treated as unknown unless there is explicit evidence for the negative.

This avoids unfairly killing newly discovered candidates simply because their structured record is sparse.

---

## 2. Information-gain question selection

Structured questions are evaluated against the active candidate distribution.

The selector prefers questions expected to reduce uncertainty rather than questions that merely sound relevant.

Conceptually:

```text
current entropy
      -
expected entropy after asking question
      =
expected information gain
```

Question applicability rules also prevent logically incompatible questions. For example, once the player has clearly established a fictional character, real-person-only questions should be gated out.

---

## 3. Knowledge Engine

The bundled hot pool is intentionally finite. It exists for common guesses and low latency, not as the full universe of possible answers.

When enough evidence exists, SBD can build a search fingerprint such as:

```text
real person
male
Telugu cinema
actor
India
```

The Knowledge Engine can then:

1. search Wikipedia/MediaWiki;
2. resolve candidate pages/entities;
3. verify them through Wikidata;
4. derive structured traits where available;
5. attach bounded popularity information;
6. inject those candidates into the current round;
7. recompute the candidate distribution.

### Popularity signal

Search order and recent Wikipedia activity/pageview information are used as **bounded priors**, never as proof that an entity is the answer.

Popularity helps choose among otherwise plausible candidates while preserving evidence-based scoring.

---

## 4. Gemini's role

Gemini is intentionally not the whole brain.

It is used for semantic/long-tail assistance when structured evidence is insufficient or the candidate space needs help.

Provider outputs are validated twice:

1. **Schema validation** — does the JSON match the expected action shape?
2. **Semantic validation** — is the requested action legal for the current game state?

The second layer prevents a provider from bypassing product rules.

### Latency policy

Production uses a latency-sensitive Gemini configuration and a bounded low-latency fallback.

If Gemini fails, SBD should continue using structured questions instead of ending the round.

---

## 5. Confirmation-first guessing

A candidate becoming likely is not the same thing as being ready to reveal.

For structured guesses, SBD requires candidate-specific confirmation evidence.

Confirmation questions encode:

- which candidate is being confirmed;
- the underlying trait question;
- whether the expected answer is positive or negative.

Example:

```text
Candidate: Pat Cummins
Expected trait: bowler = YES

Question: Is your person primarily known as a bowler?
```

A negative trait can also confirm a candidate:

```text
Candidate: X
Expected trait: fictional = NO
```

Two supporting confirmation answers with no contradiction are normally required for structured guesses.

---

## 6. Identity-leak protection

One production bug taught an important distinction:

```text
"Is that Vijay Deverakonda?"
```

is not a clue question. It is a guess.

SBD now normalizes identity-shaped QUESTION responses before semantic validation.

If a provider names the suspected identity inside a question:

- if the guess is legally ready, the action is converted into a proper `GUESS`;
- if the guess is not ready, the name is blocked from the player and the provider must generate a fact-based question instead.

This guarantees that identity attempts cannot become uncounted/free guesses.

---

## 7. Rejected guesses

When a player rejects a guess:

1. the candidate is added to the rejected set;
2. it is removed from the usable candidate distribution;
3. the next turn must return to investigation;
4. the rejected identity cannot be immediately guessed again.

The goal is graceful recovery rather than restarting the entire round.

---

## 8. Give-up policy

SBD should not give up simply because a character is obscure.

Current product policy:

```text
0-7 answers     guess disabled
26 answers      normal earliest real-person give-up region
28 answers      normal earliest fictional give-up region
30 answers      hard ceiling
```

Until give-up is legal, the engine is encouraged to try new discriminating dimensions such as:

- category;
- geography;
- profession;
- sport/team role;
- media type;
- fictional franchise/universe;
- era;
- defining abilities/traits.

---

## 9. Persistent learning

Persistent learning is server-only and optional to core gameplay.

### Verified miss flow

```text
Give-up
  │
player reveals identity
  │
normalize name
  │
Wikidata verification
  │
  ├── no exact/valid entity -> do not learn
  │
  └── verified entity
          │
          ├── infer supported traits from history
          ├── store learned entity/cache
          └── update anonymous aggregate stats
```

### Why verification matters

Without verification, players could poison the candidate pool with jokes, typos, fake names, or prompt-like text.

SBD learns only from identities that resolve to a real knowledge entity.

---

## 10. Persistence schema

SBD owns only the `sussy_baka_detected` schema in the shared Supabase Project Hub.

```text
entity_cache       verified entity metadata
search_cache       persistent live-search results
learning_events    idempotent anonymous game outcomes
candidate_stats    aggregate success/miss statistics
```

Runtime role:

```text
sussy_baka_detected_app
```

The role has no table privileges outside the SBD schema.

See [`../SUPABASE_HUB_RULES.md`](../SUPABASE_HUB_RULES.md).

---

## 11. API responsibilities

### `POST /api/game/turn`

Responsible for:

- validating game state;
- rate/request limits;
- invoking the hybrid engine;
- knowledge discovery;
- AI fallback;
- semantic output policy;
- safe response serialization.

### `POST /api/game/feedback`

Responsible for:

- bounded/rate-limited feedback;
- outcome persistence;
- hashing raw game identifiers;
- verifying revealed entities;
- learned-candidate writes;
- idempotency.

### `GET /api/health/db`

A safe operational check that reports whether the optional SBD database connection is configured and reachable without exposing credentials or database details.

---

## 12. Failure boundaries

```text
Dependency                Failure behavior
──────────────────────────────────────────────────────────
PostgreSQL                skip persistent cache/write
Wikipedia/MediaWiki       continue structured deduction
Wikidata                  avoid unverified learning
Gemini primary            try bounded low-latency fallback
Gemini fallback           continue structured deduction
Invalid AI action         retry/correct or reject safely
30-question exhaustion    give-up/reveal flow
```

A dependency failure should not corrupt the current game state.

---

## 13. Client state

The browser owns interaction state, not deduction authority.

Client-side state includes:

- current screen;
- answered question history;
- rejected guesses;
- server-provided compact AI memory;
- active candidate hypotheses only as opaque server state where applicable;
- retry/undo/restart state.

Active games use versioned local persistence so a reload does not automatically erase a round.

---

## 14. Quality strategy

The CI gate intentionally includes both pure logic and production-build validation:

```text
TypeScript strict check
        ↓
Vitest regression suite
        ↓
ESLint
        ↓
Next.js production build
        ↓
production runtime smoke test
```

Important regressions include:

- duplicate questions;
- rejected guess reuse;
- premature guesses;
- premature give-up;
- candidate confirmation behavior;
- knowledge query construction;
- open-world scoring;
- AI outage continuation;
- identity questions being counted as guesses;
- browser persistence behavior.

---

## 15. Architecture principle

SBD is intentionally a **hybrid system**.

Pure deterministic logic gives control, observability and testability. Live knowledge gives coverage. Gemini gives semantic flexibility. Persistence turns verified misses into future signal.

No one layer is trusted to do everything.
