import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { accounts, categories, groupTargets, profiles, DEFAULT_MONTH } from "@/db/schema";
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from "@/lib/defaults";
import { DEFAULT_TARGETS } from "@/lib/targets";
import { ensureLoanCategories } from "@/lib/loan-ledger";
import {
  DEFAULT_CURRENCY,
  currencyForCountry,
  isCurrency,
  type CurrencyCode,
} from "@/lib/currency";
import {
  REGIONS,
  isRegion,
  isTimeZone,
  regionForCountry,
  type RegionCode,
} from "@/lib/region";

/**
 * The session user for this request.
 *
 * `cache()` dedupes it across a single render pass: the layout and the page
 * both need the user, and without this each one pays a separate network
 * round-trip to Supabase Auth. (The middleware runs in its own invocation and
 * can't share this, so a request costs two auth calls, not three.)
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * The session user, or a redirect to /login.
 *
 * Every data query in this app funnels through this — the returned id is the
 * tenant key, and nothing should read or write a user-owned table without it.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
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

  if (existing.length > 0) {
    // Older accounts get the locked loan categories on their next visit.
    await ensureLoanCategories(userId);
    return false;
  }

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

  await ensureLoanCategories(userId);
  return true;
}

/**
 * The signed-in user's profile, created on first read.
 *
 * Lazy rather than at signup because a user can arrive three ways — the email
 * form, Google, or an account that predates profiles — and every one of them
 * passes through a page render. The first render seeds it from user_metadata
 * (the signup form writes `full_name` and `currency`; Google writes
 * `full_name`), falling back to a currency guessed from the visitor's country.
 */
export const getProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);
  if (existing) return existing;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name ?? meta.name ?? "").trim().slice(0, 80) || null;
  const country = (await headers()).get("x-vercel-ip-country");
  const currency = isCurrency(meta.currency)
    ? meta.currency
    : currencyForCountry(country);
  const region = isRegion(meta.region) ? meta.region : regionForCountry(country);
  const timezone = isTimeZone(meta.timezone) ? meta.timezone : null;

  const [created] = await db
    .insert(profiles)
    .values({ userId: user.id, displayName: name, currency, region, timezone })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  // Another render created it a moment ago.
  const [raced] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);
  return raced ?? null;
});

export async function getUserCurrency(): Promise<CurrencyCode> {
  const profile = await getProfile();
  return profile && isCurrency(profile.currency) ? profile.currency : DEFAULT_CURRENCY;
}

export type UserPrefs = {
  currency: CurrencyCode;
  region: RegionCode;
  locale: string;
  /** The zone to compute "today" in — the browser's, else the region's. */
  timeZone: string;
  /** What's actually stored, so the client can tell whether to report its own. */
  savedTimeZone: string | null;
};

/** Everything that changes how numbers and dates read for this user. */
export async function getUserPrefs(): Promise<UserPrefs> {
  const profile = await getProfile();
  const currency =
    profile && isCurrency(profile.currency) ? profile.currency : DEFAULT_CURRENCY;
  const region: RegionCode =
    profile && isRegion(profile.region) ? profile.region : "IN";
  const saved = profile?.timezone ?? null;
  return {
    currency,
    region,
    locale: REGIONS[region].locale,
    timeZone: isTimeZone(saved) ? saved : REGIONS[region].timeZone,
    savedTimeZone: saved,
  };
}
