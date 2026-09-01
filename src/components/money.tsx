import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

/**
 * Every amount in the app goes through here, so figures always line up in a
 * column and the sign always reads the same way.
 */
export function Money({
  minor,
  className,
  tone = "default",
  signed = false,
}: {
  minor: number;
  className?: string;
  tone?: "default" | "muted" | "positive" | "negative" | "auto";
  signed?: boolean;
}) {
  const resolved =
    tone === "auto" ? (minor < 0 ? "negative" : minor > 0 ? "positive" : "muted") : tone;

  return (
    <span
      className={cn(
        "tabular",
        resolved === "muted" && "text-muted-foreground",
        resolved === "positive" && "text-positive",
        resolved === "negative" && "text-negative",
        className,
      )}
    >
      {formatMoney(minor, { signed })}
    </span>
  );
}

/**
 * Actual against planned. Fills toward the group's colour, then flips to the
 * negative tone once it crosses the plan — the bar itself carries the warning,
 * so you don't have to read the numbers to see a problem.
 */
export function BudgetBar({
  actualMinor,
  plannedMinor,
  groupKey,
  className,
}: {
  actualMinor: number;
  plannedMinor: number;
  groupKey: "needs" | "wants" | "investments" | "income";
  className?: string;
}) {
  const ratio = plannedMinor > 0 ? actualMinor / plannedMinor : 0;
  const over = ratio > 1;
  const width = Math.min(Math.max(ratio, 0), 1) * 100;

  return (
    <div
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={over ? "Over plan" : "Spent against plan"}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${over ? 100 : width}%`,
          backgroundColor: over ? "var(--negative)" : `var(--${groupKey})`,
        }}
      />
    </div>
  );
}
