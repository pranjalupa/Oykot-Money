import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Supabase Postgres over the pooled connection.
 *
 * This connects as the table owner, so RLS does NOT constrain these queries —
 * isolation is enforced in application code, where every query in lib/budget.ts
 * filters on the session user's id. The RLS policies in drizzle/rls.sql are
 * defence in depth for anything that reaches the data another way.
 */
const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL (or POSTGRES_URL) is not set. Run `vercel env pull .env.local` after provisioning Supabase.",
  );
}

const globalForDb = globalThis as unknown as {
  pg: ReturnType<typeof postgres> | undefined;
};

// Reuse across hot reloads in dev, or every edit opens another pool.
const client =
  globalForDb.pg ??
  postgres(connectionString, {
    prepare: false, // pgbouncer in transaction mode can't do prepared statements
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
