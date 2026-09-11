import { CURRENCIES, DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency";

/**
 * Money helpers. Everything internal is integer hundredths (paise, cents);
 * the currency's units only exist at the UI edge. Keeps 64,867.33 from ever
 * becoming 64867.329999999994.
 */

export const MINOR_PER_UNIT = 100;

export function toMinor(major: number): number {
  return Math.round(major * MINOR_PER_UNIT);
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_UNIT;
}

// Intl.NumberFormat is expensive to construct and every row on every screen
// formats money, so build each currency/precision pair once.
const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: CurrencyCode, withDecimals: boolean) {
  const key = `${currency}:${withDecimals}`;
  let f = formatters.get(key);
  if (!f) {
    const digits = withDecimals ? 2 : 0;
    f = new Intl.NumberFormat(CURRENCIES[currency].locale, {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Format hundredths in the user's currency and its local grouping (1,00,000
 * for rupees, 100,000 for dollars). Hides ".00" by default — the budget deals
 * in whole units almost everywhere, and a column of trailing zeroes is noise.
 */
export function formatMoney(
  minor: number,
  opts: { paise?: boolean; signed?: boolean; currency?: CurrencyCode } = {},
): string {
  const { paise = false, signed = false, currency = DEFAULT_CURRENCY } = opts;
  const showDecimals = paise || minor % MINOR_PER_UNIT !== 0;
  const formatted = formatter(currency, showDecimals).format(toMajor(minor));
  return signed && minor > 0 ? `+${formatted}` : formatted;
}

/**
 * Compact form for tight spots. Indian units for rupees (₹64.9K, ₹1.2L,
 * ₹3.4Cr), K/M/B for everything else — lakh and crore mean nothing to
 * someone budgeting in euros.
 */
export function formatCompact(
  minor: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const major = Math.abs(toMajor(minor));
  const sign = minor < 0 ? "-" : "";
  const sym = CURRENCIES[currency].symbol;
  const steps: [number, string][] =
    currency === "INR"
      ? [[10_000_000, "Cr"], [100_000, "L"], [1_000, "K"]]
      : [[1_000_000_000, "B"], [1_000_000, "M"], [1_000, "K"]];
  for (const [size, unit] of steps) {
    if (major >= size) return `${sign}${sym}${(major / size).toFixed(1)}${unit}`;
  }
  return `${sign}${sym}${Math.round(major)}`;
}

/** Percent of a total, guarding the divide-by-zero the spreadsheet shows as #DIV/0!. */
export function percentOf(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
