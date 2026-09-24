"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireUser, getProfile } from "@/lib/auth";
import { createSubscription, configured as razorpayReady } from "@/lib/payments/razorpay";
import type { Plan, PriceCurrency } from "@/lib/pricing";

/**
 * Starting a payment. Two providers, one decision: rupees go through
 * Razorpay, everything else through Polar as merchant of record.
 *
 * Neither path takes an amount from the browser. The plan is a name —
 * "monthly" or "yearly" — and the price attached to it lives with the
 * provider, so a tampered form can't buy a year for one rupee.
 */

export type CheckoutStart =
  | {
      ok: true;
      provider: "razorpay";
      subscriptionId: string;
      keyId: string;
      name: string | null;
      email: string | null;
    }
  | { ok: true; provider: "polar"; url: string }
  | { ok: false; error: string };

export async function startCheckout(plan: Plan, currency: PriceCurrency): Promise<CheckoutStart> {
  const user = await requireUser();
  const profile = await getProfile();

  if (currency === "INR") {
    try {
      if (!razorpayReady()) return { ok: false, error: "Rupee checkout isn't switched on yet." };
      const sub = await createSubscription({
        plan,
        userId: user.id,
        email: user.email ?? null,
        name: profile?.displayName ?? null,
        startAt: await trialEndIfRunning(user.id),
      });
      return {
        ok: true,
        provider: "razorpay",
        subscriptionId: sub.id,
        // Publishable by design — it's the same id the checkout script needs.
        keyId: process.env.RAZORPAY_KEY_ID!,
        name: profile?.displayName ?? null,
        email: user.email ?? null,
      };
    } catch (e) {
      console.error("razorpay checkout failed", e);
      return { ok: false, error: (e as Error).message };
    }
  }

  const productId = {
    monthly: process.env.POLAR_PRODUCT_MONTHLY,
    yearly: process.env.POLAR_PRODUCT_YEARLY,
  }[plan];
  if (!productId) return { ok: false, error: "Card checkout isn't switched on yet." };

  // The adapter's route builds the Polar session; `customerExternalId` is what
  // ties the eventual webhook back to this account.
  const origin = (await headers()).get("origin") ?? "";
  const url = new URL("/api/checkout", origin || "http://localhost:3000");
  url.searchParams.set("products", productId);
  url.searchParams.set("customerExternalId", user.id);
  if (user.email) url.searchParams.set("customerEmail", user.email);
  if (profile?.displayName) url.searchParams.set("customerName", profile.displayName);

  return { ok: true, provider: "polar", url: url.toString() };
}

/**
 * The end of a no-card trial that's still running, so a subscription set up
 * during it starts when it ends. Razorpay wants a start comfortably in the
 * future; inside the last hour, just start now — the trial's all but over.
 */
async function trialEndIfRunning(userId: string): Promise<Date | undefined> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (sub?.status !== "trialing") return undefined;
  return sub.trialEndsAt.getTime() - Date.now() > 60 * 60 * 1000 ? sub.trialEndsAt : undefined;
}
