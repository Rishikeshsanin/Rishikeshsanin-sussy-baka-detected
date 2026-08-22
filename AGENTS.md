<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Sussy Baka Detected data isolation

This repository owns only the `sussy_baka_detected` application scope in the shared Supabase Project Hub.

- Never read from, write to, alter, reference, or create foreign keys into another application's schema.
- Never create SBD application tables in `public`.
- Always fully qualify database objects as `sussy_baka_detected.<object>`.
- Keep database writes server-side. Never expose a project-level service-role or secret key to browser code.
- RLS stays enabled on every application table; do not disable it as a shortcut.
- Any shared/project-wide Supabase change requires explicit impact review before execution.
- Repository file `SUPABASE_HUB_RULES.md` contains the app-specific database safety contract and must be read before SBD database changes.
