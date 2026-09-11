"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ChartCard, TooltipBox, AXIS } from "@/components/charts/chart-card";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

export type YearMonth = { month: string; income: number; expense: number; saved: number };

/** Income is the grey context; spending is the mark you read. */
export function IncomeExpenseChart({ months }: { months: YearMonth[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const data = months.map((m) => ({ ...m, label: formatMonthShort(m.month, locale) }));
  const legend = [
    { label: "Income", color: "var(--chart-neutral)" },
    { label: "Spent", color: "var(--chart-accent)" },
  ];

  return (
    <ChartCard
      title="Income and spending"
      description="Month by month, everything that came in against everything that went out."
      legend={legend}
      table={{
        head: ["Month", "Income", "Spent", "Saved"],
        rows: data.map((d) => [d.label, money(d.income), money(d.expense), money(d.saved)]),
      }}
    >
      <ChartContainer
        config={{ income: { label: "Income", color: "var(--chart-neutral)" }, expense: { label: "Spent", color: "var(--chart-accent)" } }}
        className="aspect-auto h-56 w-full"
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
                    { label: "spent", value: money(d.expense), color: "var(--chart-accent)" },
                    { label: "income", value: money(d.income), color: "var(--chart-neutral)" },
                  ]}
                />
              );
            }}
          />
          <Bar isAnimationActive={false} dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar isAnimationActive={false} dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

/**
 * Saved per month, above or below zero. Two colours with a meaning — saved or
 * overspent — so they're the positive/negative status tokens, and the sign in
 * the label says the same thing for anyone who can't see the colour.
 */
export function SavingsChart({ months }: { months: YearMonth[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency, signed: true });
  const active = months.filter((m) => m.income || m.expense);
  const income = active.reduce((s, m) => s + m.income, 0);
  const saved = active.reduce((s, m) => s + m.saved, 0);
  const rate = income > 0 ? Math.round((saved / income) * 100) : null;
  const data = months.map((m) => ({
    label: formatMonthShort(m.month, locale),
    saved: m.saved,
    up: m.saved > 0 ? m.saved : null,
    down: m.saved < 0 ? m.saved : null,
    rate: m.income > 0 ? Math.round((m.saved / m.income) * 100) : null,
  }));

  return (
    <ChartCard
      title="Saved each month"
      description={rate === null ? "What was left after spending." : `You've kept ${rate}% of what came in this year.`}
      legend={[
        { label: "Saved", color: "var(--positive)" },
        { label: "Overspent", color: "var(--negative)" },
      ]}
      table={{
        head: ["Month", "Saved", "Of income"],
        rows: data.map((d) => [d.label, money(d.saved), d.rate === null ? "—" : `${d.rate}%`]),
      }}
    >
      <ChartContainer
        config={{ up: { label: "Saved", color: "var(--positive)" }, down: { label: "Overspent", color: "var(--negative)" } }}
        className="aspect-auto h-48 w-full"
      >
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} stackOffset="sign">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={52} tickFormatter={(v: number) => formatCompact(v, currency)} />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active: on, payload }) => {
              if (!on || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <TooltipBox
                  title={d.label}
                  rows={[
                    { label: d.saved >= 0 ? "saved" : "overspent", value: money(d.saved), color: d.saved >= 0 ? "var(--positive)" : "var(--negative)" },
                    ...(d.rate !== null ? [{ label: "of income", value: `${d.rate}%` }] : []),
                  ]}
                />
              );
            }}
          />
          <Bar isAnimationActive={false} dataKey="up" stackId="s" fill="var(--color-up)" radius={[4, 4, 0, 0]} maxBarSize={20} />
          <Bar isAnimationActive={false} dataKey="down" stackId="s" fill="var(--color-down)" radius={[0, 0, 4, 4]} maxBarSize={20} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
