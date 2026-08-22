# Sussy Baka Detected

**Think of someone. Don't snitch. Let the detector cook.**

Sussy Baka Detected (SBD) is an Akinator-inspired guessing game for real people and fictional characters. The player answers **Yes**, **Probably**, **Don't know**, **Probably not**, or **No** while a hybrid deduction engine narrows the candidate space and tries to identify the person.

The meme personality is intentional. The deduction system underneath it is not a meme.

> SBD is an independent project with original branding and implementation. It is not affiliated with Akinator.

**Live:** `https://sussy-baka-detected.vercel.app`

## Why this version exists

The original prototype used an LLM as almost the whole deduction engine. It generated questions, candidate lists, and its own confidence score. That looked impressive, but it could not actually calculate information gain and an LLM saying `0.99` was not a calibrated 99% probability.

The current architecture separates those jobs:

- a bundled hot pool handles common guesses with zero lookup latency;
- every structured answer updates candidate likelihoods;
- local questions are selected by expected information gain;
- Wikipedia/Wikidata can inject current, verified entities during a round;
- recent Wikipedia pageviews and search order provide a bounded popularity signal;
- incomplete live records use open-world scoring: missing metadata means **unknown**, not automatically **no**;
- Gemini is a semantic/long-tail assistant instead of the entire brain;
- rejected guesses are removed from the candidate distribution;
- Gemini/Wikimedia/database failures degrade back to useful local questions instead of ending the game;
- verified misses can be persisted and re-enter future candidate pools.

The original V1 snapshot is preserved on the [`legacy-v1`](../../tree/legacy-v1) branch.

## Current features

- Adaptive game length with a 30-question emergency ceiling.
- Five answer strengths instead of forced booleans.
- Bayesian-style weighted candidate ranking.
- Entropy/information-gain question selection.
- Global geography, profession, sport, entertainment, franchise, era, and role questions.
- Live Wikipedia discovery for people/characters missing from the bundled pool.
- Wikidata verification and structured enrichment.
- 30-day Wikipedia pageviews + search order as popularity signals.
- Persistent six-hour search cache when the optional database connection is enabled.
- Verified give-up learning: typed names cannot enter the learned pool unless Wikidata confirms the entity.
- Learned candidates can re-enter later rounds from the isolated database cache.
- Anonymous outcome statistics with SHA-256-hashed game IDs.
- Idempotent feedback writes so browser retries do not double-count games.
- Gemini 3.6 Flash with low-thinking latency tuning and a Flash-Lite fallback.
- Server-side confidence calibration for LLM guesses.
- Wrong-guess recovery without restarting.
- AI outage continuation instead of a dead-end error screen.
- Duplicate-question and rejected-guess protection.
- Undo, restart, answer history, retry, win, and give-up flows.
- Versioned browser persistence for active games.
- Contextual meme reactions tied to deduction state.
- Responsive mobile/desktop UI, keyboard controls, focus states, reduced-motion support, and semantic live status.
- Dynamic favicon and social preview.
- GitHub Actions gate for typecheck, tests, lint, production build, and runtime smoke test.

## Knowledge Engine

SBD does **not** try to keep every famous person hand-written in source code.

```text
Player answers
      |
      v
Bundled hot pool
      |
      +---- probability + information gain ----+
      |                                        |
      |                         enough structured evidence?
      |                                        |
      |                                        v
      |                              Persistent learned pool
      |                                        |
      |                              Persistent search cache
      |                                        |
      |                                        v
      |                              Wikipedia live discovery
      |                                        |
      |                              Wikidata verification
      |                                        |
      |                              pageviews / popularity
      |                                        |
      +---------------------- merge candidates + recompute
                                               |
                                               v
                                  ask / guess / AI fallback
```

A newly popular athlete, actor, creator, politician, musician, or character therefore does not require a source-code release just to become discoverable. Once the answers form a useful search fingerprint, live Wikimedia knowledge can add candidates to the round.

### Persistent learning

If the detector genuinely gives up, the player may reveal the answer. That reveal is **not trusted automatically**.

```text
User reveal
   |
   v
Exact normalized Wikidata verification
   |
   +-- not verified --> ignore for learning
   |
   v
Infer structured traits from the completed answer history
   |
   v
Store SBD-owned learned candidate + anonymous outcome
   |
   v
Candidate can re-enter future matching rounds
```

Successful guesses and verified misses update aggregate candidate statistics. Raw game IDs are never stored; the server hashes them before persistence.

## Failure policy

External services are optional accelerators, not single points of failure.

```text
Database slow/unavailable  -> skip persistence and continue
Wikimedia unavailable      -> keep using structured local questions
Gemini unavailable         -> keep using structured local questions
All useful evidence spent  -> give up and optionally learn the verified reveal
```

The persistent database lookup is intentionally given only a small latency budget before the game continues to live discovery.

## Runtime architecture

```text
Browser
  |
  +--> POST /api/game/turn
  |       |
  |       +-- validation + request limits
  |       +-- duplicate / guess-policy guards
  |       +-- structured candidate engine
  |       +-- information-gain question engine
  |       +-- persistent learned/search cache (optional)
  |       +-- Wikipedia / Wikidata discovery
  |       +-- calibrated Gemini fallback
  |
  +--> POST /api/game/feedback
          |
          +-- bounded + rate-limited
          +-- exact Wikidata verification
          +-- SHA-256 game-ID hashing
          +-- idempotent anonymous outcome write
          +-- verified learned-candidate upsert
```

## Database isolation

SBD is registered as its own application inside the shared Supabase Project Hub.

