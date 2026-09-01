import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Local SQLite. The file lives beside the project and is gitignored — this is
 * personal financial data and has no business in a repo.
 *
 * Drizzle keeps the Postgres path open: swapping to Neon later is a driver +
 * dialect change, not a rewrite of every query.
 */
const dbPath = process.env.DATABASE_URL ?? "./oykot.db";

const globalForDb = globalThis as unknown as {
  sqlite: Database.Database | undefined;
};

// Reuse across hot reloads in dev, or every edit opens another handle.
const sqlite = globalForDb.sqlite ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") globalForDb.sqlite = sqlite;

sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
