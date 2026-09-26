import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type Db = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: Db;
};

/**
 * The pool is created on first use, never at module import time.
 *
 * Next.js loads route modules during the `Collecting page data` build step,
 * even for `force-dynamic` routes. Throwing at import time made the whole
 * production build fail whenever DATABASE_URL was absent. Failing lazily keeps
 * the build green and turns a missing database into a runtime 503 that the
 * API routes already handle.
 *
 * `max: 1` keeps each serverless instance to a single connection. Point
 * DATABASE_URL at a pooled endpoint (Neon pooler, Supabase pgBouncer) in
 * production.
 */
export function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) {
    return globalForDb.__arenaNextJsPostgresqlPool;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  // Cached in every environment: serverless invocations reuse warm instances.
  globalForDb.__arenaNextJsPostgresqlPool = pool;
  return pool;
}

export function getDb(): Db {
  if (!globalForDb.__arenaNextJsPostgresqlDb) {
    globalForDb.__arenaNextJsPostgresqlDb = drizzle(getPool());
  }
  return globalForDb.__arenaNextJsPostgresqlDb;
}

/** True when a database is configured at all, without opening a connection. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
