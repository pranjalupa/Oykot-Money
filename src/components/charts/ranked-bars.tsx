import Link from "next/link";

export type RankedItem = {
  key: string;
  label: string;
  value: number;
  display: string;
  color: string;
  /** A second, quieter line under the label — "of ₹4,000 budgeted". */
  sub?: string;
  href?: string;
  /** Draw a lighter bar behind, e.g. the budget this spend is measured against. */
  track?: number;
};

/**
 * Largest first, name on the left, bar in the middle, amount on the right.
 * Plain HTML so labels are never clipped and a phone gets the same rows.
 */
export function RankedBars({ items }: { items: RankedItem[] }) {
  const max = Math.max(...items.map((i) => Math.max(i.value, i.track ?? 0)), 1);
  return (
    <ul className="flex flex-col gap-4">
      {items.map((i) => {
        const label = i.href ? (
          <Link href={i.href} className="truncate font-medium hover:underline">
            {i.label}
          </Link>
        ) : (
          <span className="truncate font-medium">{i.label}</span>
        );
        return (
          <li key={i.key} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              {label}
              <span className="tabular shrink-0 font-medium">{i.display}</span>
            </div>
            <div className="relative mt-2 h-2 rounded-full bg-muted">
              {i.track !== undefined && i.track > 0 && (
                <div
                  className="absolute inset-y-0 left-0 rounded-full opacity-30"
                  style={{ width: `${(i.track / max) * 100}%`, background: i.color }}
                />
              )}
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${Math.max((i.value / max) * 100, i.value > 0 ? 1.5 : 0)}%`, background: i.color }}
              />
            </div>
            {i.sub && <p className="mt-1.5 text-xs text-muted-foreground">{i.sub}</p>}
          </li>
        );
      })}
    </ul>
  );
}
