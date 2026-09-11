/**
 * Calendar helpers that respect the user's timezone and region.
 *
 * The server runs on UTC. Asking it for "today" gave an Indian user yesterday
 * until 5:30 am — wrong default dates, repeats posted a day late, and months
 * that flipped five and a half hours after midnight. Everything that means
 * "the user's today" now goes through here with their zone.
 */

const isoParts = new Map<string, Intl.DateTimeFormat>();

/** YYYY-MM-DD for "now" in the given IANA zone (server clock if omitted). */
export function todayIn(timeZone?: string): string {
  const key = timeZone ?? "";
  let f = isoParts.get(key);
  if (!f) {
    // en-CA formats as YYYY-MM-DD, which is exactly the storage format.
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    isoParts.set(key, f);
  }
  return f.format(new Date());
}

/** YYYY-MM for "now" in the given zone. */
export function currentMonthIn(timeZone?: string): string {
  return todayIn(timeZone).slice(0, 7);
}

/** Day of the month, 1–31, for "now" in the given zone. */
export function dayOfMonthIn(timeZone?: string): number {
  return Number(todayIn(timeZone).slice(8, 10));
}

/**
 * Format a stored calendar date ("2026-09-03") for display.
 *
 * Read and formatted in UTC so the date never shifts: "2026-09-03" parses as
 * UTC midnight, and formatting it in, say, New York's zone would print Sep 2.
 */
export function formatDay(
  isoDate: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
): string {
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleDateString(locale, {
    ...options,
    timeZone: "UTC",
  });
}

/** Short month name for a YYYY-MM string — "Sep", "Sept." — in the user's locale. */
export function formatMonthShort(month: string, locale: string): string {
  return formatDay(`${month}-01`, locale, { month: "short" });
}
