/**
 * Prices and trial terms — the one place to change them.
 *
 * ₹249 / ₹1,999 and $6 / $36. The rupee price is set on its own rather than
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
  INR: { monthly: 249, yearly: 1999 },
  USD: { monthly: 6, yearly: 36 },
} as const;

export type PriceCurrency = keyof typeof PRICES;

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

/** Yearly against twelve months, as a whole percentage. */
export function yearlySaving(currency: PriceCurrency) {
  const p = PRICES[currency];
  return Math.round((1 - p.yearly / (p.monthly * 12)) * 100);
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
