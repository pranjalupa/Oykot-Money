/**
 * The currencies a budget can be counted in.
 *
 * One currency per user, and amounts are never converted: switching from ₹ to $
 * relabels your numbers, it doesn't run an exchange rate over them. A budget is
 * a plan in the money you actually spend — a live FX conversion would make last
 * month's numbers drift every time the rate moved.
 *
 * Two-decimal currencies only, because every amount is stored in hundredths
 * (`MINOR_PER_UNIT` in lib/money.ts). Adding yen or dinar means revisiting that.
 */
export const CURRENCIES = {
  INR: { name: "Indian rupee", symbol: "₹", locale: "en-IN" },
  USD: { name: "US dollar", symbol: "$", locale: "en-US" },
  EUR: { name: "Euro", symbol: "€", locale: "en-IE" },
  GBP: { name: "British pound", symbol: "£", locale: "en-GB" },
  AUD: { name: "Australian dollar", symbol: "A$", locale: "en-AU" },
  CAD: { name: "Canadian dollar", symbol: "CA$", locale: "en-CA" },
  SGD: { name: "Singapore dollar", symbol: "S$", locale: "en-SG" },
  AED: { name: "UAE dirham", symbol: "AED", locale: "en-AE" },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];
export const DEFAULT_CURRENCY: CurrencyCode = "INR";

export function isCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && value in CURRENCIES;
}

const EUROZONE = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR",
  "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK",
]);

/**
 * A sensible starting currency from a two-letter country code (Vercel's
 * `x-vercel-ip-country`). Only a default — the user picks at signup and can
 * change it any time — so an unknown country falls back to dollars.
 */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  const c = (country ?? "").toUpperCase();
  if (!c) return DEFAULT_CURRENCY;
  if (c === "IN") return "INR";
  if (EUROZONE.has(c)) return "EUR";
  const direct: Record<string, CurrencyCode> = {
    US: "USD", GB: "GBP", AU: "AUD", CA: "CAD", SG: "SGD", AE: "AED",
  };
  return direct[c] ?? "USD";
}
