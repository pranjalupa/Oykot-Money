import Link from "next/link";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { getYearSummary } from "@/lib/budget";
import { requireUser } from "@/lib/auth";
import { formatCompact, percentOf } from "@/lib/money";

export const dynamic = "force-dynamic";

const GROUPS = [
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
  { key: "investments", label: "Investments" },
] as const;

export default async function YearPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const { year: yearParam } = await searchParams;
  const parsed = Number(yearParam);
  const year =
    Number.isInteger(parsed) && parsed > 2000 && parsed < 2200
      ? parsed
      : new Date().getFullYear();

  const summary = await getYearSummary(user.id, year);
  const peak = Math.max(
    ...summary.byMonth.map((m) => Math.max(m.expense, m.income)),
    1,
  );

  const savingsRate = percentOf(summary.totals.saved, summary.totals.income);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">{year}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {summary.activeMonths
              ? `${summary.activeMonths} month${summary.activeMonths === 1 ? "" : "s"} with activity.`
              : "No activity logged this year yet."}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={`/year?year=${year - 1}`}
            aria-label={`Go to ${year - 1}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CaretLeft size={16} weight="bold" />
          </Link>
          <span className="tabular min-w-14 text-center text-sm font-medium">
            {year}
          </span>
          <Link
            href={`/year?year=${year + 1}`}
            aria-label={`Go to ${year + 1}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <CaretRight size={16} weight="bold" />
          </Link>
        </div>
      </header>

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

      {/* Month-by-month ---------------------------------------------------- */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-heading text-base font-bold">Month by month</h2>
          <p className="text-xs text-muted-foreground">
            Bars are spending, split by group. The line is income.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2 text-left font-semibold">Month</th>
                <th className="px-4 py-2 text-left font-semibold">Spending</th>
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
                        {new Date(`${m.month}-01`).toLocaleDateString("en-IN", {
                          month: "short",
                        })}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex h-2.5 w-full min-w-24 overflow-hidden rounded-full bg-muted">
                        {GROUPS.map((g) => (
                          <div
                            key={g.key}
                            title={`${g.label}: ${formatCompact(m[g.key])}`}
                            style={{
                              width: `${(m[g.key] / peak) * 100}%`,
                              backgroundColor: `var(--${g.key})`,
                            }}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">
                      {active ? formatCompact(m.expense) : "—"}
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">
                      {active ? formatCompact(m.income) : "—"}
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
