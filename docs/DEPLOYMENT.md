# SBD Deployment & Operations

This document covers the production setup for **Sussy Baka Detected** without exposing credentials or account-specific secrets.

## Production

- **Live URL:** https://sussy-baka-detected.vercel.app
- **Production branch:** `main`
- **Hosting/runtime:** Vercel
- **Database:** Supabase PostgreSQL through transaction pooling
- **CI:** GitHub Actions

The repository is the source of truth. Production should always point to a commit already merged into `main` and already passed by the quality workflow.

---

## Required production environment variables

### Gemini mode

```dotenv
AI_PROVIDER=gemini
GEMINI_API_KEY=***
GEMINI_MODEL=gemini-3.6-flash
```

### Persistent learning/cache

```dotenv
SBD_DATABASE_URL=***
```

### Optional tuning

```dotenv
AI_TIMEOUT_MS=25000
SITE_URL=https://sussy-baka-detected.vercel.app
```

Secrets must remain server-side. Never use a `NEXT_PUBLIC_` prefix for provider credentials or database URLs.

---

## Database connection mode

Vercel/serverless traffic should use Supabase's **transaction pooler** rather than a long-lived direct database connection.

SBD connects through the dedicated role:

```text
sussy_baka_detected_app
```

Postgres.js is configured with prepared statements disabled for transaction-pooler compatibility.

The application additionally validates that the configured connection belongs to the intended SBD runtime context before using persistence.

---

## Database health

Production exposes a deliberately minimal health endpoint:

```text
GET /api/health/db
```

A healthy configured response is shaped like:

```json
{
  "ok": true,
  "database": "ok"
}
```

The endpoint must never return passwords, connection strings, host credentials, SQL, or unrelated Project Hub data.

---

## Quality gate

The normal release flow is:

```text
feature/hotfix branch
        │
        ▼
Pull Request
        │
        ▼
GitHub Actions quality workflow
        │
        ├── npm ci
        ├── typecheck
        ├── tests
        ├── lint
        ├── production build
        └── runtime smoke test
        │
        ▼
merge to main
        │
        ▼
Vercel production deployment
        │
        ▼
health/runtime verification
```

Do not merge a failing quality run just to get a Vercel build.

---

## Production smoke checks

After a meaningful release, verify:

1. `/` returns `200` and renders the SBD home screen.
2. `/api/health/db` returns a safe healthy response when persistence is configured.
3. A normal round can call `/api/game/turn` without a 5xx response.
4. Runtime logs contain no new unhandled errors.
5. A correct/wrong/reveal feedback flow reaches `/api/game/feedback` successfully.
6. Supabase writes remain confined to `sussy_baka_detected.*`.

For deduction-policy changes, run at least one real gameplay round after deployment.

---

## Environment safety

### Never commit

- Gemini API keys;
- database passwords;
- full production database URLs;
- Vercel deploy-hook URLs;
- Supabase service-role secrets;
- local `.env.local` files.

The repository intentionally commits only `.env.example`.

### If a secret is exposed

Rotate/revoke it at the provider, update the production environment variable, and deploy again. Do not rely on deleting the value from Git history as the only remediation.

---

## Vercel deploy hooks

A deploy hook can be used when the normal Git integration does not materialize a deployment.

Treat the hook URL as a secret-capability URL:

- do not commit it;
- do not paste it into README/issues;
- revoke and recreate it if publicly exposed;
- scope it to `main` for production releases.

The hook triggers a build; it does not replace the GitHub quality gate.

---

## External dependency behavior

Production is intentionally fail-open for non-essential integrations:

| Dependency | If unavailable |
|---|---|
| PostgreSQL | skip persistence/cache and keep playing |
| Wikimedia | continue with existing/local candidate knowledge |
| Gemini primary | try low-latency fallback |
| Gemini fallback | return to structured deduction |

A dependency outage should degrade the detector rather than cause a dead-end screen whenever a useful structured question is still available.

---

## Supabase migration rules

Before any DB migration:

1. read `SUPABASE_HUB_RULES.md`;
2. confirm the object belongs to `sussy_baka_detected`;
3. avoid `public` unless explicitly required by the hub design;
4. never add cross-app foreign keys;
5. preserve least-privilege runtime access;
6. keep migrations reproducible under `supabase/migrations/`;
7. run security/performance advisors after structural changes.

---

## Rollback strategy

If a release introduces a production regression:

- prefer reverting the faulty Git commit or deploying the last known-good `main` commit;
- do not modify production database permissions ad hoc to mask an application bug;
- preserve schema compatibility where possible;
- keep user gameplay available in local/fail-open mode if an external integration is the failing component.

The `legacy-v1` branch is historical reference, **not** a production rollback target for current architecture.

---

## Current operational philosophy

**Release slowly enough to verify, but keep the game resilient enough that one provider cannot take it down.**
