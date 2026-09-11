import { Money } from "@/components/money";
import { TransactionBrowser } from "@/components/transaction-browser";
import {
  getDailyView,
  listAccounts,
  listCategories,
  listTransactions,
} from "@/lib/budget";
import { monthBounds } from "@/lib/targets";
import { requireUser, getUserPrefs } from "@/lib/auth";
import { currentMonthIn, dayOfMonthIn } from "@/lib/dates";
import { DailySpendChart, SpendPaceChart } from "@/components/charts/daily-charts";
import { prepareMonth } from "@/lib/month-setup";

export async function DailyView({ month }: { month: string }) {
  const user = await requireUser();
  const { timeZone } = await getUserPrefs();
  const { start, end } = monthBounds(month);

  await prepareMonth(user.id, month);

  const [daily, txs, accounts, categories] = await Promise.all([
    getDailyView(user.id, month, timeZone),
    listTransactions(user.id, { from: start, to: end, limit: 300 }),
    listAccounts(user.id),
    listCategories(user.id),
  ]);


  // Draw actuals up to today this month, the whole month in the past, and
  // nothing for a month that hasn't started.
  const throughDay = daily.isCurrentMonth
    ? dayOfMonthIn(timeZone)
    : month < currentMonthIn(timeZone)
      ? 31
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Safe to spend / day
          </p>
          <p className="mt-1.5 font-heading text-2xl font-bold">
            <Money minor={daily.safePerDay} tone={daily.remaining > 0 ? "default" : "negative"} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {daily.isCurrentMonth
              ? `${daily.daysLeft} day${daily.daysLeft === 1 ? "" : "s"} left`
              : "whole month"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Remaining
          </p>
          <p className="mt-1.5 font-heading text-2xl font-bold">
            <Money minor={daily.remaining} tone="auto" />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Needs + Wants only
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Spent this month
          </p>
          <p className="mt-1.5 font-heading text-2xl font-bold">
            <Money minor={daily.dailySpent} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            of <Money minor={daily.dailyBudget} tone="muted" /> budgeted
          </p>
        </div>
      </section>

      <SpendPaceChart
        month={month}
        days={daily.days}
        budgetMinor={daily.dailyBudget}
        spentMinor={daily.dailySpent}
        throughDay={throughDay}
      />

      <DailySpendChart month={month} days={daily.days} budgetMinor={daily.dailyBudget} />

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold">Transactions</h2>
          <p className="text-xs text-muted-foreground">
            Everything logged this month.
          </p>
        </div>
        <TransactionBrowser
          transactions={txs}
          accounts={accounts}
          categories={categories}
          emptyNote="Nothing logged this month yet."
        />
      </section>
    </div>
  );
}
