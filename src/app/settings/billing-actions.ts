"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { cancelSubscription } from "@/lib/payments/razorpay";
import { markCancelling } from "@/lib/payments/store";

/**
 * Cancel a rupee subscription. Polar has its own hosted portal for this;
 * Razorpay doesn't, so this is that portal's one button.
 *
 * The subscription id comes from the signed-in user's own row — never from
 * the form — so nobody can cancel someone else's plan by posting an id.
 */
export async function cancelRupeeSubscription(): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1);

  if (sub?.provider !== "razorpay" || !sub.providerSubscriptionId || sub.plan === "lifetime") {
    return { ok: false, error: "There's no rupee subscription on this account to cancel." };
  }

  try {
    await cancelSubscription(sub.providerSubscriptionId);
  } catch (e) {
    console.error("razorpay cancel failed", e);
    return { ok: false, error: "Razorpay didn't accept the cancel. Try again, or email us and we'll do it." };
  }

  await markCancelling(user.id);
  revalidatePath("/settings");
  return { ok: true };
}
