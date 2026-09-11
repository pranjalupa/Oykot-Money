import Link from "next/link";
import { Money } from "@/components/money";
import { getYearSummary } from "@/lib/budget";
import { requireUser, getUserPrefs } from "@/lib/auth";
import { formatMonthShort } from "@/lib/dates";
import { IncomeExpenseChart, SavingsChart } from "@/components/charts/yearly-charts";
import { formatCompact, percentOf } from "@/lib/money";

const GROUPS = [
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
  { key: "investments", label: "Investments" },
] as const;

export async function YearView({ year }: { year: number }) {
  const user = await requireUser();
  const [summary, { currency, locale }] = await Promise.all([
    getYearSummary(user.id, year),
    getUserPrefs(),
  ]);
  const peak = Math.max(
    ...summary.byMonth.map((m) => Math.max(m.expense, m.income)),
    1,
  );

  const savingsRate = percentOf(summary.totals.saved, summary.totals.income);

  const chartMonths = summary.byMonth.map((m) => ({
    month: m.month,
    income: m.income,
    expense: m.expense,
    saved: m.saved,
  }));

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="Income" minor={summary.totals.income} />
        <Stat label="Spent" minor={summary.totals.expense} />
        <Stat label="Saved" minor={summary.totals.saved} tone="auto" />
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            Savings rate
          </p>
          <p className="tabular mt-1.5 font-heading text-2xl font-bold">
            {savingsRate}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">of income kept</p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <IncomeExpenseChart months={chartMonths} />
        <SavingsChart months={chartMonths} />
      </div>

      {/* Month-by-month ---------------------------------------------------- */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold">Month by month</h2>
          <p className="text-xs text-muted-foreground">
            Bars are spending, split by group. The line is income.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 text-left font-semibold">Month</th>
                <th className="hidden px-4 py-2 text-left font-semibold sm:table-cell">Spending</th>
                <th className="px-4 py-2 text-right font-semibold">Spent</th>
                <th className="px-4 py-2 text-right font-semibold">Income</th>
                <th className="px-4 py-2 text-right font-semibold">Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {summary.byMonth.map((m) => {
                const active = m.income || m.expense;
                return (
                  <tr
                    key={m.month}
                    className={active ? "" : "text-muted-foreground/50"}
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/?month=${m.month}`}
                        className="hover:underline"
                      >
                        {formatMonthShort(m.month, locale)}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <div className="flex h-2.5 w-full min-w-24 overflow-hidden rounded-full bg-muted">
                        {GROUPS.map((g) => (
                          <div
                            key={g.key}
                            title={`${g.label}: ${formatCompact(m[g.key], currency)}`}
                            style={{
                              width: `${(m[g.key] / peak) * 100}%`,
                              backgroundColor: `var(--${g.key})`,
                            }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">
                      {active ? formatCompact(m.expense, currency) : "—"}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">
                      {active ? formatCompact(m.income, currency) : "—"}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">
                      {active ? (
                        <Money minor={m.saved} tone="auto" />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {GROUPS.map((g) => (
          <div key={g.key} className="rounded-xl border border-border bg-card p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span
                aria-hidden
                className="size-2.5 rounded-full"
                style={{ backgroundColor: `var(--${g.key})` }}
              />
              {g.label}
            </p>
            <p className="mt-2 font-heading text-xl font-bold">
              <Money minor={summary.totals[g.key]} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {percentOf(summary.totals[g.key], summary.totals.income)}% of income
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}

function Stat({
  label,
  minor,
  tone = "default",
}: {
  label: string;
  minor: number;
  tone?: "default" | "auto";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-heading text-2xl font-bold">
        <Money minor={minor} tone={tone} />
      </p>
    </div>
  );
}
