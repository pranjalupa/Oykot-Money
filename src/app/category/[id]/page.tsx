import { notFound } from "next/navigation";
import Link from "next/link";
import { currentMonthIn, todayIn } from "@/lib/dates";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { CategoryIcon } from "@/components/category-icon";
import { TransactionList } from "@/components/transaction-list";
import { BudgetSummary, PeriodTrend } from "@/components/charts/detail-insights";
import { groupColor } from "@/lib/chart-colors";
import { TransactionDialog } from "@/components/transaction-dialog";
import { MonthSwitcher } from "@/components/month-switcher";
import { DeleteCategoryButton } from "@/components/category-manager";
import {
  getMonthSummary,
  GROUP_META,
  isValidMonth,
  listAccounts,
  listCategories,
  listTransactions,
  getCategoryTrend,
} from "@/lib/budget";
import { monthBounds } from "@/lib/targets";
import { formatMoney } from "@/lib/money";
import { Money } from "@/components/money";
import { requireUser, getUserCurrency, getUserPrefs } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const { timeZone } = await getUserPrefs();

  const [cat] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);

  if (!cat) notFound();

  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonthIn(timeZone);
  const { start, end } = monthBounds(month);

  const [summary, txs, accounts, allCategories, currency, trend] = await Promise.all([
    getMonthSummary(user.id, month),
    listTransactions(user.id, { from: start, to: end, categoryId: id }),
    listAccounts(user.id),
    listCategories(user.id),
    getUserCurrency(),
    getCategoryTrend(user.id, id, month),
  ]);

  // Find this category in the assembled tree — it may be a child.
  const inGroup = summary.groups[cat.groupKey].categories;
  const row =
    inGroup.find((c) => c.id === id) ??
    inGroup.flatMap((c) => c.children).find((c) => c.id === id);

  const planned = row?.plannedMinor ?? 0;
  const actual = row?.actualMinor ?? 0;
  const assumed = (row?.assumedMinor ?? 0) > 0;
  const isIncome = cat.groupKey === "income";

  const byPerson = cat.systemKey
    ? [
        ...txs.reduce((m, t) => {
          const who = t.counterAccountName ?? "Someone";
          return m.set(who, (m.get(who) ?? 0) + t.amountMinor);
        }, new Map<string, number>()),
      ].sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${cat.groupKey}?month=${month}`}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} weight="bold" />
        {GROUP_META[cat.groupKey].label}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CategoryIcon
            name={cat.icon}
            size={20}
            className="size-11 shrink-0 rounded-lg bg-muted text-muted-foreground"
          />
          <div>
            <h1 className="font-heading text-2xl font-bold">{cat.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground max-sm:sr-only">
              {GROUP_META[cat.groupKey].label}
              {cat.archived && " · retired"}
              {cat.systemKey && " · filled in by You gave / You got on people"}
            </p>
          </div>
        </div>
        {/* Phones: the month control takes the row, and Add goes — the tab
            bar's "+" is on screen and lands in this category anyway. */}
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <MonthSwitcher month={month} basePath={`/category/${id}`} />
          <div className="contents max-sm:hidden">
            <TransactionDialog
              accounts={accounts}
              categories={allCategories}
              defaultDate={todayIn(timeZone)}
              defaultCategoryId={id}
            />
          </div>
          {!cat.systemKey && (
            <DeleteCategoryButton
              cat={{ id: cat.id, name: cat.name }}
              redirectTo={`/${cat.groupKey}?month=${month}`}
            />
          )}
        </div>
      </header>

      <BudgetSummary
        spentMinor={actual}
        plannedMinor={planned}
        isIncome={isIncome}
        footnote={assumed ? "includes assumed spend" : undefined}
      />

      <PeriodTrend title="Last six months" points={trend} color={groupColor(cat.groupKey)} isIncome={isIncome} />

      {/* A loan category splits by person instead of by sub-category: the
          person is already on every entry, so there's nothing to set up. */}
      {byPerson.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-heading text-base font-bold">By person</h2>
          </div>
          <ul className="divide-y divide-border">
            {byPerson.map(([name, minor]) => (
              <li key={name} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-medium">{name}</span>
                <Money minor={minor} className="font-semibold" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold">Transactions</h2>
        </div>
        <TransactionList
          transactions={txs}
          accounts={accounts}
          categories={allCategories}
          emptyNote={
            assumed
              ? `Nothing logged. The ${formatMoney(actual, { currency })} above is the budgeted amount, counted automatically. Add a transaction and the real figure replaces it.`
              : "Nothing in this category this month."
          }
        />
      </section>
    </div>
  );
}
