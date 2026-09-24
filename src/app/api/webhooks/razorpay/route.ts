import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhook } from "@/lib/payments/razorpay";
import { applySubscriptionUpdate, userIdForProviderSubscription } from "@/lib/payments/store";
import type { SubscriptionStatus } from "@/db/schema";

/**
 * Razorpay's side of the conversation. The browser never tells us someone
 * paid — this does, and only after the signature checks out.
 *
 * Razorpay retries an event until it gets a 2xx, so anything that isn't a
 * forged signature answers 200 even when we ignore it: a 500 on an event we
 * don't care about would have Razorpay redelivering it for a day.
 */

export const dynamic = "force-dynamic";

/** Their subscription states, in ours. */
const STATUS: Record<string, SubscriptionStatus> = {
  authenticated: "trialing", // mandate approved, first charge not yet taken
  active: "active",
  charged: "active",
  pending: "past_due", // a renewal failed; Razorpay is retrying
  halted: "past_due", // retries exhausted
  cancelled: "cancelled",
  completed: "expired", // ran its full term
  expired: "expired",
};

type Entity = {
  id: string;
  status?: string;
  current_end?: number | null;
  customer_id?: string | null;
  notes?: Record<string, string> | null;
};

export async function POST(request: NextRequest) {
  // The signature covers the exact bytes, so read text and parse after.
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let event: { event?: string; payload?: { subscription?: { entity?: Entity } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const name = event.event ?? "";


  const entity = event.payload?.subscription?.entity;
  if (!name.startsWith("subscription.") || !entity?.id) {
    return NextResponse.json({ ok: true, ignored: name });
  }

  // `notes` rides along from when we created the subscription; for later
  // events it may be absent, so fall back to the row we already wrote.
  const userId = entity.notes?.userId ?? (await userIdForProviderSubscription(entity.id));
  if (!userId) {
    console.warn("razorpay webhook for an unknown subscription", entity.id, name);
    return NextResponse.json({ ok: true, unknown: true });
  }

  const key = name.slice("subscription.".length);
  const status = STATUS[key] ?? STATUS[entity.status ?? ""] ?? "active";

  await applySubscriptionUpdate({
    userId,
    provider: "razorpay",
    status,
    plan: entity.notes?.plan ?? null,
    currency: "INR",
    providerCustomerId: entity.customer_id ?? null,
    providerSubscriptionId: entity.id,
    // Razorpay sends seconds; access runs to the end of what's been paid for.
    currentPeriodEnd: entity.current_end ? new Date(entity.current_end * 1000) : null,
    cancelAtPeriodEnd: key === "cancelled" && status !== "cancelled",
  });

  return NextResponse.json({ ok: true });
}
