# Veyra

**The Character Oracle** — an original AI-powered deduction game for real people and fictional characters.

Keep a character in mind and answer Veyra's questions with **Yes**, **No**, **Probably**, **Probably not**, or **Don't know**. Veyra uses the complete clue trail to choose each next question, make a guess when the evidence is strong enough, and keep investigating when a guess is rejected.

Veyra is an independent project with original branding and visuals. It is not affiliated with Akinator.

## Features

- A complete deduction loop with a deterministic first question, AI-selected follow-ups, confidence-based guess guardrails, and a 30-question limit.
- Five answer strengths that preserve uncertainty instead of reducing every clue to a boolean.
- Wrong-guess recovery: rejected characters are remembered and the same game continues with its existing evidence.
- Undo that rewinds the actual game state, answer history, AI memory, and downstream guess/question state.
- Answer history, restart confirmation, victory, graceful give-up, and play-again flows.
- Versioned local persistence so an active game can survive a refresh; corrupt or incompatible saved state is discarded safely.
- Gemini, Ollama, and deterministic mock providers behind one server-side interface.
- Structured provider output and request validation with Zod, bounded payloads, timeouts, duplicate-question checks, limited corrective retries, and user-safe errors.
- A responsive, mobile-first interface with keyboard shortcuts, visible focus states, semantic dialogs/status updates, and reduced-motion support.
- A credential-free mock game for development, automated tests, demos, and UI work.

Internal memory summaries and candidate hypotheses help the deduction engine stay consistent, but are never shown to the player. The recorded answer history remains the source of truth.

## Stack

- Next.js 16.3 with the App Router
- React 19 and TypeScript in strict mode
- Tailwind CSS 4
- Zod 4
- `@google/genai` for Gemini
- Ollama's local HTTP API
- Vitest and Testing Library
- ESLint

## Getting started

### Requirements

- Node.js 20.9 or newer
- npm
- A Gemini API key only when using Gemini, or a running Ollama installation and local model only when using Ollama

### Install

```bash
npm install
```

Copy the checked-in environment template to a local, ignored file:

```bash
# macOS / Linux
cp .env.example .env.local

# Windows PowerShell
Copy-Item .env.example .env.local
```

The template selects `mock`, so the full game can be run without credentials.

### Choose an AI provider

Edit `.env.local` and select one provider. Restart the development server after changing environment variables.

#### Mock (recommended for first run)

```dotenv
AI_PROVIDER=mock
```

Mock mode is deterministic, makes no external request, and exercises both real-person and fictional-character paths.

#### Gemini

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-3.6-flash
```

The model name is configurable. The Gemini key is read only by server-side code; do not prefix it with `NEXT_PUBLIC_`.

#### Ollama

```dotenv
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=YOUR_INSTALLED_MODEL_TAG
```

Start Ollama and make sure the selected model is installed before starting a game. Ollama is optional; a connection or model error produces a recoverable game error rather than crashing the application.

See [`.env.example`](./.env.example) for optional timeout and site URL settings.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a local production-mode run:

```bash
npm run build
npm run start
```

This repository does not claim a hosted or deployed instance.

## Quality commands

```bash
npm test             # run the Vitest suite once
npm run test:watch   # run Vitest in watch mode
npm run lint         # run ESLint
npm run typecheck    # run TypeScript without emitting files
npm run build        # create a production build
```

Automated tests do not require Gemini credentials and should be run with the mock/provider boundaries kept free of live API calls.

## Architecture

```text
Browser
  ├─ reducer-driven game state and UI
  ├─ versioned localStorage persistence
  └─ POST /api/game/turn
                │
                ▼
Next.js server route
  ├─ request-size and Zod validation
  ├─ turn, duplicate, and guess-policy guardrails
  ├─ timeout, error mapping, and lightweight rate limiting
  └─ AIProvider abstraction
          ├─ GeminiProvider  ── @google/genai
          ├─ OllamaProvider  ── local Ollama HTTP API
          └─ MockProvider    ── deterministic, offline flow
                │
                ▼
        Zod-validated game action
        (question, guess, or give up)
```

The browser never contacts Gemini directly. Providers share one typed `playTurn` contract, so the game UI and state machine do not need provider-specific logic. The first question is local, normally leaving one provider request per subsequent answer. Hidden candidate hypotheses are kept on the server/client game boundary only as compact internal state and are not rendered.

## Security and privacy

- `GEMINI_API_KEY` belongs only in `.env.local` or the host's server-side secret store. `.env.local` is ignored by Git.
- Provider keys are never placed in frontend source, `NEXT_PUBLIC_*` variables, browser storage, or browser API payloads.
- The browser calls Veyra's own validated Next.js route; only the server-side provider module contacts Gemini or Ollama.
- Requests and structured AI responses are validated and bounded. User-safe error responses do not expose keys, stack traces, prompts, or raw provider details.
- Veyra stores game progress locally in the browser. It does not store API keys there and V1 has no accounts or global learning database.

Treat all browser input as untrusted when extending the project, and never commit a real `.env.local`.

## Free-tier and public-use caveats

Gemini free-tier availability, models, rate limits, and daily quotas may change. If this app is made public as an anonymous AI proxy, every visitor consumes the project owner's Gemini quota; exhaustion or temporary throttling is surfaced as a recoverable error.

Veyra's lightweight in-memory rate limiter is deliberately dependency-free, but it is **not** a global production control. It resets when the process restarts and does not coordinate across serverless instances, regions, or multiple application servers. A public production deployment should add a shared distributed limiter and suitable abuse controls. Client-side request locking and debounce improve UX, but are not security boundaries.

## Accessibility and persistence

The game supports keyboard-operated controls and shortcuts, visible focus treatment, labeled progress and dialogs, live thinking status, escape-to-close modals, responsive layouts, and reduced-motion preferences. Game progress uses a versioned `localStorage` record and can be cleared through restart; saved data is local to that browser and should not be treated as a cloud backup.

## Future improvements

The following are intentionally outside V1 and are not implemented:

- Probabilistic candidate database
- Entropy/information-gain question selector
- Persistent learning from failed games
- Accounts and leaderboards
- Additional game modes
- Semantic entity search
- Stronger distributed rate limiting

V1 intentionally avoids authentication, payments, global player data, global learning, Redis, SQL/vector databases, multiplayer, and a large hard-coded character dataset.
