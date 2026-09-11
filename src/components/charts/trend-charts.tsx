"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ChartCard, TooltipBox, AXIS } from "@/components/charts/chart-card";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

type Point = { month: string; budgetedMinor: number; spentMinor: number; assumed: boolean };

/** Six months of one category: budget (grey context) against what went out. */
export function CategoryTrendChart({
  points,
  isIncome,
}: {
  points: Point[];
  isIncome: boolean;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const spentLabel = isIncome ? "Received" : "Spent";
  const data = points.map((p) => ({ ...p, label: formatMonthShort(p.month, locale) }));
  const any = points.some((p) => p.budgetedMinor || p.spentMinor);

  return (
    <ChartCard
      title="Last six months"
      description={`Budgeted against ${spentLabel.toLowerCase()}, month by month.`}
      legend={[
        { label: "Budgeted", color: "var(--chart-neutral)" },
        { label: spentLabel, color: "var(--chart-accent)" },
      ]}
      table={{
        head: ["Month", "Budgeted", spentLabel],
        rows: data.map((d) => [d.label, money(d.budgetedMinor), `${money(d.spentMinor)}${d.assumed ? " (assumed)" : ""}`]),
      }}
    >
      {!any ? (
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">
          No history yet for this category.
        </p>
      ) : (
        <ChartContainer
          config={{ budgetedMinor: { label: "Budgeted", color: "var(--chart-neutral)" }, spentMinor: { label: spentLabel, color: "var(--chart-accent)" } }}
          className="aspect-auto h-48 w-full"
        >
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" {...AXIS} />
            <YAxis {...AXIS} width={52} tickFormatter={(v: number) => formatCompact(v, currency)} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <TooltipBox
                    title={d.label}
                    rows={[
                      { label: d.assumed ? `${spentLabel.toLowerCase()} (assumed)` : spentLabel.toLowerCase(), value: money(d.spentMinor), color: "var(--chart-accent)" },
                      { label: "budgeted", value: money(d.budgetedMinor), color: "var(--chart-neutral)" },
                    ]}
                  />
                );
              }}
            />
            <Bar isAnimationActive={false} dataKey="budgetedMinor" fill="var(--color-budgetedMinor)" radius={[4, 4, 0, 0]} maxBarSize={18} />
            <Bar isAnimationActive={false} dataKey="spentMinor" fill="var(--color-spentMinor)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}

type NetPoint = { month: string; totalMinor: number };

/**
 * Net worth as recorded month by month. History starts when snapshots began —
 * it can't be rebuilt backwards, because asset values were never kept.
 */
export function NetWorthChart({ points }: { points: NetPoint[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const data = points.map((p) => ({ ...p, label: formatMonthShort(p.month, locale) }));

  return (
    <ChartCard
      title="Net worth over time"
      description="Recorded each month as you use the app. A month keeps the last value it had."
      table={{ head: ["Month", "Net worth"], rows: data.map((d) => [d.label, money(d.totalMinor)]) }}
    >
      {points.length < 2 ? (
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">
          Your history starts this month. Check back next month to see the line.
        </p>
      ) : (
        <ChartContainer
          config={{ totalMinor: { label: "Net worth", color: "var(--chart-accent)" } }}
          className="aspect-auto h-48 w-full"
        >
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" {...AXIS} />
            <YAxis {...AXIS} width={52} tickFormatter={(v: number) => formatCompact(v, currency)} />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipBox title={payload[0].payload.label} rows={[{ label: "net worth", value: money(payload[0].payload.totalMinor) }]} />
                ) : null
              }
            />
            <Area isAnimationActive={false}
              dataKey="totalMinor"
              stroke="var(--color-totalMinor)"
              strokeWidth={2}
              fill="var(--color-totalMinor)"
              fillOpacity={0.1}
              dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--color-totalMinor)" }}
            />
          </AreaChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
