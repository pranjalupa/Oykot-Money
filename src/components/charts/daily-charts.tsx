"use client";

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ChartCard, TooltipBox, AXIS } from "@/components/charts/chart-card";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatDay } from "@/lib/dates";

type Day = { date: string; totalMinor: number };

function daysIn(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
const iso = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

/**
 * Spending per day, every day of the month, with the even-pace line: the
 * Needs + Wants budget spread flat across the month. Bars above it are the
 * expensive days; the line makes that visible without reading a single number.
 */
export function DailySpendChart({
  month,
  days,
  budgetMinor,
}: {
  month: string;
  days: Day[];
  budgetMinor: number;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const last = daysIn(month);
  const byDate = new Map(days.map((d) => [d.date, d.totalMinor]));
  const data = Array.from({ length: last }, (_, i) => ({
    day: i + 1,
    date: iso(month, i + 1),
    spent: byDate.get(iso(month, i + 1)) ?? 0,
  }));
  const pace = budgetMinor > 0 ? Math.round(budgetMinor / last) : 0;
  const money = (m: number) => formatMoney(m, { currency });

  return (
    <ChartCard
      title="Spending by day"
      description={
        pace > 0
          ? `Needs and Wants. The line is an even pace: ${money(pace)} a day.`
          : "Needs and Wants, day by day."
      }
      table={{
        head: ["Day", "Spent"],
        rows: data.filter((d) => d.spent > 0).map((d) => [formatDay(d.date, locale), money(d.spent)]),
        note: "Days with no spending are left out.",
      }}
    >
      <ChartContainer config={{ spent: { label: "Spent", color: "var(--chart-accent)" } }} className="aspect-auto h-52 w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...AXIS} width={52} tickFormatter={(v: number) => formatCompact(v, currency)} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={formatDay(payload[0].payload.date, locale, { weekday: "short", day: "numeric", month: "short" })}
                  rows={[{ label: "spent", value: money(payload[0].payload.spent) }]}
                />
              ) : null
            }
          />
          {pace > 0 && (
            <ReferenceLine y={pace} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1.5} ifOverflow="extendDomain" />
          )}
          <Bar isAnimationActive={false} dataKey="spent" fill="var(--color-spent)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/**
 * Spending so far against the budget's pace. The pace is a straight line from
 * nothing to the full budget at month's end; being under it means on track.
 *
 * Assume-spent amounts have no date, so they're counted from day one — that's
 * when a fixed cost like rent is really committed.
 */
export function SpendPaceChart({
  month,
  days,
  budgetMinor,
  spentMinor,
  throughDay,
}: {
  month: string;
  days: Day[];
  budgetMinor: number;
  /** Total Needs + Wants spent, assumed amounts included. */
  spentMinor: number;
  /** Last day to draw actuals for — today in the current month. */
  throughDay: number;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const last = daysIn(month);
  const byDate = new Map(days.map((d) => [d.date, d.totalMinor]));
  const logged = days.reduce((s, d) => s + d.totalMinor, 0);
  const assumed = Math.max(0, spentMinor - logged);
  const money = (m: number) => formatMoney(m, { currency });

  const cumulative: number[] = [];
  for (let day = 1; day <= last; day++) {
    cumulative.push((cumulative[day - 2] ?? assumed) + (byDate.get(iso(month, day)) ?? 0));
  }
  const data = cumulative.map((total, i) => ({
    day: i + 1,
    date: iso(month, i + 1),
    pace: Math.round((budgetMinor * (i + 1)) / last),
    spent: i + 1 <= throughDay ? total : null,
  }));

  if (budgetMinor <= 0) {
    return (
      <ChartCard title="Spending pace" table={{ head: ["Day", "Spent so far"], rows: [] }}>
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">
          Set a budget for Needs and Wants to see whether you&rsquo;re on pace.
        </p>
      </ChartCard>
    );
  }

  const legend = [
    { label: "Spent so far", color: "var(--chart-accent)", kind: "line" as const },
    { label: "Budget pace", color: "var(--muted-foreground)", kind: "dashed" as const },
  ];

  return (
    <ChartCard
      title="Spending pace"
      description={
        assumed > 0
          ? `Under the dashed line is on track. Starts at ${money(assumed)} of fixed costs you assume are spent.`
          : "Under the dashed line is on track."
      }
      legend={legend}
      table={{
        head: ["Day", "Spent so far", "Budget pace"],
        rows: data.map((d) => [formatDay(d.date, locale), d.spent === null ? "—" : money(d.spent), money(d.pace)]),
      }}
    >
      <ChartContainer
        config={{ spent: { label: "Spent so far", color: "var(--chart-accent)" }, pace: { label: "Budget pace", color: "var(--muted-foreground)" } }}
        className="aspect-auto h-52 w-full"
      >
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="day" {...AXIS} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...AXIS} width={52} tickFormatter={(v: number) => formatCompact(v, currency)} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload;
              return (
                <TooltipBox
                  title={formatDay(p.date, locale, { day: "numeric", month: "short" })}
                  rows={[
                    ...(p.spent !== null ? [{ label: "spent so far", value: money(p.spent), color: "var(--chart-accent)" }] : []),
                    { label: "budget pace", value: money(p.pace), color: "var(--muted-foreground)" },
                  ]}
                />
              );
            }}
          />
          <Line isAnimationActive={false} dataKey="pace" stroke="var(--color-pace)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
          <Area isAnimationActive={false}
            dataKey="spent"
            stroke="var(--color-spent)"
            strokeWidth={2}
            fill="var(--color-spent)"
            fillOpacity={0.1}
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ChartContainer>
    </ChartCard>
  );
}
