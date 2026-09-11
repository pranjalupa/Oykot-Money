"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ChartCard, TooltipBox, AXIS } from "@/components/charts/chart-card";
import { useCurrency } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";

const GROUPS = [
  { key: "needs", label: "Needs", color: "var(--chart-needs)" },
  { key: "wants", label: "Wants", color: "var(--chart-wants)" },
  { key: "investments", label: "Investments", color: "var(--chart-investments)" },
] as const;
type GroupKey = (typeof GROUPS)[number]["key"];

export type SplitGroup = {
  targetPercent: number;
  plannedPercent: number;
  actualPercent: number;
  plannedMinor: number;
  actualMinor: number;
};

/**
 * Target, budget and reality as three stacked bars of the same scale — share
 * of income per group. Reading down the rows answers "did my budget follow my
 * target, and did my spending follow my budget?" in one look.
 */
export function SplitChart({
  groups,
  plannedIncome,
  actualIncome,
}: {
  groups: Record<GroupKey, SplitGroup>;
  plannedIncome: number;
  actualIncome: number;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  type Row = Record<GroupKey, number> & { row: string; amounts: Record<GroupKey, number> | null };
  const row = (
    label: string,
    pick: (g: SplitGroup) => number,
    amount?: (g: SplitGroup) => number,
  ): Row => ({
    row: label,
    needs: pick(groups.needs),
    wants: pick(groups.wants),
    investments: pick(groups.investments),
    amounts: amount
      ? { needs: amount(groups.needs), wants: amount(groups.wants), investments: amount(groups.investments) }
      : null,
  });
  const data = [
    row("Target", (g) => g.targetPercent),
    row("Budgeted", (g) => g.plannedPercent, (g) => g.plannedMinor),
    row("Spent", (g) => g.actualPercent, (g) => g.actualMinor),
  ];
  const widest = Math.max(100, ...data.map((d) => GROUPS.reduce((s, g) => s + (d[g.key] as number), 0)));

  if (plannedIncome <= 0 && actualIncome <= 0) {
    return (
      <ChartCard title="Your split" table={{ head: ["", "Needs", "Wants", "Investments"], rows: [] }}>
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">
          Budget your income to compare your spending against your target split.
        </p>
      </ChartCard>
    );
  }

  return (
    <ChartCard
      title="Your split"
      description="Each group as a share of income. Past the dashed line means more than you earn."
      legend={GROUPS.map((g) => ({ label: g.label, color: g.color }))}
      table={{
        head: ["", ...GROUPS.map((g) => g.label)],
        rows: data.map((d) => [
          d.row,
          ...GROUPS.map((g) => `${d[g.key]}%${d.amounts ? ` · ${money(d.amounts[g.key])}` : ""}`),
        ]),
      }}
    >
      <ChartContainer
        config={Object.fromEntries(GROUPS.map((g) => [g.key, { label: g.label, color: g.color }]))}
        className="aspect-auto h-44 w-full"
      >
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 0 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" domain={[0, widest]} {...AXIS} tickFormatter={(v: number) => `${v}%`} />
          <YAxis type="category" dataKey="row" {...AXIS} width={72} />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <TooltipBox
                  title={d.row}
                  rows={GROUPS.map((g) => ({
                    label: g.label,
                    color: g.color,
                    value: `${d[g.key]}%${d.amounts ? ` · ${money(d.amounts[g.key])}` : ""}`,
                  }))}
                />
              );
            }}
          />
          <ReferenceLine x={100} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          {GROUPS.map((g, i) => (
            <Bar isAnimationActive={false}
              key={g.key}
              dataKey={g.key}
              stackId="split"
              fill={`var(--color-${g.key})`}
              // The 2px surface gap between segments, not a border around them.
              stroke="var(--card)"
              strokeWidth={2}
              maxBarSize={24}
              radius={i === GROUPS.length - 1 ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

export type CategoryBar = { name: string; budgetedMinor: number; spentMinor: number };

/**
 * The biggest categories this month, budget against spend. Budget is the grey
 * context; spend is the mark that matters.
 */
export function CategoryBudgetChart({ rows }: { rows: CategoryBar[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const legend = [
    { label: "Budgeted", color: "var(--chart-neutral)" },
    { label: "Spent", color: "var(--chart-accent)" },
  ];

  return (
    <ChartCard
      title="Biggest categories"
      description="Your largest budget lines this month, and what's gone out."
      legend={legend}
      table={{
        head: ["Category", "Budgeted", "Spent", "Remaining"],
        rows: rows.map((r) => [r.name, money(r.budgetedMinor), money(r.spentMinor), money(r.budgetedMinor - r.spentMinor)]),
      }}
    >
      {rows.length === 0 ? (
        <p className="px-2 py-10 text-center text-sm text-muted-foreground">
          Nothing budgeted or spent yet this month.
        </p>
      ) : (
        <ChartContainer
          config={{ budgeted: { label: "Budgeted", color: "var(--chart-neutral)" }, spent: { label: "Spent", color: "var(--chart-accent)" } }}
          className="aspect-auto w-full"
          style={{ height: 40 + rows.length * 40 }}
        >
          <BarChart
            data={rows.map((r) => ({ name: r.name, budgeted: r.budgetedMinor, spent: r.spentMinor }))}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
            barGap={2}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" {...AXIS} tickFormatter={(v: number) => formatCompact(v, currency)} />
            <YAxis
              type="category"
              dataKey="name"
              {...AXIS}
              width={104}
              tickFormatter={(v: string) => (v.length > 14 ? `${v.slice(0, 13)}…` : v)}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <TooltipBox
                    title={d.name}
                    rows={[
                      { label: "spent", value: money(d.spent), color: "var(--chart-accent)" },
                      { label: "budgeted", value: money(d.budgeted), color: "var(--chart-neutral)" },
                      { label: d.budgeted - d.spent >= 0 ? "remaining" : "over budget", value: money(Math.abs(d.budgeted - d.spent)) },
                    ]}
                  />
                );
              }}
            />
            <Bar isAnimationActive={false} dataKey="budgeted" fill="var(--color-budgeted)" radius={[0, 4, 4, 0]} maxBarSize={12} />
            <Bar isAnimationActive={false} dataKey="spent" fill="var(--color-spent)" radius={[0, 4, 4, 0]} maxBarSize={12} />
          </BarChart>
        </ChartContainer>
      )}
    </ChartCard>
  );
}
