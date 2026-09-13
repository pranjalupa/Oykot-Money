"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { LineTrend } from "@/components/charts/line-trend";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatMoney } from "@/lib/money";
import { formatDay } from "@/lib/dates";

type Day = { date: string; totalMinor: number };
const iso = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;
const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Where spending stands against a straight line from nothing to the budget. */
function pace(budget: number, spent: number, throughDay: number, last: number) {
  if (budget <= 0 || throughDay <= 0) return null;
  const expected = Math.round((budget * Math.min(throughDay, last)) / last);
  return { expected, diff: expected - spent };
}

/**
 * The question Daily exists to answer: how much can I spend today?
 *
 * One number, one bar, one line. A ring around a percentage said nothing the
 * percentage didn't, and a grid of four stats beside the number repeated it.
 */
export function DailyHero({
  month,
  budgetMinor,
  spentMinor,
  remainingMinor,
  safePerDayMinor,
  daysLeft,
  isCurrentMonth,
  throughDay,
}: {
  month: string;
  budgetMinor: number;
  spentMinor: number;
  remainingMinor: number;
  safePerDayMinor: number;
  daysLeft: number;
  isCurrentMonth: boolean;
  throughDay: number;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const used = budgetMinor > 0 ? Math.round((spentMinor / budgetMinor) * 100) : 0;
  const over = remainingMinor < 0;
  const p = pace(budgetMinor, spentMinor, throughDay, daysIn(month));

  // One number that answers the question, one bar for how much is gone, one
  // line of context. The four stat boxes that used to sit beside it said the
  // same thing four ways.
  const context = [
    isCurrentMonth ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : `${daysLeft} days in the month`,
    p ? (p.diff >= 0 ? `${money(p.diff)} under pace` : `${money(-p.diff)} over pace`) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <p className="text-sm text-muted-foreground">{isCurrentMonth ? "Safe to spend today" : "Per day"}</p>
      <p className="mt-1 font-heading text-5xl font-bold tracking-tight">
        <Money minor={safePerDayMinor} tone={over ? "negative" : "default"} />
        <span className="ml-1.5 font-sans text-base font-medium tracking-normal text-muted-foreground">/ day</span>
      </p>

      {budgetMinor > 0 ? (
        <>
          <div
            role="progressbar"
            aria-label="Needs and Wants budget used"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-6 h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full ${over ? "bg-negative" : "bg-primary"}`}
              style={{ width: `${Math.min(used, 100)}%` }}
            />
          </div>
          <p className="mt-2.5 flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
            <span>
              <Money minor={spentMinor} className="font-semibold" />{" "}
              <span className="text-muted-foreground">spent of {money(budgetMinor)}</span>
            </span>
            <span>
              <Money minor={Math.abs(remainingMinor)} tone={over ? "negative" : "default"} className="font-semibold" />{" "}
              <span className="text-muted-foreground">{over ? "over" : "left"}</span>
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{context} · Needs and Wants</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No Needs or Wants budget set for this month.</p>
      )}
    </section>
  );
}

/**
 * Spending so far against the budget's even pace. Fixed costs counted as
 * assumed-spent have no date, so they're counted from day one.
 *
 * Daily's only chart: the transaction list underneath already breaks the
 * month down day by day, so what a chart can add is the shape — whether the
 * gap to the budget line is opening or closing.
 */
export function PaceCard({
  month,
  days,
  budgetMinor,
  spentMinor,
  throughDay,
}: {
  month: string;
  days: Day[];
  budgetMinor: number;
  spentMinor: number;
  throughDay: number;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const last = daysIn(month);

  if (budgetMinor <= 0) {
    return (
      <ChartCard title="Spending pace">
        <p className="py-12 text-center text-sm text-muted-foreground">
          Set a budget for Needs and Wants to see whether you&rsquo;re on pace.
        </p>
      </ChartCard>
    );
  }

  const byDate = new Map(days.map((d) => [d.date, d.totalMinor]));
  const assumed = Math.max(0, spentMinor - days.reduce((s, d) => s + d.totalMinor, 0));
  const cumulative: number[] = [];
  for (let d = 1; d <= last; d++) cumulative.push((cumulative[d - 2] ?? assumed) + (byDate.get(iso(month, d)) ?? 0));
  const data = cumulative.map((total, i) => ({
    label: String(i + 1),
    title: formatDay(iso(month, i + 1), locale),
    value: i + 1 <= throughDay ? total : null,
    reference: Math.round((budgetMinor * (i + 1)) / last),
  }));

  return (
    <ChartCard
      title="Spending pace"
      legend={[
        { label: "Spent so far", color: "var(--primary)", kind: "line" },
        { label: "Budget pace", color: "var(--muted-foreground)", kind: "dashed" },
      ]}
      table={{
        head: ["Day", "Spent so far", "Budget pace"],
        rows: data.map((d) => [d.title, d.value === null ? "—" : money(d.value), money(d.reference)]),
      }}
    >
      <LineTrend
        data={data}
        color="var(--primary)"
        valueLabel="Spent so far"
        referenceLabel="Budget pace"
        format={money}
      />
    </ChartCard>
  );
}