- Application/schema slug: `sussy_baka_detected`
- Dedicated runtime role: `sussy_baka_detected_app`
- Runtime role has no table privileges outside the SBD schema.
- All application SQL uses fully-qualified `sussy_baka_detected.<object>` names.
- The dedicated role is `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`, and `NOINHERIT`.
- Its search path is pinned to `sussy_baka_detected, pg_catalog`.
- RLS is enabled on every SBD persistence table.
- No service-role key is required by the web application.
- No cross-app reads or foreign keys are allowed.

See [`SUPABASE_HUB_RULES.md`](./SUPABASE_HUB_RULES.md) and [`AGENTS.md`](./AGENTS.md) before making database changes.

### Persistence tables

```text
sussy_baka_detected.entity_cache
sussy_baka_detected.search_cache
sussy_baka_detected.learning_events
sussy_baka_detected.candidate_stats
```

Database migrations are tracked under [`supabase/migrations/`](./supabase/migrations/).

## Tech stack

- Next.js 16.3 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- Zod 4
- Postgres.js
- Google Gemini via `@google/genai`
- MediaWiki Action API
- Wikidata Action API
- Wikipedia PageViewInfo data
- Supabase PostgreSQL / Project Hub
- Vitest + Testing Library
- ESLint
- GitHub Actions
- Vercel

No Wikimedia API key is required for the public knowledge lookups.

## Project structure

```text
app/
  api/game/turn/          main deduction endpoint
  api/game/feedback/      verified anonymous learning endpoint
  icon.tsx                generated favicon
  opengraph-image.tsx     generated social card
  sbd.css                 visual identity

components/game/          gameplay surfaces
components/ui/            reusable brand UI

lib/engine/
  candidates.ts           bundled hot pool
  extra-candidates.ts     domain hot-pool extensions
  questions.ts            structured trait questions
  recovery-question.ts    outage-safe evidence collection
  scoring.ts              posterior + entropy engine

lib/knowledge/
  query.ts                answers -> live search plan
  wikimedia.server.ts     Wikipedia/Wikidata discovery
  discovery.server.ts     bounded hybrid discovery
  cache.server.ts         fast in-memory cache

lib/persistence/
  database.server.ts      guarded least-privilege DB client
  knowledge-store.server.ts
  learning-store.server.ts

lib/ai/
  hybrid-provider.ts
  config.server.ts
  gemini-provider.ts
  ollama-provider.ts
  mock-provider.ts
  provider.ts

lib/game/
  reducer / state / browser persistence / feedback client

supabase/migrations/      reproducible isolated SBD database changes
tests/                    engine, AI, knowledge, reducer, storage tests
```

## Getting started

### Requirements

- Node.js 20.9+; CI uses Node 22
- npm

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
npm run dev
```

### Provider options

Credential-free local/core mode:

```dotenv
AI_PROVIDER=mock
```

Gemini semantic recovery:

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.6-flash
```

Local Ollama:

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=YOUR_INSTALLED_MODEL_TAG
```

Optional persistent learning/cache:

```dotenv
SBD_DATABASE_URL=YOUR_SERVER_ONLY_CONNECTION_STRING
```

For Vercel/serverless production, use Supabase's **transaction pooler** with the dedicated `sussy_baka_detected_app` role and disable prepared statements. The application already configures Postgres.js with `prepare: false`.

The game remains fully playable if `SBD_DATABASE_URL` is not configured.

Never expose `GEMINI_API_KEY` or `SBD_DATABASE_URL` with a `NEXT_PUBLIC_` prefix.

## Verification

Run everything:

```bash
npm run check
```

Equivalent commands:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

## Security and privacy

- Provider/database credentials exist only in server-side environment variables.
- The browser never calls Gemini, Wikidata, Wikipedia, or PostgreSQL directly for deduction.
- `.env*` is ignored except the safe `.env.example` template.
- API bodies are bounded and schema validated.
- Structured model outputs are runtime validated again.
- Raw provider/database errors, prompts, stack traces, and credentials are not returned to players.
- Feedback is rate-limited and names are verified before they may affect learning.
- Game IDs are SHA-256 hashed before database storage.
- Feedback writes are database-idempotent.
- Candidate hypotheses remain hidden until the detector actually guesses.
- Database failure does not make the core game fail.

## Guess confidence policy

SBD never treats an LLM saying `0.99` as a genuine 99% probability.

Structured-candidate confidence is based on the posterior distribution, lead over the runner-up, evidence depth, and uncertainty penalties. LLM guesses are capped by server-side evidence rules before the normal guess policy can accept them.

Live/learned candidates use an open-world evidence model: if a source does not mention a trait, it is normally treated as unknown rather than false.

## Accessibility and responsiveness

- Mobile-first from 320px upward.
- Keyboard shortcuts for all five answer strengths.
- Backspace undo when safe.
- Visible focus treatment.
- Semantic dialogs and status updates.
- Reduced-motion support.
- Touch-friendly controls and adaptive branding.

## Branches

- `main` — stable production
- `legacy-v1` — immutable original architecture snapshot
- feature/hotfix branches — short-lived and merged only after the quality gate passes

## Roadmap

The biggest architecture limitations are now solved: SBD can discover current entities and can persist verified misses. The next improvements are measurement and richer relationships rather than simply adding more names by hand:

- larger automated accuracy benchmark covering sports, cinema, music, creators, politics, games, anime, and fictional universes;
- richer occupation/team/franchise relationships from Wikidata;
- scheduled popularity refresh for frequently seen candidates;
- better alias handling for verified reveals;
- learned-prior calibration from benchmark results instead of fixed increments;
- shareable result cards and optional session statistics;
- distributed rate limiting if production traffic eventually requires it.

## Development philosophy

**Quality > quantity.**

The target is not an impossible claim of knowing every person on Earth. The target is a system where most reasonably notable/current people can enter the candidate space automatically, guesses have evidence behind them, failures improve later rounds when safely verified, and external services can fail without killing the game.
