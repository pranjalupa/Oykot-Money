import Link from "next/link";
import { Money } from "@/components/money";
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
      <section className="grid gap-4 sm:grid-cols-3">
        <Stat label="Income" minor={summary.totals.income} />
        <Stat label="Spent" minor={summary.totals.expense} />
        <Stat label="Saved" minor={summary.totals.saved} tone="auto" />
      </section>

      <MonthlySavings
        months={months}
        incomeTotal={summary.totals.income}
        savedTotal={summary.totals.saved}
      />

      <section className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="px-5 pt-5 pb-3 sm:px-6">
          <h2 className="font-heading text-base font-semibold">Month by month</h2>
        </div>
        <table className="w-full text-sm">
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
                  <td className="px-3 py-3.5 text-right">{active ? <Money minor={m.income} /> : "—"}</td>
                  <td className="px-3 py-3.5 text-right">{active ? <Money minor={m.expense} /> : "—"}</td>
                  <td className="px-5 py-3.5 text-right sm:px-6">{active ? <Money minor={m.saved} tone="auto" /> : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, minor, tone = "default" }: { label: string; minor: number; tone?: "default" | "auto" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-heading text-2xl font-bold">
        <Money minor={minor} tone={tone} />
      </p>
    </div>
  );
}
