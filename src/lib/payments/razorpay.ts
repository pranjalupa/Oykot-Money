import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay, for customers paying in rupees.
 *
 * Plain REST over fetch rather than the `razorpay` package: two endpoints and
 * one HMAC is not worth an SDK that lags the API and drags CommonJS into a
 * server component build.
 *
 * Nothing here reads a key at module load — every function asks for the
 * environment when it runs, so the app boots fine before payments are set up
 * and `configured()` decides whether to offer rupee checkout at all.
 */

const API = "https://api.razorpay.com/v1";

type Env = {
  keyId: string;
  keySecret: string;
  plans: { monthly: string; yearly: string };
};

function env(): Env | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const monthly = process.env.RAZORPAY_PLAN_MONTHLY;
  const yearly = process.env.RAZORPAY_PLAN_YEARLY;
  if (!keyId || !keySecret || !monthly || !yearly) return null;
  return { keyId, keySecret, plans: { monthly, yearly } };
}

export function configured() {
  return env() !== null;
}

/** Test keys are `rzp_test_…`; live ones `rzp_live_…`. Worth saying out loud in the UI. */
export function isTestMode() {
  return (process.env.RAZORPAY_KEY_ID ?? "").startsWith("rzp_test");
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const e = env();
  if (!e) throw new Error("Razorpay isn't configured");
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${e.keyId}:${e.keySecret}`).toString("base64")}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    // Razorpay's message is usually the useful part ("plan does not exist").
    const message = (json as { error?: { description?: string } })?.error?.description;
    throw new Error(message ?? `Razorpay refused the request (${res.status})`);
  }
  return json as T;
}

export type RazorpaySubscription = { id: string; status: string; short_url: string };

/**
 * A subscription Razorpay's checkout can then collect a mandate for.
 *
 * `notes.userId` is the thread back to us: the webhook that eventually
 * confirms payment carries these notes, and that's how a charge finds the
 * account it belongs to without trusting anything the browser sent.
 */
export async function createSubscription({
  plan,
  userId,
  email,
  name,
  startAt,
}: {
  plan: "monthly" | "yearly";
  userId: string;
  email: string | null;
  name: string | null;
  /**
   * When the first charge happens. Set to the trial's end for someone still
   * in the no-card trial: the UPI Autopay mandate is approved now, and the
   * trial they were promised stays free.
   */
  startAt?: Date;
}) {
  const e = env();
  if (!e) throw new Error("Razorpay isn't configured");
  return call<RazorpaySubscription>("/subscriptions", {
    plan_id: e.plans[plan],
    // Yearly: 5 years of renewals before Razorpay asks again. Monthly: 60.
    total_count: plan === "yearly" ? 5 : 60,
    customer_notify: 1,
    ...(startAt ? { start_at: Math.floor(startAt.getTime() / 1000) } : {}),
    notes: { userId, plan, email: email ?? "", name: name ?? "" },
  });
}

/**
 * Whether a webhook really came from Razorpay.
 *
 * The signature is an HMAC of the **raw** body, so the caller must hand over
 * the exact bytes received — parse it first and a re-serialised object will
 * differ by a space somewhere and every event will look forged.
 */
export function verifyWebhook(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}


/**
 * Stop renewals at the end of the period already paid for — never mid-period,
 * since they paid for it. Razorpay keeps the subscription active until then
 * and sends `subscription.cancelled` when it actually ends.
 */
export async function cancelSubscription(id: string) {
  return call<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(id)}/cancel`, {
    cancel_at_cycle_end: 1,
  });
}
