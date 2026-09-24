import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getUser, requireUser } from "@/lib/auth";

import { TRIAL_DAYS } from "@/lib/pricing";
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

export type AccessState = "complimentary" | "active" | "trial" | "grace" | "expired";

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

  let [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);
  if (!sub) {
    const started = user.created_at ? new Date(user.created_at).getTime() : Date.now();
    await db
      .insert(subscriptions)
      .values({ userId: user.id, status: "trialing", trialEndsAt: new Date(started + TRIAL_DAYS * DAY) })
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
  else state = "expired";

  const enforced = accessEnforced();
  return {
    state,
    plan: sub.plan,
    trialEndsAt: sub.trialEndsAt,
    daysLeft: state === "trial" ? Math.max(1, Math.ceil((trialEnd - now) / DAY)) : null,
    enforced,
    readOnly: enforced && state === "expired",
    provider: sub.provider === "razorpay" || sub.provider === "mor" ? sub.provider : null,
    // Polar keeps a cancelled subscription "active" with this flag; Razorpay
    // reports `cancelled` outright while the paid period still runs.
    cancelling: sub.cancelAtPeriodEnd || (sub.status === "cancelled" && state === "active"),
    periodEnd: sub.currentPeriodEnd,
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

