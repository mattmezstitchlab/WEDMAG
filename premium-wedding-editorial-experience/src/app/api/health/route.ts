import { sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    // The site itself is fine without a database; only persistence is off.
    return Response.json({ ok: true, database: "not_configured" });
  }

  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
