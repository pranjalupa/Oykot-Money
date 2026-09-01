import "server-only";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { accounts, categories, groupTargets, DEFAULT_MONTH } from "@/db/schema";
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from "@/lib/defaults";
import { DEFAULT_TARGETS } from "@/lib/targets";

/**
 * The session user, or a redirect to /login.
 *
 * Every data query in this app funnels through this — the returned id is the
 * tenant key, and nothing should read or write a user-owned table without it.
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return user;
}

/** Same, but returns null instead of redirecting. For optional-auth surfaces. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Gives a brand-new account something to look at: a starter category set with
 * nothing budgeted yet, two spending accounts, and the shipped 50/30/20 split.
 *
 * Idempotent — checks for existing categories first, so it's safe to call on
 * every page load. Runs in one transaction so a half-seeded account is
 * impossible.
 */
export async function ensureUserSetup(userId: string) {
  const existing = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.userId, userId))
    .limit(1);

  if (existing.length > 0) return false;

  await db.transaction(async (tx) => {
    await tx.insert(accounts).values(
      DEFAULT_ACCOUNTS.map((a, i) => ({ ...a, userId, sortOrder: i })),
    );

    await tx.insert(categories).values(
      DEFAULT_CATEGORIES.map((c, i) => ({
        userId,
        name: c.name,
        groupKey: c.groupKey,
        icon: c.icon,
        sortOrder: i,
      })),
    );

    await tx.insert(groupTargets).values(
      (["needs", "wants", "investments"] as const).map((groupKey) => ({
        userId,
        month: DEFAULT_MONTH,
        groupKey,
        percent: DEFAULT_TARGETS[groupKey],
      })),
    );
  });

  return true;
}
