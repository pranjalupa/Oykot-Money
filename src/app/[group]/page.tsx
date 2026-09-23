import { currentMonthIn, todayIn } from "@/lib/dates";
import { notFound } from "next/navigation";
import { MonthSwitcher } from "@/components/month-switcher";
import { CategoryList } from "@/components/category-list";
import { BudgetSummary, PeriodTrend } from "@/components/charts/detail-insights";
import { groupColor } from "@/lib/chart-colors";
import { TransactionDialog } from "@/components/transaction-dialog";
import { NewCategoryDialog } from "@/components/new-category-dialog";
import { FlowGuide } from "@/components/flow-guide";
import {
  getMonthSummary,
  getGroupTrend,
  GROUP_META,
  isValidMonth,
  listAccounts,
  listCategories,
} from "@/lib/budget";
import { requireUser, getUserPrefs } from "@/lib/auth";
import { prepareMonth } from "@/lib/month-setup";
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
  const { timeZone } = await getUserPrefs();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonthIn(timeZone);

  await prepareMonth(user.id, month);

  const [summary, accounts, categories, trend] = await Promise.all([
    getMonthSummary(user.id, month),
    listAccounts(user.id),
    listCategories(user.id),
    getGroupTrend(user.id, groupKey, month),
  ]);

  const g = summary.groups[groupKey];
  const meta = GROUP_META[groupKey];
  const isIncome = groupKey === "income";

  return (
    <div className="flex flex-col gap-6">
      {/* Same rule as Home on a phone: the name stays, the sentence and the
          duplicate Add button don't — the tab bar's "+" is always there. */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{meta.label}</h1>
          <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">{meta.blurb}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <MonthSwitcher month={month} basePath={`/${groupKey}`} />
          <div className="contents max-sm:hidden">
            <TransactionDialog
              accounts={accounts}
              categories={categories}
              defaultDate={todayIn(timeZone)}
            />
          </div>
        </div>
      </header>

      <FlowGuide id="group" />

      <BudgetSummary
        spentMinor={g.actualMinor}
        plannedMinor={g.plannedMinor}
        isIncome={isIncome}
        footnote={isIncome ? undefined : `target ${g.targetPercent}% of income`}
      />

      <PeriodTrend title="Last six months" points={trend} color={groupColor(groupKey)} isIncome={isIncome} />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
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
          emptyNote="No categories in this group yet. Add your first one."
        />
      </section>

      <p className="accent-note text-center text-xs text-muted-foreground">
        Tap any planned figure to change it.
      </p>
    </div>
  );
}
