import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "",
  },
  // auth.users belongs to Supabase — we reference it, we don't manage it.
  schemaFilter: ["public"],
} satisfies Config;
