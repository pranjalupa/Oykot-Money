/**
 * The one slice of the app still drawn here: Daily's pace chart, used by the
 * landing page's feature panel. Everything else the marketing pages show lives
 * in components/landing-mockups.tsx.
 *
 * Markup rather than a screenshot, so it follows the theme and can't go stale.
 */

/** The shell every mini sits in: inset, clipped, and never interactive. */
function Mini({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-xl border border-border bg-background/60 p-3 select-none"
    >
      {children}
    </div>
  );
}

/** Spending against an even pace — Daily's one chart, drawn as plain divs. */
export function PaceMini() {
  // Heights as percentages: a month that starts steady and picks up.
  const bars = [38, 52, 44, 61, 48, 72, 66];
  return (
    <Mini>
      <div className="flex h-[76px] items-end gap-1.5">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-sm ${i === bars.length - 1 ? "bg-primary" : "bg-primary/35"}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Mon → Sun · under the line all week</p>
    </Mini>
  );
}
