# Sussy Baka Detected — Supabase Project Hub Safety Contract

Application slug and schema: `sussy_baka_detected`

Repository: `https://github.com/Rishikeshsanin/sussy-baka-detected`

## Scope

Sussy Baka Detected may own objects only inside the dedicated `sussy_baka_detected` schema, plus resources explicitly registered to this application in Project Hub.

## Required behavior

1. Read the Project Hub control notice before any database write.
2. Verify the app registry maps slug `sussy_baka_detected` to schema `sussy_baka_detected`.
3. Use fully qualified object names for every migration and query.
4. Keep all SBD tables, views, indexes, triggers and functions inside `sussy_baka_detected` unless a specifically reviewed public RPC is required.
5. Enable RLS on user-facing/application tables and use least-privilege policies.
6. Keep privileged database credentials server-side only.
7. Run Supabase security/performance advisors after meaningful schema or RLS changes.
8. Record meaningful database migrations in Project Hub where supported.

## Forbidden behavior

- No application tables in `public`.
- No changes to `auth`, `storage`, `hub`, another application's schema, or project-wide configuration as part of an SBD migration.
- No cross-app foreign keys or reads.
- No blanket grants across schemas.
- No `DROP SCHEMA ... CASCADE`, unscoped destructive statements, or disabling RLS.
- No project service-role/secret key in frontend code, GitHub, logs, screenshots, or documentation.

## Knowledge-engine data

The SBD database is intended only for verified entity cache/learning data, feedback, popularity metadata and SBD-owned game-learning records. Wikimedia/Wikidata remain external sources; cached data must keep provenance and verification timestamps.
