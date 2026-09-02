import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { Money, BudgetBar } from "@/components/money";
import { CopyPlanButton } from "@/components/copy-plan-button";
import {
  getMonthSummary,
  GROUP_META,
  hasMonthOverride,
  SPEND_GROUPS,
} from "@/lib/budget";
import { requireUser, ensureUserSetup } from "@/lib/auth";
import { prepareMonth } from "@/lib/month-setup";
import { formatMoney, percentOf } from "@/lib/money";
import type { GroupKey } from "@/db/schema";
import { cn } from "@/lib/utils";

export async function MonthView({ month }: { month: string }) {
  const user = await requireUser();
  await ensureUserSetup(user.id);


  await prepareMonth(user.id, month);

  const [summary, overridden] = await Promise.all([
    getMonthSummary(user.id, month),
    hasMonthOverride(user.id, month),
  ]);

  const nothingPlanned = summary.plannedExpense === 0 && summary.plannedIncome === 0;

  return (
    <div className="flex flex-col gap-8">
      {nothingPlanned && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="font-heading text-base font-bold">Nothing planned yet</p>
          <p className="accent-note mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Set what you expect to spend in each category, and the rest of the app
            starts working.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {/* buttonVariants, not hand-rolled padding — a raw link next to a
                real Button is how the two ended up different heights. */}
            <Link
              href={`/needs?month=${month}`}
              className={buttonVariants({ size: "sm" })}
            >
              Set your plan
            </Link>
            <CopyPlanButton month={month} />
          </div>
        </div>
      )}

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

      {/* The target dial --------------------------------------------------- */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-lg font-bold">Target split</h2>
          <Link
            href="/settings"
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {overridden ? "Custom for this month" : "Your default split"}
          </Link>
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
                    <Money
                      minor={g.plannedMinor}
                      tone="muted"
                      className="text-xs"
                    />
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

              {top.length > 0 && (
                <ul className="divide-y divide-border">
                  {top.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                    >
                      <span className="truncate text-muted-foreground">
                        {c.name}
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {formatMoney(c.actualMinor)} / {formatMoney(c.plannedMinor)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
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
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
  if (plannedPercent === 0) return <span>not planned</span>;
  if (delta === 0) return <span>on target</span>;
  return (
    <span className={cn(delta > 0 && "text-negative")}>
      plan {plannedPercent}% ({delta > 0 ? "+" : ""}
      {delta})
    </span>
  );
}
