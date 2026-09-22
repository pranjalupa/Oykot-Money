import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions, type SubscriptionStatus } from "@/db/schema";
import { TRIAL_DAYS } from "@/lib/pricing";

/**
 * The one place a payment provider is allowed to change what a user can do.
 *
 * Both providers speak their own language — Razorpay has `subscription.charged`,
 * Polar has `subscription.active` — so each webhook translates into this shape
 * and nothing else writes to the table. `lib/access.ts` reads it and decides
 * the rest; it never knows which provider paid.
 */

export type Provider = "razorpay" | "mor";

export type SubscriptionUpdate = {
  userId: string;
  provider: Provider;
  status: SubscriptionStatus;
  /** "monthly" | "yearly", as the plan was sold. */
  plan?: string | null;
  currency?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  /** When the paid period runs out. Access survives until then even on cancel. */
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
};

const DAY = 86_400_000;

/**
 * Write what a provider told us. Upserts, because a webhook can arrive before
 * the user's row exists (a first payment on a fresh account) and because
 * providers retry: the same event landing twice must not change anything the
 * second time.
 */
export async function applySubscriptionUpdate(update: SubscriptionUpdate) {
  const {
    userId,
    provider,
    status,
    plan = null,
    currency = null,
    providerCustomerId = null,
    providerSubscriptionId = null,
    currentPeriodEnd = null,
    cancelAtPeriodEnd = false,
  } = update;

  const values = {
    userId,
    provider,
    status,
    plan,
    currency,
    providerCustomerId,
    providerSubscriptionId,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    // Only used if this is the first row for the user; a paid account isn't
    // trialing, but the column is NOT NULL.
    trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY),
    updatedAt: new Date(),
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: {
        provider: values.provider,
        status: values.status,
        plan: values.plan,
        currency: values.currency,
        providerCustomerId: values.providerCustomerId,
        providerSubscriptionId: values.providerSubscriptionId,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: values.updatedAt,
      },
    });
}

/** The user behind a provider's subscription id, for events that carry no metadata. */
export async function userIdForProviderSubscription(id: string): Promise<string | null> {
  const [row] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.providerSubscriptionId, id))
    .limit(1);
  return row?.userId ?? null;
}
