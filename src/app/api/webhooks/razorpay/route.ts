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

type OrderEntity = { id: string; notes?: Record<string, string> | null };
type PaymentEntity = { id: string; order_id?: string | null; amount?: number; amount_refunded?: number };

/**
 * A lifetime purchase, or its refund. `order.paid` carries the notes we set
 * when the order was made, so identity comes from there. A refund carries
 * the payment, whose `order_id` finds the row we wrote. Only a *full* refund
 * takes lifetime back — and hands the founding seat back with it.
 */
async function handleLifetime(
  name: string,
  payload: { order?: { entity?: OrderEntity }; payment?: { entity?: PaymentEntity } },
) {
  if (name === "order.paid") {
    const order = payload.order?.entity;
    if (!order || order.notes?.plan !== "lifetime" || !order.notes.userId) return;
    await applySubscriptionUpdate({
      userId: order.notes.userId,
      provider: "razorpay",
      status: "active",
      plan: "lifetime",
      currency: "INR",
      providerSubscriptionId: order.id,
      currentPeriodEnd: null,
    });
    return;
  }

  const payment = payload.payment?.entity;
  if (!payment?.order_id) return;
  const full = (payment.amount_refunded ?? 0) >= (payment.amount ?? Infinity);
  const userId = await userIdForProviderSubscription(payment.order_id);
  if (!full || !userId) return;
  await applySubscriptionUpdate({
    userId,
    provider: "razorpay",
    status: "expired",
    plan: "lifetime",
    currency: "INR",
    providerSubscriptionId: payment.order_id,
    currentPeriodEnd: null,
  });
}

export async function POST(request: NextRequest) {
  // The signature covers the exact bytes, so read text and parse after.
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      subscription?: { entity?: Entity };
      order?: { entity?: OrderEntity };
      payment?: { entity?: PaymentEntity };
      refund?: { entity?: { amount?: number } };
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  const name = event.event ?? "";

  // Lifetime is a one-time order, not a subscription.
  if (name === "order.paid" || name === "refund.processed") {
    await handleLifetime(name, event.payload ?? {});
    return NextResponse.json({ ok: true });
  }

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
