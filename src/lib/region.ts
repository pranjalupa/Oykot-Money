/**
 * Region decides how dates read — "3 Sept" in India, "Sep 3" in the US — and
 * supplies a fallback timezone until the browser reports the real one.
 *
 * Separate from currency on purpose: an Indian living in Dubai may budget in
 * rupees but read dates the way everyone around them does.
 */
export const REGIONS = {
  IN: { label: "India", locale: "en-IN", timeZone: "Asia/Kolkata" },
  US: { label: "United States", locale: "en-US", timeZone: "America/New_York" },
  GB: { label: "United Kingdom", locale: "en-GB", timeZone: "Europe/London" },
  EU: { label: "Europe", locale: "en-IE", timeZone: "Europe/Berlin" },
  AU: { label: "Australia", locale: "en-AU", timeZone: "Australia/Sydney" },
  CA: { label: "Canada", locale: "en-CA", timeZone: "America/Toronto" },
  SG: { label: "Singapore", locale: "en-SG", timeZone: "Asia/Singapore" },
  AE: { label: "United Arab Emirates", locale: "en-AE", timeZone: "Asia/Dubai" },
} as const;

export type RegionCode = keyof typeof REGIONS;
export const REGION_CODES = Object.keys(REGIONS) as RegionCode[];
export const DEFAULT_REGION: RegionCode = "IN";

export function isRegion(value: unknown): value is RegionCode {
  return typeof value === "string" && value in REGIONS;
}

const EUROPE = new Set([
  "AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT",
  "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK", "DK", "SE", "PL", "CZ",
  "HU", "RO", "BG", "NO", "CH",
]);

/** A starting region from Vercel's two-letter country code. */
export function regionForCountry(country: string | null | undefined): RegionCode {
  const c = (country ?? "").toUpperCase();
  if (!c) return DEFAULT_REGION;
  if (c in REGIONS && c !== "EU") return c as RegionCode;
  if (EUROPE.has(c)) return "EU";
  return "US";
}

/** True when the runtime recognises the IANA zone — anything else is ignored. */
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
