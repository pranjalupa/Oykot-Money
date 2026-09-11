"use client";

import { Bar, BarChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ChartCard, TooltipBox, X_AXIS } from "@/components/charts/chart-card";
import { RadialProgress } from "@/components/charts/radial-progress";
import { AreaTrend } from "@/components/charts/area-trend";
import { ColumnTrend } from "@/components/charts/column-trend";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

export type YearMonth = {
  month: string;
  income: number;
  expense: number;
  saved: number;
  needs: number;
  wants: number;
  investments: number;
};

const active = (m: YearMonth) => m.income !== 0 || m.expense !== 0;

/** What share of income you kept — one headline number, drawn as a ring. */
export function SavingsRateCard({ income, saved }: { income: number; saved: number }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const rate = income > 0 ? Math.round((saved / income) * 100) : 0;
  return (
    <ChartCard
      title="Savings rate"
      takeaway={income > 0 ? `You kept ${money(saved)} of ${money(income)}.` : "No income logged this year yet."}
    >
      <div className="flex justify-center py-2">
        <RadialProgress
          percent={Math.max(rate, 0)}
          color={saved >= 0 ? "var(--positive)" : "var(--negative)"}
          size={172}
          label={`${rate}% of income kept this year`}
        >
          <span className="font-heading text-3xl font-bold">{rate}%</span>
          <span className="mt-0.5 text-xs text-muted-foreground">of income kept</span>
        </RadialProgress>
      </div>
    </ChartCard>
  );
}

/** Is the savings pot growing? A running total across the year. */
export function SavingsGrowth({ months }: { months: YearMonth[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const lastActive = months.reduce((idx, m, i) => (active(m) ? i : idx), -1);
  const running: number[] = [];
  months.forEach((m, i) => running.push((running[i - 1] ?? 0) + m.saved));
  const data = months.map((m, i) => ({
    label: formatMonthShort(m.month, locale),
    value: i <= lastActive ? running[i] : null,
  }));
  const total = lastActive >= 0 ? running[lastActive] : 0;

  return (
    <ChartCard
      title="Savings this year"
      takeaway={lastActive < 0 ? "Nothing logged this year yet." : total >= 0 ? `${money(total)} saved so far this year.` : `${money(-total)} more spent than earned this year.`}
      note="A running total — each month adds what was left after spending."
      table={{ head: ["Month", "Saved that month", "Running total"], rows: months.slice(0, lastActive + 1).map((m, i) => [data[i].label, money(m.saved), money(running[i])]) }}
    >
      <AreaTrend data={data} color="var(--primary)" valueLabel="Saved so far" format={money} fromZero={false} height={220} />
    </ChartCard>
  );
}

/** Which months were good or bad — above zero saved, below overspent. */
export function MonthlySavings({ months }: { months: YearMonth[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency, signed: true });
  const seen = months.filter(active);
  const best = [...seen].sort((a, b) => b.saved - a.saved)[0];
  const overspent = seen.filter((m) => m.saved < 0).length;
  return (
    <ChartCard
      title="Saved each month"
      legend={[
        { label: "Saved", color: "var(--positive)" },
        { label: "Overspent", color: "var(--negative)" },
      ]}
      takeaway={best ? `Best month: ${formatMonthShort(best.month, locale)}, ${money(best.saved)}.` : "Nothing logged this year yet."}
      note={seen.length ? (overspent ? `${overspent} month${overspent === 1 ? "" : "s"} spent more than came in.` : "No month spent more than came in.") : undefined}
      table={{ head: ["Month", "Saved"], rows: seen.map((m) => [formatMonthShort(m.month, locale), money(m.saved)]) }}
    >
      <ColumnTrend
        data={months.map((m) => ({
          label: formatMonthShort(m.month, locale),
          value: m.saved,
          color: m.saved >= 0 ? "var(--positive)" : "var(--negative)",
        }))}
        color="var(--positive)"
        valueLabel="Saved"
        format={money}
        height={220}
      />
    </ChartCard>
  );
}

const GROUPS = [
  { key: "needs", label: "Needs", color: "var(--chart-needs)" },
  { key: "wants", label: "Wants", color: "var(--chart-wants)" },
  { key: "investments", label: "Investments", color: "var(--chart-investments)" },
] as const;

/** Is the spending mix shifting? Each month's spending split into its groups. */
export function SpendingMix({ months }: { months: YearMonth[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const rows = months.map((m) => {
    const spend = m.needs + m.wants + m.investments;
    const pct = (v: number) => (spend > 0 ? Math.round((v / spend) * 100) : 0);
    return { label: formatMonthShort(m.month, locale), spend, needs: pct(m.needs), wants: pct(m.wants), investments: pct(m.investments), raw: m };
  });
  const seen = rows.filter((r) => r.spend > 0);
  const avgWants = seen.length ? Math.round(seen.reduce((s, r) => s + r.wants, 0) / seen.length) : 0;
  const peak = [...seen].sort((a, b) => b.wants - a.wants)[0];

  return (
    <ChartCard
      title="Spending mix"
      legend={GROUPS.map((g) => ({ label: g.label, color: g.color }))}
      takeaway={seen.length ? `Wants averaged ${avgWants}% of spending${peak ? `, highest in ${peak.label} (${peak.wants}%)` : ""}.` : "Nothing spent this year yet."}
      note="Each bar is one month's spending, split by group."
      table={{
        head: ["Month", "Needs", "Wants", "Investments"],
        rows: seen.map((r) => [r.label, ...GROUPS.map((g) => `${r[g.key]}% · ${formatCompact(r.raw[g.key], currency)}`)]),
      }}
    >
      <ChartContainer
        config={Object.fromEntries(GROUPS.map((g) => [g.key, { label: g.label, color: g.color }]))}
        className="aspect-auto w-full"
        style={{ height: 220 }}
      >
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="label" {...X_AXIS} interval="preserveStartEnd" minTickGap={6} />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 8 }}
            content={({ active: on, payload }) => {
              if (!on || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              return (
                <TooltipBox
                  title={r.label}
                  rows={GROUPS.map((g) => ({ label: g.label.toLowerCase(), value: `${r[g.key]}% · ${money(r.raw[g.key])}`, color: g.color }))}
                />
              );
            }}
          />
          {GROUPS.map((g, i) => (
            <Bar
              key={g.key}
              dataKey={g.key}
              stackId="mix"
              fill={g.color}
              stroke="var(--card)"
              strokeWidth={2}
              radius={i === GROUPS.length - 1 ? [6, 6, 0, 0] : 0}
              maxBarSize={26}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}
