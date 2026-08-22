<div align="center">

<img src="https://sussy-baka-detected.vercel.app/opengraph-image" alt="Sussy Baka Detected" width="100%" />

# SUSSY BAKA DETECTED

### Think of someone. Don't snitch. Let the detector cook. 🧠🚨

**A meme-powered, Akinator-inspired guessing game backed by a real hybrid deduction engine — probability scoring, information gain, live Wikimedia knowledge, Gemini semantic assistance, and verified persistent learning.**

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-ENTER_THE_DETECTOR-B6FF5C?style=for-the-badge&labelColor=0B0D10)](https://sussy-baka-detected.vercel.app)
[![Quality](https://github.com/Rishikeshsanin/sussy-baka-detected/actions/workflows/quality.yml/badge.svg)](https://github.com/Rishikeshsanin/sussy-baka-detected/actions/workflows/quality.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-111111?style=flat-square&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-111111?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-111111?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-111111?style=flat-square&logo=vercel)](https://sussy-baka-detected.vercel.app)

**[🎮 Play now](https://sussy-baka-detected.vercel.app)** · **[🧠 Architecture](#how-the-detector-thinks)** · **[⚙️ Setup](#run-it-locally)** · **[🛡️ Security](#security--privacy)**

</div>

---

## `> detector.exe` what is this?

**Sussy Baka Detected (SBD)** is a character/person guessing game where the player secretly thinks of a **real person or fictional character** and answers five-strength questions:

`YES` · `PROBABLY` · `DON'T KNOW` · `PROBABLY NOT` · `NO`

The detector progressively narrows the space, searches for current entities when necessary, confirms strong leads, and only then commits to a guess.

The personality is intentionally chaotic. The deduction architecture is not.

> **Independent project:** SBD is Akinator-inspired, but uses original branding, UI, game logic, architecture, and implementation. It is not affiliated with Akinator.

### Production

- **Live app:** https://sussy-baka-detected.vercel.app
- **Platform:** Vercel
- **Production branch:** `main`
- **Database health:** `/api/health/db`
- **Legacy V1:** [`legacy-v1`](../../tree/legacy-v1)

---

## Why this project is different

The first prototype made the classic mistake: it asked an LLM to act like the entire deduction engine.

That can *sound* intelligent, but an LLM saying `confidence: 0.99` is not a calibrated 99% probability, and telling a model to “maximize information gain” does not magically give it a real candidate distribution.

SBD V2/V3 separates the jobs properly:

| Layer | Responsibility |
|---|---|
| **Structured candidate engine** | Maintains candidate likelihoods from player answers |
| **Information-gain selector** | Chooses questions that best split the remaining probability mass |
| **Knowledge Engine** | Discovers current/not-preloaded people and characters through Wikimedia |
| **Wikidata verification** | Verifies live entities and user-revealed misses before learning |
| **Popularity signal** | Uses search rank + recent Wikipedia activity as bounded priors |
| **Gemini** | Handles semantic/long-tail assistance — not the entire brain |
| **Persistence** | Caches knowledge and stores verified learning/outcome statistics |
| **Server policy** | Enforces guess confidence, confirmation, retries, identity leaks, and give-up rules |

### In one sentence

> **The LLM suggests; the engine decides.**

---

## The detector's rules 🕵️

SBD intentionally avoids burning random guesses.

### 1. Strong lead ≠ final answer

When one candidate becomes dominant, SBD enters a **confirmation phase** instead of immediately revealing the name.

It asks candidate-specific facts that should separate that person/character from nearby alternatives.

### 2. Two confirmations before structured guesses

A structured lead normally needs **two supporting confirmation answers** with no direct contradiction before it can be revealed.

Confirmation can use expected **YES** *or* expected **NO** traits. This matters because “the candidate is known not to have X” can be just as discriminating as a positive trait.

### 3. Saying a name is already a guess

This is enforced server-side.

If an AI provider tries to output:

```text
Is that Vijay Deverakonda?
```

SBD does **not** treat that as a free question.

- If the candidate legally satisfies the guess policy → it becomes a real guess attempt.
- If the evidence is not ready → the identity is hidden and the provider must ask a proper fact-based question.

No free identity leaks. No “ask the answer, then reveal the same answer again.”

### 4. Wrong guess → back to investigation

Rejected guesses are removed from the active candidate distribution and cannot simply be repeated. SBD returns to discriminating questions before attempting another identity.

### 5. Rare characters get a real investigation

The detector does not give up simply because something is obscure.

Current policy:

- no guesses before **8 completed answers**;
- real-person rounds normally continue to at least **26 answers** before give-up is allowed;
- fictional rounds normally continue to at least **28 answers**;
- **30 questions** is the hard emergency ceiling.

### 6. If the detector gets cooked, it learns safely

On a genuine give-up, SBD asks who the player had in mind and reacts in the product's own voice. The revealed name must resolve to a real Wikidata entity before it can influence future learned candidates.

---

## Current feature set

### Deduction

- Five-strength answer model.
- Bayesian-style weighted candidate ranking.
- Posterior probability distribution over candidates.
- Entropy / expected information-gain question selection.
- Confirmation-first guess policy.
- Candidate-specific positive and negative confirmation questions.
- Server-side LLM confidence calibration.
- Identity-question-to-guess enforcement.
- Rejected-guess suppression and recovery.
- Duplicate/paraphrased-question protection.
- Question applicability gating so established facts are respected.
- Long-tail recovery questions for category, geography, profession, franchise, era, sport, medium, powers, and roles.

### Knowledge Engine

- Bundled hot pool for common zero-latency candidates.
- Live Wikipedia search when structured evidence becomes useful.
- Wikidata identity verification and structured enrichment.
- Open-world scoring for incomplete live metadata: **missing ≠ false**.
- Recent Wikipedia/pageview popularity signals.
- Dynamic candidate injection during an active round.
- Learned candidate retrieval from the persistent store.
- Persistent search/entity caching to survive Vercel cold starts.

### AI resilience

- Gemini 3.6 Flash semantic assistance.
- Low-thinking latency configuration for game turns.
- Gemini 3.5 Flash-Lite bounded fallback.
- AI failures degrade back to structured local questions.
- Wikimedia failures degrade back to local reasoning.
- Database failures do not kill gameplay.
- Provider output is schema validated *and then* semantically validated by server policy.

### Product experience

- SBD's chronically-online detector personality.
- Contextual meme reactions instead of random meme spam.
- Full question / thinking / reveal / rejected guess / win / give-up flows.
- Themed verified-miss reactions.
- Undo and restart.
- Versioned local game persistence.
- Keyboard shortcuts.
- Mobile-first responsive UI.
- Reduced-motion support.
- Visible focus states and semantic status updates.
- Generated favicon and Open Graph card.

### Engineering

- Strict TypeScript.
- Zod runtime schemas.
- Bounded request bodies and safe public errors.
- API-level rate limiting.
- SHA-256-hashed game identifiers for stored feedback.
- Idempotent feedback writes.
- Isolated least-privilege PostgreSQL runtime role.
- GitHub Actions quality gate: typecheck → tests → lint → production build → runtime smoke test.

---

## Screenshots

> **Screenshots are intentionally left for the next visual pass.** The live Open Graph card above already uses SBD's production visual identity.

| Home / Lock In | Deduction | Suspect Acquired |
|---|---|---|
| _Screenshot coming soon_ | _Screenshot coming soon_ | _Screenshot coming soon_ |

When screenshots are added, keep them under `docs/screenshots/` so the README stays portable.

---

## How the detector thinks

```text
                         PLAYER ANSWERS
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Structured evidence │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
       Bundled hot pool                 Learned candidates
              │                                 │
              └──────────────┬──────────────────┘
                             ▼
                  Probability distribution
                             │
                             ▼
                 Information-gain selector
                             │
                enough useful evidence?
                  │                    │
                 YES                  NO / long-tail
                  │                    │
                  │                    ▼
                  │           Wikipedia live search
                  │                    │
                  │           Wikidata verification
                  │                    │
                  │            popularity signal
                  │                    │
                  └───────────┬────────┘
                              ▼
                     Recompute candidates
                              │
                     ┌────────┴────────┐
                     ▼                 ▼
             ask best question   strong candidate
                                       │
                                       ▼
                              confirmation phase
                                       │
                             survives confirmations?
                                │             │
                               YES            NO
                                │             │
                                ▼             ▼
                              GUESS       investigate
                                │
                         wrong? reject it
```

Gemini sits beside this pipeline as a semantic/long-tail assistant. It does **not** get authority to bypass the server's guess policy.

For the deeper implementation notes, see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Persistent learning

A miss is only useful if it is trustworthy.

```text
Player reveals a name
        │
        ▼
Normalize + exact entity lookup
        │
        ▼
Wikidata verification
    ┌───┴──────────┐
    │              │
 verified      not verified
    │              │
    ▼              ▼
learn safely      ignore
    │
    ▼
infer supported traits from the round
    │
    ▼
store anonymous outcome + candidate data
    │
    ▼
future rounds may retrieve the candidate
```

Successful guesses and verified misses update aggregate candidate statistics. The application stores a hash of the game ID rather than the raw browser identifier.

---

## Failure policy

External systems are accelerators, **not single points of failure**.

| Failure | Game behavior |
|---|---|
| Gemini slow/unavailable | Continue with structured questions |
| Primary Gemini model stalls | Try bounded low-latency Flash-Lite fallback |
| Wikimedia unavailable | Continue from current candidate/evidence state |
| Database slow/unavailable | Skip persistence/cache and keep playing |
| Candidate absent from hot pool | Attempt live knowledge discovery |
| Identity appears inside a QUESTION action | Convert to legal GUESS or block the leak |
| Wrong guess | Reject candidate and resume investigation |
| Evidence genuinely exhausted | Give up only after long-tail policy permits it |

That fail-open game policy is deliberate: **the detector should degrade, not die.**

---

## Runtime architecture

```text
Browser
  │
  ├── POST /api/game/turn
  │      │
  │      ├── request/schema/rate validation
  │      ├── structured candidate scoring
  │      ├── information-gain question selection
  │      ├── learned/search cache lookup
  │      ├── Wikimedia discovery + verification
  │      ├── Gemini semantic fallback
  │      └── server semantic policy
  │             ├── duplicate question guard
  │             ├── identity leak guard
  │             ├── guess confidence policy
  │             ├── confirmation requirement
  │             └── give-up policy
  │
  └── POST /api/game/feedback
         │
         ├── bounded + rate-limited payload
         ├── exact Wikidata verification for reveals
         ├── SHA-256 game-ID hashing
         ├── idempotent outcome write
         └── verified learned-candidate upsert

Vercel server runtime
  │
  ├── Gemini API
  ├── MediaWiki / Wikidata / Wikipedia
  └── Supabase PostgreSQL transaction pooler
          └── dedicated sussy_baka_detected_app role
```

---

## Tech stack

| Area | Technology | Why it is here |
|---|---|---|
| **Framework** | Next.js 16.3 App Router | Full-stack React app + server routes |
| **UI** | React 19.2 | Stateful interactive game experience |
| **Language** | TypeScript 5 | Strictly typed engine and API contracts |
| **Styling** | Tailwind CSS 4 + custom `sbd.css` | Responsive layout + custom neon detector identity |
| **Icons** | Lucide React | Lightweight UI iconography |
| **Validation** | Zod 4 | Runtime validation for requests and AI responses |
| **AI** | Google Gemini via `@google/genai` | Semantic and long-tail assistance |
| **Knowledge** | Wikipedia / MediaWiki / Wikidata | Current entity discovery and verification |
| **Popularity** | Wikipedia activity/pageviews | Bounded prior signal for live candidates |
| **Database** | Supabase PostgreSQL | Persistent cache, learning and candidate stats |
| **DB client** | Postgres.js | Server-side PostgreSQL access |
| **Testing** | Vitest + Testing Library + JSDOM | Engine, API-policy, reducer and UI-adjacent tests |
| **Quality** | ESLint + TypeScript + GitHub Actions | CI gate before production |
| **Deployment** | Vercel | Next.js production hosting/serverless runtime |

No Wikimedia API key is required for the public knowledge lookups.

---

## Project structure

```text
app/
├── api/
│   ├── game/
│   │   ├── turn/              # main deduction endpoint
│   │   └── feedback/          # verified learning/outcome endpoint
│   └── health/db/             # safe DB connectivity health check
├── icon.tsx                   # generated SBD favicon
├── opengraph-image.tsx        # generated social card
└── sbd.css                    # visual identity

components/
├── game/                      # gameplay surfaces and flows
└── ui/                        # reusable branded UI

lib/
├── ai/                        # providers, prompts, semantic validation
├── engine/                    # candidates, questions, posterior, entropy
├── game/                      # reducer, policies, persistence, reactions
├── knowledge/                 # search plans + Wikimedia discovery
└── persistence/               # guarded PostgreSQL stores

supabase/
└── migrations/                # reproducible isolated SBD database changes

docs/
├── ARCHITECTURE.md            # deeper system design
├── DEPLOYMENT.md              # production/env/deploy notes
└── screenshots/               # add product screenshots here later

tests/                         # engine, AI, knowledge, reducer, policy tests
```

---

## Database isolation

SBD shares a Supabase **Project Hub**, but it does not share application data with the other apps in that hub.

### SBD-owned namespace

```text
schema: sussy_baka_detected
runtime role: sussy_baka_detected_app
```

### Persistence tables

```text
sussy_baka_detected.entity_cache
sussy_baka_detected.search_cache
sussy_baka_detected.learning_events
sussy_baka_detected.candidate_stats
```

### Safety rules

- Runtime role has no table privileges outside the SBD schema.
- All SBD SQL uses fully-qualified schema names.
- Role is `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`, `NOINHERIT`.
- Search path is pinned to `sussy_baka_detected, pg_catalog`.
- RLS is enabled on every persistence table.
- No service-role key is required by the web app.
- No cross-app foreign keys or reads are allowed.

Before changing database code, read [`SUPABASE_HUB_RULES.md`](./SUPABASE_HUB_RULES.md) and [`AGENTS.md`](./AGENTS.md).

---

## Run it locally

### Requirements

- **Node.js 20.9+** — CI currently uses Node 22
- npm

```bash
git clone https://github.com/Rishikeshsanin/sussy-baka-detected.git
cd sussy-baka-detected
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell:

```powershell
git clone https://github.com/Rishikeshsanin/sussy-baka-detected.git
cd sussy-baka-detected
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

---

## Environment variables

The app supports a credential-free core mode and optional production integrations.

| Variable | Required? | Purpose |
|---|---:|---|
| `AI_PROVIDER` | Yes | `mock`, `gemini`, or `ollama` |
| `GEMINI_API_KEY` | Gemini only | Server-side Gemini credential |
| `GEMINI_MODEL` | No | Primary Gemini model; defaults from config |
| `SBD_DATABASE_URL` | No | Server-only persistent learning/cache connection |
| `OLLAMA_BASE_URL` | Ollama only | Local Ollama server |
| `OLLAMA_MODEL` | Ollama only | Installed local model tag |
| `AI_TIMEOUT_MS` | No | Runtime AI timeout tuning |
| `SITE_URL` | No | Canonical local/production site URL |

### Safe core mode

```dotenv
AI_PROVIDER=mock
```

### Gemini mode

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.6-flash
```

### Optional persistence

```dotenv
SBD_DATABASE_URL=YOUR_SERVER_ONLY_CONNECTION_STRING
```

For Vercel/serverless production, SBD uses Supabase's **transaction pooler** and the dedicated least-privilege database role. Postgres.js is configured with `prepare: false` for transaction pooling.

> Never expose `GEMINI_API_KEY` or `SBD_DATABASE_URL` through a `NEXT_PUBLIC_*` variable.

---

## Quality gate

Before a feature reaches `main`, the GitHub Actions pipeline runs:

```text
npm ci
  ↓
npm run typecheck
  ↓
npm test
  ↓
npm run lint
  ↓
npm run build
  ↓
production runtime smoke test
```

Run the local equivalent with:

```bash
npm run check
```

Or individually:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

---

## Security & privacy

- Gemini and database credentials are server-side only.
- The browser never receives the PostgreSQL connection string.
- The browser does not call Gemini directly for deduction.
- `.env*` files are ignored except the safe `.env.example` template.
- API payloads are size-bounded and runtime validated.
- AI output is schema validated and semantically validated.
- Candidate hypotheses stay internal until a legal guess is made.
- Raw provider/database stack traces and credentials are never returned to players.
- Revealed misses must be verified before they can affect learning.
- Raw game IDs are not stored; feedback uses SHA-256 hashes.
- Feedback writes are idempotent.
- Database outages fail open and do not break the core round.
- Dedicated DB role prevents SBD from accessing unrelated Project Hub app tables.

---

## Guess confidence policy

SBD does not trust an AI model merely because the model says it is confident.

Current server policy:

| Completed answers | Minimum confidence before a guess can even be considered |
|---:|---:|
| 0–7 | **Guess blocked** |
| 8–12 | `0.95` |
| 13–20 | `0.88` |
| 21–25 | `0.82` |
| 26–29 | `0.76` |
| 30 | hard ceiling / give-up path |

Passing the confidence threshold is **not enough**. Structured candidates still need confirmation evidence, while long-tail LLM guesses must satisfy separate stability rules.

Live/learned candidates use open-world evidence: unknown source data should not be treated as a negative fact.

---

## Accessibility & responsiveness

- Mobile-first from ~320px upward.
- Five answer controls remain touch-friendly on small screens.
- Keyboard shortcuts for answer strengths.
- Safe Backspace undo behavior.
- Visible focus treatment.
- Semantic dialogs and live status text.
- Reduced-motion support.
- Responsive SBD branding instead of desktop-only chrome.

---

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Stable production source |
| `legacy-v1` | Preserved original LLM-heavy architecture |
| `feature/*` | Short-lived feature work |
| `hotfix/*` | Production reliability fixes |
| `docs/*` | Documentation/product presentation work |

Features/hotfixes are merged only after the quality workflow passes.

---

## Project evolution

```text
V1
LLM = almost the whole brain
        │
        ▼
V2
structured candidate scoring + entropy questions
        │
        ▼
Knowledge Engine
Wikipedia/Wikidata + popularity + live candidate injection
        │
        ▼
Persistent Learning
verified misses + cache + candidate statistics
        │
        ▼
Gameplay V3
confirmation-first guesses + deep long-tail rounds
        │
        ▼
Current
identity-leak guard + counted identity guesses + production hardening
```

The project grew by fixing concrete failure modes observed during real production rounds rather than by adding random features.

---

## Roadmap

The architecture now solves the largest early limitation — coverage is no longer restricted to a hand-written list. The next work is mostly **measurement, richer relationships, and product polish**:

- larger automated accuracy benchmark across sports, cinema, music, creators, politics, games, anime and fictional universes;
- richer team / franchise / occupation / relationship extraction from Wikidata;
- scheduled popularity refresh for frequently encountered entities;
- stronger aliases and alternate-name matching;
- learned prior calibration from real benchmark data;
- smarter close-candidate confirmation questions;
- shareable result cards;
- optional anonymous session statistics;
- distributed rate limiting if traffic eventually needs it;
- final GitHub screenshot gallery.

---

## Development philosophy

<div align="center">

### **Quality > quantity.**

The goal is not to claim that SBD knows every person or character ever created.

The goal is to make most reasonably notable/current entities **discoverable**, make every guess **earn its confidence**, make failures **useful when safely verified**, and make external-service failures **degrade gracefully instead of killing the game**.

**Think of someone. Don't snitch. Let the detector cook.** 💀

[![Play SBD](https://img.shields.io/badge/PLAY_SUSSY_BAKA_DETECTED-B6FF5C?style=for-the-badge&labelColor=0B0D10)](https://sussy-baka-detected.vercel.app)

</div>
