/**
 * Prices, trial terms and the yearly offer — the one place to change them.
 *
 * ₹249 / ₹1,990 and $6 / $36. The rupee price is set on its own rather than
 * converted, so it can be tuned for India.
 *
 * The dollar monthly went $4 → $6 on 2026-09-22. A merchant of record takes
 * roughly 6.5% + 50¢ on an international card, which is **19% of a $4 charge**
 * — the fixed part, not the percentage, is what hurts at small amounts. At $6
 * it's 13%, and the yearly plan (one charge instead of twelve) is 8%.
 * Shared by client and server; the payment providers will need matching plans.
 */
export const TRIAL_DAYS = 14;

export const PRICES = {
  INR: { monthly: 249, yearly: 1990 },
  USD: { monthly: 6, yearly: 36 },
} as const;

export type Plan = "monthly" | "yearly";

export type PriceCurrency = keyof typeof PRICES;

/**
 * What makes yearly worth choosing beyond the smaller number.
 *
 * The discount alone doesn't sell a year — the objection is "what if I stop
 * using it in March", so the offer answers that instead of shouting louder.
 * Both of these are promises to a paying customer: change them here and the
 * refund policy page and the provider's own terms have to follow.
 */
export const YEARLY_OFFER = {
  /** Days to ask for a full refund on a yearly plan. Monthly keeps 7. */
  refundDays: 14,
  /** The price is held for as long as the subscription runs unbroken. */
  priceLock: true,
} as const;

/** Refund window for a first charge, by plan. */
export const MONTHLY_REFUND_DAYS = 7;

/** India pays in rupees through Razorpay; everyone else in dollars. */
export function priceCurrencyForCountry(country: string | null | undefined): PriceCurrency {
  return (country ?? "").toUpperCase() === "IN" ? "INR" : "USD";
}

export function formatPrice(amount: number, currency: PriceCurrency) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** What twelve monthly charges would cost — the figure yearly is struck against. */
export function twelveMonths(currency: PriceCurrency) {
  return PRICES[currency].monthly * 12;
}

/** Yearly against twelve months, as a whole percentage. */
export function yearlySaving(currency: PriceCurrency) {
  const p = PRICES[currency];
  return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
}

/**
 * The same saving said in months, which is what people actually picture.
 *
 * **Floored, never rounded** — "4 months free" has to be true at the till, so
 * a price that only nearly reaches four months must advertise three. That's
 * why yearly INR is ₹1,990 and not ₹1,999: at ₹1,999 this returns 3.
 */
export function yearlyMonthsFree(currency: PriceCurrency) {
  const p = PRICES[currency];
  return Math.floor(12 - p.yearly / p.monthly + 1e-9);
}

export const PLAN_FEATURES = [
  "Budget every category, every month, against your 50/30/20 target",
  "Daily safe-to-spend and spending-pace charts",
  "Monthly and yearly views with savings trends",
  "Lend, borrow and track who owes whom",
  "Repeats and assume-spent for fixed bills",
  "Net worth across accounts and assets, over time",
  "Your currency and date format",
  "Export everything, any time",
];
