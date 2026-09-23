import Link from "next/link";
import { Money } from "@/components/money";
import { PeriodHero } from "@/components/period-hero";
import { percentOf } from "@/lib/money";
import { getYearSummary } from "@/lib/budget";
import { requireUser, getUserPrefs } from "@/lib/auth";
import { formatMonthShort } from "@/lib/dates";
import { MonthlySavings } from "@/components/charts/yearly-insights";

/**
 * Yearly answers "am I building up?" — three totals, one chart of which
 * months were good or bad, and the table that keeps every figure.
 */
export async function YearView({ year }: { year: number }) {
  const user = await requireUser();
  const [summary, { locale }] = await Promise.all([getYearSummary(user.id, year), getUserPrefs()]);

  const months = summary.byMonth.map((m) => ({
    month: m.month,
    income: m.income,
    expense: m.expense,
    saved: m.saved,
    needs: m.needs,
    wants: m.wants,
    investments: m.investments,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* The year in one figure: what you kept. The bar is the share of income
          that stayed, which is the number that actually moves year to year. */}
      <PeriodHero
        label={`Saved in ${year}`}
        amountMinor={summary.totals.saved}
        caption={
          <>
            <Money minor={summary.totals.income} tone="muted" className="font-semibold text-foreground" /> in
            <span aria-hidden className="mx-1.5">·</span>
            <Money minor={summary.totals.expense} tone="muted" className="font-semibold text-foreground" /> out
          </>
        }
        progress={
          summary.totals.income > 0
            ? {
                percent: percentOf(summary.totals.saved, summary.totals.income),
                over: summary.totals.saved < 0,
                note: <>{percentOf(summary.totals.saved, summary.totals.income)}% of income kept</>,
              }
            : undefined
        }
      />

      <MonthlySavings months={months} />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <h2 className="font-heading text-base font-semibold">Month by month</h2>
        </div>
        {/* Phones: one row per month, saved on the right. */}
        <ul className="divide-y divide-border border-t border-border sm:hidden">
          {summary.byMonth.map((m) => {
            const active = m.income || m.expense;
            return (
              <li key={m.month}>
                <Link
                  href={`/?view=month&month=${m.month}`}
                  className={`flex items-center justify-between gap-3 px-4 py-3 active:bg-muted/60 ${active ? "" : "text-muted-foreground/50"}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{formatMonthShort(m.month, locale)}</span>
                    {active ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        <Money minor={m.income} tone="muted" /> in · <Money minor={m.expense} tone="muted" /> spent
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right text-sm font-semibold">
                    {active ? <Money minor={m.saved} tone="auto" /> : <span className="text-xs">No activity</span>}
                    {active ? <span className="block text-[11px] font-normal text-muted-foreground">saved</span> : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <table className="hidden w-full text-sm sm:table">
          <thead>
            <tr className="border-y border-border text-xs text-muted-foreground">
              <th className="px-5 py-3 text-left font-medium sm:px-6">Month</th>
              <th className="px-3 py-3 text-right font-medium">Income</th>
              <th className="px-3 py-3 text-right font-medium">Spent</th>
              <th className="px-5 py-3 text-right font-medium sm:px-6">Saved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {summary.byMonth.map((m) => {
              const active = m.income || m.expense;
              return (
                <tr key={m.month} className={active ? "" : "text-muted-foreground/50"}>
                  <td className="px-5 py-3.5 whitespace-nowrap sm:px-6">
                    <Link href={`/?view=month&month=${m.month}`} className="hover:underline">
                      {formatMonthShort(m.month, locale)}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-right">{active ? <Money minor={m.income} /> : <span className="sr-only">No activity</span>}</td>
                  <td className="px-3 py-3.5 text-right">{active ? <Money minor={m.expense} /> : <span className="sr-only">No activity</span>}</td>
                  <td className="px-5 py-3.5 text-right sm:px-6">{active ? <Money minor={m.saved} tone="auto" /> : <span className="sr-only">No activity</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
