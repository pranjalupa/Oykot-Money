"use client";

import { cn } from "@/lib/utils";

/**
 * The month as a calendar, darker on days you spent more. People already know
 * how to read a calendar, so patterns — weekends, payday, a quiet week — show
 * up without a single axis.
 *
 * One hue, light to dark, in four steps scaled to this month's biggest day.
 */
export function CalendarHeatmap({
  month,
  values,
  format,
  locale,
  today,
}: {
  month: string;
  values: Record<string, number>;
  format: (minor: number) => string;
  locale: string;
  /** YYYY-MM-DD in the user's zone; later days are shown as not yet happened. */
  today: string;
}) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  // Americas start the week on Sunday; most of the world, India included, on Monday.
  const weekStart = /-(US|CA)$/.test(locale) ? 0 : 1;
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const lead = (firstWeekday - weekStart + 7) % 7;

  const max = Math.max(...Object.values(values), 0);
  const step = (v: number) => (v <= 0 || max <= 0 ? 0 : Math.min(4, Math.ceil((v / max) * 4)));
  const FILL = ["", "22%", "42%", "66%", "100%"];

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(2024, 0, 7 + ((i + weekStart) % 7))).toLocaleDateString(locale, { weekday: "narrow", timeZone: "UTC" }),
  );

  // Capped so a wide card doesn't turn days into posters; a calendar reads
  // best at calendar size.
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {weekdays.map((d, i) => (
          <span key={i} className="pb-1 text-center text-xs text-muted-foreground">{d}</span>
        ))}
        {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const iso = `${month}-${String(i + 1).padStart(2, "0")}`;
          const v = values[iso] ?? 0;
          const s = step(v);
          const future = iso > today;
          const when = new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { day: "numeric", month: "short", timeZone: "UTC" });
          const label = future ? `${when}: not yet` : v > 0 ? `${when}: ${format(v)}` : `${when}: nothing spent`;
          return (
            <div
              key={iso}
              title={label}
              aria-label={label}
              className={cn(
                "flex aspect-square items-start justify-end rounded-lg p-1 text-[10px] tabular sm:p-1.5 sm:text-xs",
                future ? "border border-dashed border-border text-muted-foreground/60" : s === 0 ? "bg-muted/60 text-muted-foreground" : "",
                s >= 3 ? "text-primary-foreground" : s > 0 ? "text-foreground" : "",
                iso === today && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
              )}
              style={s > 0 && !future ? { background: `color-mix(in oklab, var(--primary) ${FILL[s]}, var(--card))` } : undefined}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        Less
        {[0, 1, 2, 3, 4].map((s) => (
          <span
            key={s}
            className={cn("size-3 rounded", s === 0 && "bg-muted/60")}
            style={s ? { background: `color-mix(in oklab, var(--primary) ${FILL[s]}, var(--card))` } : undefined}
          />
        ))}
        More
      </div>
    </div>
  );
}
