/**
 * Prices, trial terms and the yearly offer — the one place to change them.
 *
 * ₹99 / ₹799 and $7.99 / $59, set 2026-09-24. The rupee price is set on its
 * own rather than converted, so it can be tuned for India.
 *
 * Check the fee against the price before changing either: a merchant of
 * record takes roughly 6.5% + 50¢ on an international card — 13% of a $7.99
 * charge, 7% of the $59 yearly. Razorpay's ~2.4% on rupees is flat enough
 * that ₹99 still works. Shared by client and server; the payment providers'
 * plans and products must carry the same amounts.
 */
export const PRICES = {
  INR: { monthly: 99, yearly: 799 },
  USD: { monthly: 7.99, yearly: 59 },
} as const;

export type Plan = "monthly" | "yearly";

export type PriceCurrency = keyof typeof PRICES;

/**
 * How the free trial works, by where someone pays.
 *
 * - **India:** no card. The trial starts at signup; from `autopayFromDay` the
 *   app asks them to set up UPI Autopay, and the subscription it creates starts
 *   when the trial ends, so nothing is charged inside it.
 * - **Everywhere else:** card required. The trial starts at checkout (the
 *   7 days are set on the Polar products) and the card is charged when it
 *   ends unless they cancel first. Until then there's no free access — which
 *   only bites once ACCESS_ENFORCED is on.
 */
export const TRIAL = {
  INR: { days: 7, card: false, autopayFromDay: 6 },
  USD: { days: 7, card: true, autopayFromDay: null },
} as const;

/** Both regions run the same length; kept for the places that just need the number. */
export const TRIAL_DAYS = 7;

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

/** Whole amounts without decimals ($59), the rest with cents ($7.99). */
export function formatPrice(amount: number, currency: PriceCurrency) {
  const whole = Number.isInteger(amount);
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
}

/** Round the way each currency is actually charged: rupees whole, dollars to the cent. */
function roundFor(currency: PriceCurrency, n: number) {
  return currency === "INR" ? Math.round(n) : Math.round(n * 100) / 100;
}

/** What twelve monthly charges would cost — the figure yearly is struck against. */
export function twelveMonths(currency: PriceCurrency) {
  return roundFor(currency, PRICES[currency].monthly * 12);
}

/** The yearly price as a monthly figure: ₹67, $4.92. */
export function yearlyPerMonth(currency: PriceCurrency) {
  return roundFor(currency, PRICES[currency].yearly / 12);
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
