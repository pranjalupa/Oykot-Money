import { Webhooks } from "@polar-sh/nextjs";
import { applySubscriptionUpdate } from "@/lib/payments/store";
import type { SubscriptionStatus } from "@/db/schema";

/**
 * Polar's side, for everyone outside India.
 *
 * Polar is a merchant of record: it sells to the customer, collects whatever
 * tax that customer's country demands, and pays out. So this never sees a
 * card, a country or a tax rate — only "this person is paid up until then".
 *
 * Their adapter verifies the signature before any handler runs (Standard
 * Webhooks), which is why there's no manual HMAC here the way Razorpay needs.
 */

/**
 * Who a Polar subscription belongs to. Checkout is started with
 * `customerExternalId` set to our user id, so it comes back on every event —
 * and it's the only field we trust for identity. Matching on email would let
 * anyone claim an account by paying with its address.
 */
type PolarSubscription = {
  id: string;
  status?: string | null;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
  customerId?: string | null;
  customer?: { id?: string | null; externalId?: string | null } | null;
  product?: { recurringInterval?: string | null } | null;
  recurringInterval?: string | null;
};

const PLAN: Record<string, string> = { month: "monthly", year: "yearly" };

async function write(sub: PolarSubscription, status: SubscriptionStatus) {
  const userId = sub.customer?.externalId;
  if (!userId) {
    // Nothing to attach it to. Log rather than throw: Polar would retry the
    // event for hours and the answer would never change.
    console.warn("polar webhook with no customer external id", sub.id);
    return;
  }

  const interval = sub.recurringInterval ?? sub.product?.recurringInterval ?? "";
  await applySubscriptionUpdate({
    userId,
    provider: "mor",
    status,
    plan: PLAN[interval] ?? null,
    currency: "USD",
    providerCustomerId: sub.customer?.id ?? sub.customerId ?? null,
    providerSubscriptionId: sub.id,
    currentPeriodEnd: sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
  });
}

/**
 * Lifetime is a one-time product, so Polar reports it as an *order*, not a
 * subscription. Subscription renewals raise `order.paid` too, which is why
 * this matches on the lifetime product id rather than the event alone.
 */
type PolarOrder = {
  id: string;
  productId?: string | null;
  totalAmount?: number | null;
  refundedAmount?: number | null;
  customerId?: string | null;
  customer?: { id?: string | null; externalId?: string | null } | null;
};

function isLifetime(order: PolarOrder) {
  const id = process.env.POLAR_PRODUCT_LIFETIME;
  return Boolean(id && order.productId === id);
}

async function writeLifetime(order: PolarOrder, status: SubscriptionStatus) {
  const userId = order.customer?.externalId;
  if (!userId) {
    console.warn("polar lifetime order with no customer external id", order.id);
    return;
  }
  await applySubscriptionUpdate({
    userId,
    provider: "mor",
    status,
    plan: "lifetime",
    currency: "USD",
    providerCustomerId: order.customer?.id ?? order.customerId ?? null,
    providerSubscriptionId: order.id,
    // No end: lib/access.ts reads an active row with no period end as "for good".
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  });
}

const handler = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",

  // Paid and running.
  onSubscriptionActive: async ({ data }) => write(data as PolarSubscription, "active"),

  // Cancelled but *not* over: Polar keeps it live to the end of the period,
  // and so do we — they paid for it.
  onSubscriptionCanceled: async ({ data }) => write(data as PolarSubscription, "active"),
  onSubscriptionUncanceled: async ({ data }) => write(data as PolarSubscription, "active"),

  // Actually finished — access stops here.
  onSubscriptionRevoked: async ({ data }) => write(data as PolarSubscription, "expired"),

  // Lifetime: paid is for good; a full refund takes it back and frees the seat.
  onOrderPaid: async ({ data }) => {
    const order = data as PolarOrder;
    if (isLifetime(order)) await writeLifetime(order, "active");
  },
  onOrderRefunded: async ({ data }) => {
    const order = data as PolarOrder;
    const full = (order.refundedAmount ?? 0) >= (order.totalAmount ?? Infinity);
    if (isLifetime(order) && full) await writeLifetime(order, "expired");
  },

  // Covers plan changes and renewals; status comes from Polar itself.
  onSubscriptionUpdated: async ({ data }) => {
    const sub = data as PolarSubscription;
    const status: SubscriptionStatus =
      sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "cancelled";
    await write(sub, status);
  },
});

/**
 * Before the secret exists, say so with a 503 rather than letting the adapter
 * throw a 500: a provider reads 5xx as "retry later", and that's exactly
 * right while payments aren't configured yet.
 */
export async function POST(request: Request) {
  if (!process.env.POLAR_WEBHOOK_SECRET) {
    return Response.json({ error: "Polar webhooks aren't configured" }, { status: 503 });
  }
  return handler(request as never);
}
