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
  /** Set while a card trial runs; the card is charged when it passes. */
  trialEnd?: string | Date | null;
  cancelAtPeriodEnd?: boolean | null;
  customerId?: string | null;
  customer?: { id?: string | null; externalId?: string | null } | null;
  product?: { recurringInterval?: string | null } | null;
  recurringInterval?: string | null;
};

const PLAN: Record<string, string> = { month: "monthly", year: "yearly" };

/**
 * Polar's status, in ours. `trialing` has to survive the trip: the
 * card-required trial is Polar's, and reading it as anything else would
 * either cut a trial short or hand out a paid plan nobody paid for.
 */
function statusOf(sub: PolarSubscription): SubscriptionStatus {
  switch (sub.status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "incomplete":
    case "incomplete_expired":
      return "expired";
    default:
      return "cancelled";
  }
}

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
    trialEndsAt: sub.trialEnd ? new Date(sub.trialEnd) : null,
  });
}

const handler = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",

  // Checkout done. With the 7-day trial set on the products this arrives as
  // `trialing`; the card is charged when the trial ends.
  onSubscriptionCreated: async ({ data }) => {
    const sub = data as PolarSubscription;
    await write(sub, statusOf(sub));
  },

  // Paid and running — the trial converted, or a plan without one started.
  onSubscriptionActive: async ({ data }) => write(data as PolarSubscription, "active"),

  // Cancelled but *not* over: Polar keeps it live to the end of the period
  // (or of the trial), and so do we. Polar's own status says which.
  onSubscriptionCanceled: async ({ data }) => {
    const sub = data as PolarSubscription;
    await write(sub, statusOf(sub) === "trialing" ? "trialing" : "active");
  },
  onSubscriptionUncanceled: async ({ data }) => {
    const sub = data as PolarSubscription;
    await write(sub, statusOf(sub) === "trialing" ? "trialing" : "active");
  },

  // Actually finished — access stops here.
  onSubscriptionRevoked: async ({ data }) => write(data as PolarSubscription, "expired"),

  // Covers plan changes, renewals and a trial converting; status from Polar.
  onSubscriptionUpdated: async ({ data }) => {
    const sub = data as PolarSubscription;
    await write(sub, statusOf(sub));
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
