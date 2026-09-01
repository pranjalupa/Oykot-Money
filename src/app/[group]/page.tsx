import { notFound } from "next/navigation";
import { Money, BudgetBar } from "@/components/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { CategoryList } from "@/components/category-list";
import {
  currentMonth,
  getMonthSummary,
  GROUP_META,
} from "@/lib/budget";
import { GROUP_KEYS, type GroupKey } from "@/db/schema";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return GROUP_KEYS.map((group) => ({ group }));
}

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ group: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { group } = await params;
  if (!(GROUP_KEYS as readonly string[]).includes(group)) notFound();
  const groupKey = group as GroupKey;

  const { month: monthParam } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? "")
    ? monthParam!
    : currentMonth();

  const summary = await getMonthSummary(month);
  const g = summary.groups[groupKey];
  const meta = GROUP_META[groupKey];
  const isIncome = groupKey === "income";
  const diff = g.plannedMinor - g.actualMinor;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2.5 font-heading text-2xl font-bold">
            <span
              aria-hidden
              className="size-3 rounded-full"
              style={{ backgroundColor: `var(--${groupKey})` }}
            />
            {meta.label}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
        <MonthSwitcher month={month} basePath={`/${groupKey}`} />
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isIncome ? "Received" : "Spent"}
            </p>
            <p className="mt-1 font-heading text-3xl font-bold">
              <Money minor={g.actualMinor} />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              of <Money minor={g.plannedMinor} tone="muted" /> planned
            </p>
          </div>

          {!isIncome && (
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {diff >= 0 ? "Left to spend" : "Over plan"}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <Money
                  minor={Math.abs(diff)}
                  tone={diff >= 0 ? "default" : "negative"}
                />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                target {g.targetPercent}% · plan {g.plannedPercent}% of income
              </p>
            </div>
          )}
        </div>

        <BudgetBar
          actualMinor={g.actualMinor}
          plannedMinor={g.plannedMinor}
          groupKey={groupKey}
          className="mt-4 h-2"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <CategoryList
          categories={g.categories}
          groupKey={groupKey}
          emptyNote="No categories in this group yet."
        />
      </section>
    </div>
  );
}
