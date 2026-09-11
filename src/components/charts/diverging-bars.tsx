import Link from "next/link";
import { cn } from "@/lib/utils";

export type DivergingItem = {
  key: string;
  label: string;
  /** Signed: positive grows right, negative grows left. */
  value: number;
  display: string;
  sub?: string;
  href?: string;
};

/**
 * Two directions from a centre line — under/over budget, owed to you/you owe.
 * Direction answers the question before any number is read; the colours are
 * the status pair and the words say the same thing for anyone who can't see
 * them.
 */
export function DivergingBars({
  items,
  leftLabel,
  rightLabel,
  leftColor,
  rightColor,
}: {
  items: DivergingItem[];
  leftLabel: string;
  rightLabel: string;
  leftColor: string;
  rightColor: string;
}) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <div>
      <div className="mb-3 grid grid-cols-2 text-xs text-muted-foreground">
        <span className="pr-3 text-right">← {leftLabel}</span>
        <span className="pl-3">{rightLabel} →</span>
      </div>
      <ul className="flex flex-col gap-4">
        {items.map((i) => {
          const width = `${(Math.abs(i.value) / max) * 100}%`;
          const right = i.value >= 0;
          return (
            <li key={i.key} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                {i.href ? (
                  <Link href={i.href} className="truncate font-medium hover:underline">{i.label}</Link>
                ) : (
                  <span className="truncate font-medium">{i.label}</span>
                )}
                <span className={cn("tabular shrink-0 font-medium")}>{i.display}</span>
              </div>
              <div className="mt-2 grid grid-cols-2">
                <div className="flex h-2 justify-end rounded-l-full bg-muted">
                  {!right && <div className="h-full rounded-l-full" style={{ width, background: leftColor }} />}
                </div>
                <div className="flex h-2 border-l-2 border-card bg-muted rounded-r-full">
                  {right && <div className="h-full rounded-r-full" style={{ width, background: rightColor }} />}
                </div>
              </div>
              {i.sub && <p className="mt-1.5 text-xs text-muted-foreground">{i.sub}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
