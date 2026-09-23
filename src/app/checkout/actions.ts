"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireUser, getProfile } from "@/lib/auth";
import { lifetimeSeatsLeft } from "@/lib/access";
import {
  createOrder,
  createSubscription,
  configured as razorpayReady,
  lifetimeReady as razorpayLifetimeReady,
} from "@/lib/payments/razorpay";
import { PRICES, type Plan, type PriceCurrency } from "@/lib/pricing";

/**
 * Starting a payment. Two providers, one decision: rupees go through
 * Razorpay, everything else through Polar as merchant of record.
 *
 * Neither path takes an amount from the browser. The plan is a name —
 * "monthly", "yearly" or "lifetime" — and the price attached to it lives with
 * the provider or in `PRICES` on the server, so a tampered form can't buy a
 * year for one rupee.
 */

export type CheckoutStart =
  | {
      ok: true;
      provider: "razorpay";
      /** Exactly one of these: a subscription for monthly/yearly, an order for lifetime. */
      subscriptionId?: string;
      orderId?: string;
      keyId: string;
      name: string | null;
      email: string | null;
    }
  | { ok: true; provider: "polar"; url: string }
  | { ok: false; error: string };

export async function startCheckout(plan: Plan, currency: PriceCurrency): Promise<CheckoutStart> {
  const user = await requireUser();
  const profile = await getProfile();

  if (plan === "lifetime") {
    const refusal = await lifetimeRefusal(user.id);
    if (refusal) return { ok: false, error: refusal };
  }

  if (currency === "INR") {
    try {
      if (plan === "lifetime") {
        if (!razorpayLifetimeReady()) return { ok: false, error: "Rupee checkout isn't switched on yet." };
        const order = await createOrder({ amount: PRICES.INR.lifetime, userId: user.id, email: user.email ?? null });
        return {
          ok: true,
          provider: "razorpay",
          orderId: order.id,
          keyId: process.env.RAZORPAY_KEY_ID!,
          name: profile?.displayName ?? null,
          email: user.email ?? null,
        };
      }
      if (!razorpayReady()) return { ok: false, error: "Rupee checkout isn't switched on yet." };
      const sub = await createSubscription({
        plan,
        userId: user.id,
        email: user.email ?? null,
        name: profile?.displayName ?? null,
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
    lifetime: process.env.POLAR_PRODUCT_LIFETIME,
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
 * Why this account can't buy lifetime right now, or null if it can.
 *
 * Two real cases. The seats are gone — checked here as well as on the page,
 * because the page can be minutes old. Or a subscription is still running:
 * lifetime on top of it would keep the subscription charging, and Razorpay
 * retries a failed renewal on its own, so "past due" counts as running too.
 */
async function lifetimeRefusal(userId: string): Promise<string | null> {
  if ((await lifetimeSeatsLeft()) <= 0) return "The founding lifetime seats have all gone.";

  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  if (sub?.plan === "lifetime" && sub.status === "active") return "You already have lifetime.";
  const running =
    sub?.providerSubscriptionId &&
    (sub.status === "active" || sub.status === "past_due") &&
    !sub.cancelAtPeriodEnd;
  if (running) {
    return "Cancel your current plan in Settings first, so it stops charging, then come back for lifetime.";
  }
  return null;
}
