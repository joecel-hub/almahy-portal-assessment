import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/server/env";
import * as schema from "./schema";

function createDb() {
  const client = postgres(env().DATABASE_URL, {
    // Neon's pooled endpoint runs PgBouncer in transaction mode, which does
    // not support session-level prepared statements.
    prepare: false,
    // Serverless functions each hold a few connections; the pooler multiplexes them.
    max: 5,
  });
  return drizzle({ client, schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof createDb>;

// Reuse one client per server process. In development, Next's hot reload
// re-evaluates modules, so the instance is parked on globalThis to avoid
// opening a new connection pool on every edit.
const globalForDb = globalThis as unknown as { db?: Db };

export function db(): Db {
  if (!globalForDb.db) globalForDb.db = createDb();
  return globalForDb.db;
}
