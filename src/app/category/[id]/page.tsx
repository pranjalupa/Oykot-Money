import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { Money, BudgetBar } from "@/components/money";
import { CategoryIcon } from "@/components/category-icon";
import { TransactionList } from "@/components/transaction-list";
import { TransactionDialog } from "@/components/transaction-dialog";
import { MonthSwitcher } from "@/components/month-switcher";
import {
  currentMonth,
  getMonthSummary,
  GROUP_META,
  isValidMonth,
  listAccounts,
  listCategories,
  listTransactions,
  today,
} from "@/lib/budget";
import { monthBounds } from "@/lib/targets";
import { requireUser } from "@/lib/auth";

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

  const [cat] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);

  if (!cat) notFound();

  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();
  const { start, end } = monthBounds(month);

  const [summary, txs, accounts, allCategories] = await Promise.all([
    getMonthSummary(user.id, month),
    listTransactions(user.id, { from: start, to: end, categoryId: id }),
    listAccounts(user.id),
    listCategories(user.id),
  ]);

  // Find this category in the assembled tree — it may be a child.
  const inGroup = summary.groups[cat.groupKey].categories;
  const row =
    inGroup.find((c) => c.id === id) ??
    inGroup.flatMap((c) => c.children).find((c) => c.id === id);

  const planned = row?.plannedMinor ?? 0;
  const actual = row?.actualMinor ?? 0;
  const diff = planned - actual;
  const isIncome = cat.groupKey === "income";

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
            <p className="mt-0.5 text-sm text-muted-foreground">
              {GROUP_META[cat.groupKey].label}
              {cat.archived && " · retired"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} basePath={`/category/${id}`} />
          <TransactionDialog
            accounts={accounts}
            categories={allCategories}
            defaultDate={today()}
            defaultCategoryId={id}
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
              <Money minor={actual} />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              of <Money minor={planned} tone="muted" /> planned
            </p>
          </div>
          {!isIncome && planned > 0 && (
            <div className="text-right">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                {diff >= 0 ? "Left" : "Over"}
              </p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <Money
                  minor={Math.abs(diff)}
                  tone={diff >= 0 ? "default" : "negative"}
                />
              </p>
            </div>
          )}
        </div>
        {planned > 0 && (
          <BudgetBar
            actualMinor={actual}
            plannedMinor={planned}
            groupKey={cat.groupKey}
            className="mt-4 h-2"
          />
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold">Transactions</h2>
        </div>
        <TransactionList
          transactions={txs}
          categories={allCategories}
          emptyNote="Nothing in this category this month."
        />
      </section>
    </div>
  );
}
