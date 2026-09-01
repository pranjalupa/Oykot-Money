/**
 * Money helpers. Everything internal is integer paise; rupees only exist at
 * the UI edge. Keeps ₹64,867.33 from ever becoming 64867.329999999994.
 */

export const MINOR_PER_UNIT = 100;

export function toMinor(rupees: number): number {
  return Math.round(rupees * MINOR_PER_UNIT);
}

export function toMajor(minor: number): number {
  return minor / MINOR_PER_UNIT;
}

const withPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const whole = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Format paise as rupees. Defaults to hiding ".00" — the budget deals in whole
 * rupees almost everywhere, and a column of trailing zeroes is just noise.
 */
export function formatMoney(
  minor: number,
  opts: { paise?: boolean; signed?: boolean } = {},
): string {
  const { paise = false, signed = false } = opts;
  const showPaise = paise || minor % MINOR_PER_UNIT !== 0;
  const formatted = (showPaise ? withPaise : whole).format(toMajor(minor));
  return signed && minor > 0 ? `+${formatted}` : formatted;
}

/** Compact form for tight spots: ₹64.9K, ₹1.2L. Indian units, not K/M/B. */
export function formatCompact(minor: number): string {
  const rupees = Math.abs(toMajor(minor));
  const sign = minor < 0 ? "-" : "";
  if (rupees >= 10_000_000) return `${sign}₹${(rupees / 10_000_000).toFixed(1)}Cr`;
  if (rupees >= 100_000) return `${sign}₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `${sign}₹${(rupees / 1_000).toFixed(1)}K`;
  return `${sign}₹${Math.round(rupees)}`;
}

/** Percent of a total, guarding the divide-by-zero the spreadsheet shows as #DIV/0!. */
export function percentOf(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
