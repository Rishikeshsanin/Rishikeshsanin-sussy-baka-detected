import "server-only";

import { getSbdDatabase, isSbdPersistenceConfigured } from "@/lib/persistence/database.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!isSbdPersistenceConfigured()) {
    return Response.json(
      { ok: false, database: "not_configured" },
      { status: 503, headers: responseHeaders() },
    );
  }

  const sql = getSbdDatabase();
  if (!sql) {
    return Response.json(
      { ok: false, database: "not_configured" },
      { status: 503, headers: responseHeaders() },
    );
  }

  try {
    const rows = await sql<{ current_user: string }[]>`select current_user`;
    const scopedRole = rows[0]?.current_user === "sussy_baka_detected_app";

    return Response.json(
      { ok: scopedRole, database: scopedRole ? "ok" : "wrong_role" },
      { status: scopedRole ? 200 : 503, headers: responseHeaders() },
    );
  } catch {
    return Response.json(
      { ok: false, database: "unavailable" },
      { status: 503, headers: responseHeaders() },
    );
  }
}

function responseHeaders(): Record<string, string> {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  };
}
