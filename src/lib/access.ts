import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getProfile, getUser, requireUser } from "@/lib/auth";

import { TRIAL, TRIAL_DAYS, priceCurrencyForCountry, type PriceCurrency } from "@/lib/pricing";
export { TRIAL_DAYS };
/** Days a failed renewal keeps full access while the payment is retried. */
export const GRACE_DAYS = 3;
const DAY = 86_400_000;

/**
 * Whether an ended trial actually locks editing.
 *
 * Off until payments exist: locking people out with no way to pay would be
 * the most frustrating thing this app could do. The trial UI still shows. Set
 * ACCESS_ENFORCED=true in the environment once checkout is live.
 */
export function accessEnforced() {
  return process.env.ACCESS_ENFORCED === "true";
}

/**
 * `pending`: a card-required region, signed up, trial not started (it starts
 * at checkout). Read-only once enforcement is on, like `expired`, but it
 * hasn't had a trial, so it's never described as one that ended.
 */
export type AccessState = "complimentary" | "active" | "trial" | "grace" | "expired" | "pending";

export type Access = {
  state: AccessState;
  plan: string | null;
  trialEndsAt: Date;
  /** Whole days left in the trial, counting today. Null outside a trial. */
  daysLeft: number | null;
  enforced: boolean;
  /** True only when enforcement is on and access has run out. */
  readOnly: boolean;
  /** Who bills them — decides what "cancel" means in Settings. Null while trialing. */
  provider: "razorpay" | "mor" | null;
  /** Cancelled but paid up: access runs to `periodEnd`, then stops. */
  cancelling: boolean;
  periodEnd: Date | null;
  /** Where they pay, from their profile's region — decides which trial rules apply. */
  priceCurrency: PriceCurrency;
  /**
   * India only: the no-card trial has reached the day to ask for UPI Autopay
   * and no subscription is set up yet. The trial banner turns into the ask.
   */
  autopayDue: boolean;
};

/**
 * The single answer to "what can this user do?" — every paywall question in
 * the app goes through here. Created lazily like the profile: a new user's
 * trial starts from their signup, and expiry is worked out on read, so there's
 * no scheduler to keep in step.
 */
export const getAccess = cache(async (): Promise<Access | null> => {
  const user = await getUser();
  if (!user) return null;

  const profile = await getProfile();
  const priceCurrency = priceCurrencyForCountry(profile?.region);
  const rules = TRIAL[priceCurrency];

  let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub) {
    // No-card regions start the trial at signup. Card-required ones start
    // it at checkout, so the first row is `pending` (trialEndsAt is NOT NULL,
    // so it gets "now", and nothing reads it for a pending row).
    const started = user.created_at ? new Date(user.created_at).getTime() : Date.now();
    await db
      .insert(subscriptions)
      .values(
        rules.card
          ? { userId: user.id, status: "pending", trialEndsAt: new Date() }
          : { userId: user.id, status: "trialing", trialEndsAt: new Date(started + rules.days * DAY) },
      )
      .onConflictDoNothing();
    [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
  }

  const now = Date.now();
  const periodEnd = sub.currentPeriodEnd?.getTime() ?? null;
  const trialEnd = sub.trialEndsAt.getTime();

  let state: AccessState;
  if (sub.status === "complimentary") state = "complimentary";
  else if (sub.status === "active" && (periodEnd === null || periodEnd > now)) state = "active";
  else if (sub.status === "cancelled" && periodEnd !== null && periodEnd > now) state = "active";
  else if (sub.status === "past_due" && periodEnd !== null && periodEnd + GRACE_DAYS * DAY > now) state = "grace";
  else if (sub.status === "trialing" && trialEnd > now) state = "trial";
  else if (sub.status === "pending") state = "pending";
  else state = "expired";

  const daysLeft = state === "trial" ? Math.max(1, Math.ceil((trialEnd - now) / DAY)) : null;
  // Day N of a 7-day trial leaves 8 − N days counting today, so "from day 6"
  // is two days left or fewer.
  const autopayDue =
    rules.autopayFromDay !== null &&
    state === "trial" &&
    !sub.providerSubscriptionId &&
    daysLeft !== null &&
    daysLeft <= rules.days - rules.autopayFromDay + 1;

  const enforced = accessEnforced();
  return {
    state,
    plan: sub.plan,
    trialEndsAt: sub.trialEndsAt,
    daysLeft,
    enforced,
    readOnly: enforced && (state === "expired" || state === "pending"),
    provider: sub.provider === "razorpay" || sub.provider === "mor" ? sub.provider : null,
    // Polar keeps a cancelled subscription "active" with this flag; Razorpay
    // reports `cancelled` outright while the paid period still runs.
    cancelling: sub.cancelAtPeriodEnd || (sub.status === "cancelled" && state === "active"),
    periodEnd: sub.currentPeriodEnd,
    priceCurrency,
    autopayDue,
  };
});

/**
 * For every action that changes data. Read-only users are sent to pricing
 * rather than shown an error — the request didn't fail, their access did, and
 * pricing is where that gets fixed. Reading and exporting never pass through
 * here, so nobody is ever locked out of their own data.
 */
export async function requireWriter() {
  const user = await requireUser();
  const access = await getAccess();
  if (access?.readOnly) redirect("/pricing?trial=ended");
  return user;
}

