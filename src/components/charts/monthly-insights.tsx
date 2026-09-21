"use client";

import { useState } from "react";
import Link from "next/link";
import { useIsDesktop } from "@/lib/use-media";
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { ChartCard, TooltipBox } from "@/components/charts/chart-card";
import { useCurrency } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";

const GROUPS = [
  { key: "needs", label: "Needs", color: "var(--chart-needs)" },
  { key: "wants", label: "Wants", color: "var(--chart-wants)" },
  { key: "investments", label: "Investments", color: "var(--chart-investments)" },
] as const;
type SpendGroup = (typeof GROUPS)[number]["key"];
const META = Object.fromEntries(GROUPS.map((g) => [g.key, g])) as Record<SpendGroup, (typeof GROUPS)[number]>;

export type TargetRow = {
  key: SpendGroup;
  href: string;
  targetPercent: number;
  plannedPercent: number;
  actualPercent: number;
  plannedMinor: number;
  actualMinor: number;
};

type Slice = { key: string; label: string; value: number; color: string };

/**
 * Where this month's income went, against the split you aimed for — one card:
 * a donut of the income by group (plus what's not spent), with the income in
 * the middle, and beside it a row per group with its share against target.
 */
export function IncomeSplit({
  rows,
  incomeMinor,
  custom,
  editor,
}: {
  rows: TargetRow[];
  /** Received income, or budgeted income until any arrives. */
  incomeMinor: number;
  custom: boolean;
  editor?: React.ReactNode;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const spent = rows.reduce((s, r) => s + r.actualMinor, 0);
  const left = Math.max(incomeMinor - spent, 0);
  const shareOfIncome = (v: number) => (incomeMinor > 0 ? Math.round((v / incomeMinor) * 100) : 0);

  const slices: Slice[] = [
    ...rows.map((r) => ({ key: r.key, label: META[r.key].label, value: r.actualMinor, color: META[r.key].color })),
    // Unspent money takes the neutral stone rather than a fourth group colour.
    { key: "left", label: "Not spent", value: left, color: "var(--chart-neutral)" },
  ];
  const drawn = slices.filter((s) => s.value > 0);

  return (
    <ChartCard
      title="Your income split"
      aside={custom ? "Custom this month" : "Default split"}
      table={{
        head: ["", "Spent", "Of income", "Target"],
        rows: [
          ...rows.map((r) => [META[r.key].label, money(r.actualMinor), `${r.actualPercent}%`, `${r.targetPercent}%`]),
          ["Not spent", money(left), `${shareOfIncome(left)}%`, "—"],
        ],
      }}
    >
      {drawn.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Log some income and spending to see the split.</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative size-[160px] shrink-0 sm:size-[200px]">
            <ChartContainer
              config={Object.fromEntries(slices.map((s) => [s.key, { label: s.label, color: s.color }]))}
              className="aspect-square size-full"
            >
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const s = payload[0].payload as Slice;
                    return (
                      <TooltipBox
                        title={s.label}
                        rows={[{ label: `${shareOfIncome(s.value)}% of income`, value: money(s.value), color: s.color }]}
                      />
                    );
                  }}
                />
                <Pie
                  data={drawn}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="64%"
                  outerRadius="100%"
                  paddingAngle={1.5}
                  cornerRadius={4}
                  stroke="var(--card)"
                  strokeWidth={2}
                  isAnimationActive={false}
                >
                  {drawn.map((s) => (
                    <Cell key={s.key} fill={s.color} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* The whole the slices are shares of, in the hole. */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Income</span>
              <span className="font-heading text-lg font-bold">{formatCompact(incomeMinor, currency)}</span>
            </div>
          </div>

          <ul className="flex w-full flex-col divide-y divide-border">
            {rows.map((r) => {
              const isOver = r.actualPercent > r.targetPercent;
              return (
                <li key={r.key} className="flex items-center gap-3 py-2.5">
                  <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: META[r.key].color }} />
                  <Link href={r.href} className="flex-1 text-sm font-medium hover:underline">
                    {META[r.key].label}
                  </Link>
                  <span className="text-right">
                    <span className={`tabular block text-sm font-semibold ${isOver ? "text-negative" : ""}`}>
                      {r.actualPercent}% <span className="font-normal text-muted-foreground">of {r.targetPercent}%</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {money(r.actualMinor)} spent · {money(r.plannedMinor)} budgeted
                    </span>
                  </span>
                </li>
              );
            })}
            <li className="flex items-center gap-3 py-2.5">
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: "var(--chart-neutral)" }} />
              <span className="flex-1 text-sm font-medium text-muted-foreground">Not spent</span>
              <span className="tabular text-sm font-semibold">
                {money(left)} <span className="font-normal text-muted-foreground">· {shareOfIncome(left)}%</span>
              </span>
            </li>
          </ul>
        </div>
      )}
      {editor && <div className="mt-4 border-t border-border pt-4">{editor}</div>}
    </ChartCard>
  );
}

