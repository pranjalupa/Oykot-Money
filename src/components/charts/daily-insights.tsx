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

/**
 * The question Daily exists to answer: how much can I spend today?
 *
 * One number, one bar, one line. A ring around a percentage said nothing the
 * percentage didn't, and a grid of four stats beside the number repeated it.
 */
export function DailyHero({
  budgetMinor,
  spentMinor,
  remainingMinor,
  safePerDayMinor,
  isCurrentMonth,
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
  // One number that answers the question and one bar for how much is gone.
  // Days left and pace live in the Spending pace chart below.

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-8">
      <p className="text-sm font-medium text-muted-foreground">
        {isCurrentMonth ? "Safe to spend today" : "Per day"}
      </p>

      {/* The number is the screen. Everything under it is support, and it's
          kept to one bar and one line — a grid of stats beside it only ever
          restated this figure. */}
      <p className="mt-1.5 font-heading text-[2.75rem] leading-none font-bold tracking-tight sm:text-5xl">
        <Money minor={safePerDayMinor} tone={over ? "negative" : "default"} />
        <span className="ml-1.5 font-sans text-base font-medium tracking-normal text-muted-foreground">
          / day
        </span>
      </p>

      {budgetMinor > 0 ? (
        <>
          <div
            role="progressbar"
            aria-label="Needs and Wants budget used"
            aria-valuenow={used}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
          >
            <div
              className={`h-full rounded-full ${over ? "bg-negative" : "bg-primary"}`}
              style={{ width: `${Math.min(used, 100)}%` }}
            />
          </div>
          {/* One sentence, not a row of competing figures. */}
          <p className="mt-3 text-sm text-muted-foreground">
            <Money minor={spentMinor} tone="default" className="font-semibold text-foreground" /> of{" "}
            {money(budgetMinor)} spent
            <span aria-hidden className="mx-1.5">·</span>
            <Money
              minor={Math.abs(remainingMinor)}
              tone={over ? "negative" : "default"}
              className="font-semibold text-foreground"
            />{" "}
            {over ? "over" : "left"}
          </p>
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
