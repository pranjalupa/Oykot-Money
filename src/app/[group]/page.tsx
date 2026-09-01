import { notFound } from "next/navigation";
import { Money, BudgetBar } from "@/components/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { CategoryList } from "@/components/category-list";
import { TransactionDialog } from "@/components/transaction-dialog";
import { NewCategoryDialog } from "@/components/new-category-dialog";
import {
  currentMonth,
  getMonthSummary,
  GROUP_META,
  isValidMonth,
  listAccounts,
  listCategories,
  today,
} from "@/lib/budget";
import { requireUser } from "@/lib/auth";
import { GROUP_KEYS, type GroupKey } from "@/db/schema";

export const dynamic = "force-dynamic";

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

  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();

  const [summary, accounts, categories] = await Promise.all([
    getMonthSummary(user.id, month),
    listAccounts(user.id),
    listCategories(user.id),
  ]);

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
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} basePath={`/${groupKey}`} />
          <TransactionDialog
            accounts={accounts}
            categories={categories}
            defaultDate={today()}
          />
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
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
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Categories</p>
          <NewCategoryDialog
            groupKey={groupKey}
            parents={g.categories.map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>
        <CategoryList
          categories={g.categories}
          groupKey={groupKey}
          month={month}
          emptyNote="No categories in this group yet — add your first one."
        />
      </section>

      <p className="accent-note text-center text-xs text-muted-foreground">
        Tap any planned figure to change it.
      </p>
    </div>
  );
}
