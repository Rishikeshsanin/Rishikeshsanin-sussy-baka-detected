import "server-only";

import postgres from "postgres";

const PROJECT_REF = "nowlwprtcnieihelqjoa";
const APP_ROLE = "sussy_baka_detected_app";
const DIRECT_HOST = `db.${PROJECT_REF}.supabase.co`;

type SqlClient = ReturnType<typeof postgres>;

let client: SqlClient | null | undefined;
let warnedAboutInvalidUrl = false;

function isAllowedDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const username = decodeURIComponent(url.username);
    const validUser = username === APP_ROLE || username === `${APP_ROLE}.${PROJECT_REF}`;
    const validHost = url.hostname === DIRECT_HOST || url.hostname.endsWith(".pooler.supabase.com");
    return url.protocol === "postgres:" || url.protocol === "postgresql:"
      ? validUser && validHost
      : false;
  } catch {
    return false;
  }
}

/**
 * Returns the least-privilege SBD database client when configured.
 *
 * Persistence is deliberately optional: the live game must continue to work
 * through Wikimedia/Gemini even if the database URL is absent or unavailable.
 */
export function getSbdDatabase(): SqlClient | null {
  if (client !== undefined) return client;

  const databaseUrl = process.env.SBD_DATABASE_URL?.trim();
  if (!databaseUrl) {
    client = null;
    return client;
  }

  if (!isAllowedDatabaseUrl(databaseUrl)) {
    if (!warnedAboutInvalidUrl) {
      console.error("[persistence] SBD_DATABASE_URL rejected by project/role guard");
      warnedAboutInvalidUrl = true;
    }
    client = null;
    return client;
  }

  client = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 4,
    max_lifetime: 60 * 5,
    prepare: false,
    ssl: "require",
  });

  return client;
}

export function isSbdPersistenceConfigured(): boolean {
  return Boolean(getSbdDatabase());
}
