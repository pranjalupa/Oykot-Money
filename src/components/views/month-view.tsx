import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Money } from "@/components/money";
import { CopyPlanButton } from "@/components/copy-plan-button";
import { TargetEditor } from "@/components/target-editor";
import {
  IncomeSplit,
  TopCategories,
} from "@/components/charts/monthly-insights";
import {
  getMonthSummary,
  getTargets,
  GROUP_META,
  hasMonthOverride,
  SPEND_GROUPS,
} from "@/lib/budget";
import { requireUser, ensureUserSetup } from "@/lib/auth";
import { prepareMonth } from "@/lib/month-setup";
import { percentOf } from "@/lib/money";

/**
 * Monthly answers "where did it go, and was that the plan?" — the income
 * split against its targets in one card, then the categories that took the most.
 */
export async function MonthView({ month }: { month: string }) {
  const user = await requireUser();
  await ensureUserSetup(user.id);
  await prepareMonth(user.id, month);

  const [summary, overridden, targets] = await Promise.all([
    getMonthSummary(user.id, month),
    hasMonthOverride(user.id, month),
    getTargets(user.id, month),
  ]);

  const nothingPlanned = summary.plannedExpense === 0 && summary.plannedIncome === 0;
  const g = summary.groups;

  // Only what the charts draw crosses to the client — not every category row.
  const categories = SPEND_GROUPS.flatMap((k) =>
    g[k].categories.map((c) => ({
      id: c.id,
      name: c.name,
      groupKey: k,
      plannedMinor: c.plannedMinor,
      actualMinor: c.actualMinor,
      href: `/category/${c.id}?month=${month}`,
    })),
  );
  const targetRows = SPEND_GROUPS.map((k) => ({
    key: k,
    href: `/${GROUP_META[k].slug}?month=${month}`,
    targetPercent: g[k].targetPercent,
    plannedPercent: g[k].plannedPercent,
    actualPercent: g[k].actualPercent,
    plannedMinor: g[k].plannedMinor,
    actualMinor: g[k].actualMinor,
  }));

  return (
    <div className="flex flex-col gap-6">
      {nothingPlanned && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="font-heading text-base font-bold">Nothing budgeted yet</p>
          <p className="accent-note mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Set what you expect to spend in each category, and the rest of the app
            starts working.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/needs?month=${month}`} className={buttonVariants({ size: "sm" })}>
              Set your budget
            </Link>
            <CopyPlanButton month={month} />
          </div>
        </div>
      )}

      <section className="grid grid-cols-3 gap-2 sm:gap-4">
        <StatCard label="Income" actualMinor={summary.actualIncome} plannedMinor={summary.plannedIncome} />
        <StatCard label="Expenses" actualMinor={summary.actualExpense} plannedMinor={summary.plannedExpense} />
        <StatCard label="Saved this month" actualMinor={summary.actualSaved} plannedMinor={summary.plannedSaved} tone="auto" />
      </section>

      <IncomeSplit
          incomeMinor={summary.actualIncome > 0 ? summary.actualIncome : summary.plannedIncome}
          rows={targetRows}
          custom={overridden}
          editor={
            // Edited here rather than in Settings: the split only means
            // something next to the budget it shapes. Keyed on the month so
            // switching months remounts it with that month's values.
            <details className="group/split">
              <summary className="cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground">
                <span className="group-open/split:hidden">Adjust split</span>
                <span className="hidden group-open/split:inline">Hide</span>
              </summary>
              <div className="pt-4">
                <TargetEditor key={`${month}-${overridden}`} targets={targets} month={month} hasOverride={overridden} />
              </div>
            </details>
          }
        />

      <TopCategories rows={categories} />
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
    // Three across even on a phone: compact padding and type below sm.
    <div className="min-w-0 rounded-2xl border border-border bg-card p-3 sm:p-5">
      <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</p>
      <p className="mt-1 truncate font-heading text-base font-bold sm:mt-1.5 sm:text-2xl">
        <Money minor={actualMinor} tone={tone} />
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:mt-1 sm:text-xs">
        of <Money minor={plannedMinor} tone="muted" />
        <span className="hidden sm:inline"> budgeted</span>
        {plannedMinor > 0 && <span className="tabular hidden sm:inline"> · {pct}%</span>}
      </p>
    </div>
  );
}