export type CategorySpend = {
  id: string;
  name: string;
  groupKey: SpendGroup;
  plannedMinor: number;
  actualMinor: number;
  href: string;
};

type RankedBar = CategorySpend & { color: string; over: boolean };

/** Row height per category: room for the name above its bar. */
const ROW = 46;

/**
 * Which categories take the most — a horizontal bar chart, biggest first,
 * coloured by group (red when over budget).
 *
 * Each category's full name sits above its bar rather than in an axis column
 * beside it: that column capped names at 13 characters.
 */
export function TopCategories({ rows }: { rows: CategorySpend[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const desktop = useIsDesktop();
  const [expanded, setExpanded] = useState(false);
  const spending = rows.filter((r) => r.actualMinor > 0).sort((a, b) => b.actualMinor - a.actualMinor);
  // Phones start with the top 5 so the chart fits a screen; desktops show 8.
  const limit = expanded ? 8 : desktop ? 8 : 5;
  const data: RankedBar[] = spending.slice(0, limit).map((r) => ({
    ...r,
    color: META[r.groupKey].color,
    over: r.plannedMinor > 0 && r.actualMinor > r.plannedMinor,
  }));

  return (
    <ChartCard
      title="Where it goes"
      aside={spending.length > 8 ? `Top 8 of ${spending.length}` : undefined}
      table={{
        head: ["Category", "Spent", "Budgeted"],
        rows: spending.map((r) => [r.name, money(r.actualMinor), money(r.plannedMinor)]),
      }}
    >
      {data.length ? (
        <ChartContainer
          config={{ actualMinor: { label: "Spent", color: "var(--primary)" } }}
          className="aspect-auto w-full"
          style={{ height: data.length * ROW + 8 }}
        >
          <BarChart data={data} layout="vertical" margin={{ top: 18, right: 64, bottom: 0, left: 0 }} barCategoryGap={22}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="name" hide />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const r = payload[0].payload as RankedBar;
                return (
                  <TooltipBox
                    title={r.name}
                    rows={[
                      { label: "spent", value: money(r.actualMinor), color: r.over ? "var(--negative)" : r.color },
                      { label: "budgeted", value: r.plannedMinor > 0 ? money(r.plannedMinor) : "not budgeted" },
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="actualMinor" radius={6} barSize={14} isAnimationActive={false}>
              {data.map((r) => (
                <Cell key={r.id} fill={r.over ? "var(--negative)" : r.color} />
              ))}
              {/* Full name above the bar. */}
              <LabelList
                dataKey="name"
                content={({ x, y, value }) => (
                  <text x={Number(x)} y={Number(y) - 6} fill="var(--foreground)" fontSize={12} fontWeight={500}>
                    {String(value)}
                  </text>
                )}
              />
              {/* Amount at the end of the bar. */}
              <LabelList
                dataKey="actualMinor"
                position="right"
                offset={8}
                formatter={(v: unknown) => formatCompact(Number(v), currency)}
                fill="var(--muted-foreground)"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Log some spending to see where it goes.</p>
      )}
      {!desktop && spending.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 self-start text-sm font-medium text-muted-foreground underline underline-offset-4"
        >
          {expanded ? "Show top 5" : `Show top ${Math.min(8, spending.length)}`}
        </button>
      )}
    </ChartCard>
  );
}
