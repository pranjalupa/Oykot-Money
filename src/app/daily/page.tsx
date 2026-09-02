import { Money } from "@/components/money";
import { MonthSwitcher } from "@/components/month-switcher";
import { TransactionDialog } from "@/components/transaction-dialog";
import { TransactionList } from "@/components/transaction-list";
import {
  currentMonth,
  getDailyView,
  isValidMonth,
  listAccounts,
  listCategories,
  listTransactions,
  today,
} from "@/lib/budget";
import { monthBounds } from "@/lib/targets";
import { requireUser } from "@/lib/auth";
import { prepareMonth } from "@/lib/month-setup";

export const dynamic = "force-dynamic";

export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : currentMonth();
  const { start, end } = monthBounds(month);

  await prepareMonth(user.id, month);

  const [daily, txs, accounts, categories] = await Promise.all([
    getDailyView(user.id, month),
    listTransactions(user.id, { from: start, to: end, limit: 300 }),
    listAccounts(user.id),
    listCategories(user.id),
  ]);

  const busiest = daily.days.reduce((max, d) => Math.max(max, d.totalMinor), 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Daily</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Day by day, and what&rsquo;s safe to spend from here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MonthSwitcher month={month} basePath="/daily" />
          <TransactionDialog
            accounts={accounts}
            categories={categories}
            defaultDate={today()}
          />
        </div>
      </header>

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
            Left in plan
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
            of <Money minor={daily.dailyBudget} tone="muted" /> planned
          </p>
        </div>
      </section>

      {daily.days.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-heading text-base font-bold">By day</h2>
          <ul className="flex flex-col gap-1.5">
            {daily.days.map((d) => (
              <li key={d.date} className="flex items-center gap-3">
                <span className="tabular w-24 shrink-0 text-xs text-muted-foreground">
                  {new Date(d.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-needs"
                    style={{
                      width: `${busiest ? (d.totalMinor / busiest) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs font-medium">
                  <Money minor={d.totalMinor} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold">Transactions</h2>
          <p className="text-xs text-muted-foreground">
            Everything logged this month.
          </p>
        </div>
        <TransactionList
          transactions={txs}
          categories={categories}
          emptyNote="Nothing logged this month yet."
        />
      </section>
    </div>
  );
}
