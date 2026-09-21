import { Money } from "@/components/money";

/**
 * The one number a screen exists to answer, in the shape Daily's hero set:
 * label, figure, a bar, and a single supporting sentence.
 *
 * It replaced three small stat cards side by side on Monthly and Yearly. Three
 * figures at equal weight is a table, not an answer — and at phone width each
 * was 11px type in a 100px-wide box. The other two figures still appear, in the
 * caption, where they read as context instead of competing.
 */
export function PeriodHero({
  label,
  amountMinor,
  tone = "auto",
  caption,
  progress,
}: {
  label: string;
  amountMinor: number;
  tone?: "default" | "auto";
  /** The supporting figures, as one line. */
  caption: React.ReactNode;
  /** Optional bar: a percentage, whether it's gone past its limit, and a note. */
  progress?: { percent: number; over?: boolean; note: React.ReactNode };
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-[2.75rem] leading-none font-bold tracking-tight sm:text-5xl">
        <Money minor={amountMinor} tone={tone} />
      </p>

      {progress && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuenow={Math.round(progress.percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full rounded-full ${progress.over ? "bg-negative" : "bg-primary"}`}
            style={{ width: `${Math.min(Math.max(progress.percent, 0), 100)}%` }}
          />
        </div>
      )}

      <p className="mt-3 text-sm text-muted-foreground">
        {caption}
        {progress?.note && (
          <>
            <span aria-hidden className="mx-1.5">·</span>
            {progress.note}
          </>
        )}
      </p>
    </section>
  );
}
