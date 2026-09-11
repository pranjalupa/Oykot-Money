import { TransactionBrowser } from "@/components/transaction-browser";
import {
  getDailyView,
  listAccounts,
  listCategories,
  listTransactions,
} from "@/lib/budget";
import { monthBounds } from "@/lib/targets";
import { requireUser, getUserPrefs } from "@/lib/auth";
import { currentMonthIn, dayOfMonthIn, todayIn } from "@/lib/dates";
import { DailyHero, PaceCard, SpendingCalendar } from "@/components/charts/daily-insights";
import { prepareMonth } from "@/lib/month-setup";

/**
 * Daily answers "can I spend this today?" first, then "am I on pace?", then
 * "which days were expensive?" — each with the picture that fits it.
 */
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

  // Actuals run up to today this month, the whole month in the past, and not
  // at all for a month that hasn't started.
  const throughDay = daily.isCurrentMonth
    ? dayOfMonthIn(timeZone)
    : month < currentMonthIn(timeZone)
      ? 31
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <DailyHero
        month={month}
        budgetMinor={daily.dailyBudget}
        spentMinor={daily.dailySpent}
        remainingMinor={daily.remaining}
        safePerDayMinor={daily.safePerDay}
        daysLeft={daily.daysLeft}
        isCurrentMonth={daily.isCurrentMonth}
        throughDay={throughDay}
      />

      <PaceCard
        month={month}
        days={daily.days}
        budgetMinor={daily.dailyBudget}
        spentMinor={daily.dailySpent}
        throughDay={throughDay}
      />

      <SpendingCalendar month={month} days={daily.days} today={todayIn(timeZone)} />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <h2 className="font-heading text-base font-semibold">Transactions</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Everything logged this month.</p>
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
