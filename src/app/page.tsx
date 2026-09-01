import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Money, BudgetBar } from "@/components/money";
import { MonthSwitcher } from "@/components/month-switcher";
import {
  currentMonth,
  getMonthSummary,
  GROUP_META,
  hasMonthOverride,
} from "@/lib/budget";
import { formatMoney, percentOf } from "@/lib/money";
import type { GroupKey } from "@/db/schema";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SPEND_GROUPS: Exclude<GroupKey, "income">[] = [
  "needs",
  "wants",
  "investments",
];

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? monthParam!
    : currentMonth();

  const summary = await getMonthSummary(month);
  const overridden = await hasMonthOverride(month);

  const spentSoFar = summary.actualExpense;
  const noActivity = summary.actualIncome === 0 && spentSoFar === 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">This month</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Planned against actual, the way the sheet does it.
          </p>
        </div>
        <MonthSwitcher month={month} />
      </header>

      {/* Headline numbers ------------------------------------------------- */}
      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Income"
          actualMinor={summary.actualIncome}
          plannedMinor={summary.plannedIncome}
        />
        <StatCard
          label="Expenses"
          actualMinor={summary.actualExpense}
          plannedMinor={summary.plannedExpense}
        />
        <StatCard
          label="Saved this month"
          actualMinor={summary.actualSaved}
          plannedMinor={summary.plannedSaved}
          tone="auto"
        />
      </section>

      {noActivity && (
        <p className="accent-note -mt-4 text-sm text-muted-foreground">
          No transactions logged for {GROUP_META.income.label.toLowerCase()} or
          spending yet — the plan below is ready and waiting.
        </p>
      )}

      {/* The 50/15/35 dial ------------------------------------------------ */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">Target split</h2>
          <span className="text-xs text-muted-foreground">
            {overridden ? "Custom for this month" : "Your default split"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {SPEND_GROUPS.map((key) => {
            const g = summary.groups[key];
            return (
              <Link
                key={key}
                href={`/${GROUP_META[key].slug}?month=${month}`}
                className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      aria-hidden
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: `var(--${key})` }}
                    />
                    {GROUP_META[key].label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    target {g.targetPercent}%
                  </span>
                </div>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <Money
                    minor={g.plannedMinor}
                    className="font-heading text-xl font-bold"
                  />
                  <span className="text-xs text-muted-foreground">planned</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <BudgetBar
                    actualMinor={g.actualMinor}
                    plannedMinor={g.plannedMinor}
                    groupKey={key}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>
                      <Money minor={g.actualMinor} /> spent
                    </span>
                    <PlanDelta
                      plannedPercent={g.plannedPercent}
                      targetPercent={g.targetPercent}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Per-group breakdown ---------------------------------------------- */}
      <section className="flex flex-col gap-4">
        {(["needs", "wants", "investments", "income"] as GroupKey[]).map((key) => {
          const g = summary.groups[key];
          const top = [...g.categories]
            .filter((c) => c.plannedMinor > 0 || c.actualMinor > 0)
            .sort((a, b) => b.plannedMinor - a.plannedMinor)
            .slice(0, 4);

          return (
            <div
              key={key}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h3 className="font-heading text-base font-bold">
                    {GROUP_META[key].label}
                  </h3>
                  <p className="truncate text-xs text-muted-foreground">
                    {GROUP_META[key].blurb}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold">
                    <Money minor={g.actualMinor} />
                    <span className="text-muted-foreground"> / </span>
                    <Money minor={g.plannedMinor} tone="muted" className="text-xs" />
                  </div>
                  <Link
                    href={`/${GROUP_META[key].slug}?month=${month}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                  >
                    {g.categories.length} categories
                    <ArrowRight size={11} weight="bold" />
                  </Link>
                </div>
              </div>

              <ul className="divide-y divide-border">
                {top.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                  >
                    <span className="truncate text-muted-foreground">{c.name}</span>
                    <span className="shrink-0 tabular text-xs text-muted-foreground">
                      {formatMoney(c.plannedMinor)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function StatCard({
  label,
  actualMinor,
  plannedMinor,
  tone = "default",
}: {
  label: string;
  actualMinor: number;
  plannedMinor: number;
  tone?: "default" | "auto";
}) {
  const pct = percentOf(actualMinor, plannedMinor);
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-heading text-2xl font-bold">
        <Money minor={actualMinor} tone={tone} />
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        of <Money minor={plannedMinor} tone="muted" /> planned
        {plannedMinor > 0 && <span className="tabular"> · {pct}%</span>}
      </p>
    </div>
  );
}

/** How the plan compares to the target — the sheet's "Ideal vs Planned" gap. */
function PlanDelta({
  plannedPercent,
  targetPercent,
}: {
  plannedPercent: number;
  targetPercent: number;
}) {
  const delta = plannedPercent - targetPercent;
  if (delta === 0) return <span>on target</span>;
  return (
    <span className={cn(delta > 0 && "text-negative")}>
      plan {plannedPercent}% ({delta > 0 ? "+" : ""}
      {delta})
    </span>
  );
}
