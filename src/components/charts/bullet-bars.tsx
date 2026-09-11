import Link from "next/link";

export type BulletItem = {
  key: string;
  label: string;
  color: string;
  /** Share of income actually spent, 0–100. */
  spent: number;
  /** Share of income budgeted, 0–100. */
  budgeted: number;
  /** Target share of income, 0–100. */
  target: number;
  status: string;
  detail: string;
  href?: string;
};

/**
 * One bar per group against a target mark — "you're at 48%, aiming for 50%".
 * The solid fill is spent, the pale fill behind it is budgeted, and the dark
 * tick is the target. All on the same scale: share of income.
 */
export function BulletBars({ items }: { items: BulletItem[] }) {
  const scale = Math.max(60, ...items.flatMap((i) => [i.spent, i.budgeted, i.target])) * 1.1;
  const pos = (v: number) => `${Math.min((v / scale) * 100, 100)}%`;
  return (
    <div>
      <ul className="flex flex-col gap-6">
        {items.map((i) => (
          <li key={i.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: i.color }} />
                {i.href ? <Link href={i.href} className="hover:underline">{i.label}</Link> : i.label}
              </span>
              <span className="text-xs text-muted-foreground">{i.status}</span>
            </div>
            <div className="relative mt-2.5 h-3 rounded-full bg-muted">
              <div className="absolute inset-y-0 left-0 rounded-full opacity-30" style={{ width: pos(i.budgeted), background: i.color }} />
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: pos(i.spent), background: i.color }} />
              <div
                aria-hidden
                className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground"
                style={{ left: pos(i.target) }}
              />
            </div>
            <p className="tabular mt-2 text-xs text-muted-foreground">{i.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-foreground/70" /> spent</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-foreground/20" /> budgeted</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 rounded-full bg-foreground" /> target</span>
      </p>
    </div>
  );
}
