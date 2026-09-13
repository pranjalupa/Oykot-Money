"use client";

import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import { useCurrency } from "@/components/currency-provider";
import { formatMoney } from "@/lib/money";

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

/**
 * Where this month's income went, against the split you aimed for — one card.
 *
 * It used to be two: a pie of the income split and a target card beside it,
 * both saying "Needs 33%". Now one bar across the whole width is the income,
 * divided by group, with a mark wherever a group would end if it spent exactly
 * its target share. The rows underneath carry the figures and the editor.
 *
 * Plain divs rather than Recharts: a single stacked bar has no axes, ticks or
 * tooltips worth a chart library.
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
  // Overspending still has to fit in the bar, so the whole is whichever is bigger.
  const whole = Math.max(incomeMinor, spent);
  const width = (v: number) => (whole > 0 ? `${(v / whole) * 100}%` : "0%");
  const shareOfIncome = (v: number) => (incomeMinor > 0 ? Math.round((v / incomeMinor) * 100) : 0);

  let running = 0;
  const marks =
    incomeMinor > 0
      ? rows.map((r) => {
          running += r.targetPercent;
          return { key: r.key, at: (running * incomeMinor) / whole };
        })
      : [];

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
      {whole === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Log some income and spending to see the split.</p>
      ) : (
        <>
          <div className="relative">
            <div className="flex h-5 gap-0.5 overflow-hidden rounded-full bg-muted">
              {rows.map(
                (r) =>
                  r.actualMinor > 0 && (
                    <div
                      key={r.key}
                      title={`${META[r.key].label}: ${money(r.actualMinor)}`}
                      className="h-full"
                      style={{ width: width(r.actualMinor), background: META[r.key].color }}
                    />
                  ),
              )}
              {left > 0 && (
                <div
                  title={`Not spent: ${money(left)}`}
                  className="h-full"
                  style={{ width: width(left), background: "var(--chart-neutral)" }}
                />
              )}
            </div>
            {marks
              .filter((m) => m.at > 0 && m.at < 100)
              .map((m) => (
                <span
                  key={m.key}
                  aria-hidden
                  title={`Where ${META[m.key].label} ends at its target`}
                  className="absolute -top-1.5 -bottom-1.5 w-0.5 -translate-x-1/2 rounded-full bg-foreground/70"
                  style={{ left: `${m.at}%` }}
                />
              ))}
          </div>
          <p className="mt-2.5 text-xs text-muted-foreground">
            The marks show where each group should end at your {rows.map((r) => r.targetPercent).join(" / ")} split.
          </p>

          <ul className="mt-4 flex flex-col divide-y divide-border">
            {rows.map((r) => {
              const isOver = r.actualPercent > r.targetPercent;
              return (
                <li key={r.key} className="flex items-center gap-3 py-3">
                  <span aria-hidden className="h-3 w-1.5 shrink-0 rounded-sm" style={{ background: META[r.key].color }} />
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
            <li className="flex items-center gap-3 py-3">
              <span aria-hidden className="h-3 w-1.5 shrink-0 rounded-sm" style={{ background: "var(--chart-neutral)" }} />
              <span className="flex-1 text-sm font-medium text-muted-foreground">Not spent</span>
              <span className="tabular text-sm font-semibold">
                {money(left)} <span className="font-normal text-muted-foreground">· {shareOfIncome(left)}%</span>
              </span>
            </li>
          </ul>
        </>
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

/**
 * Which categories take the most — biggest first, coloured by group.
 *
 * A list with a bar under each name rather than a bar chart with names in a
 * column beside it: that column capped names at 13 characters. A thin mark on
 * each bar is that category's budget; a bar past its mark turns red.
 */
export function TopCategories({ rows }: { rows: CategorySpend[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const spending = rows.filter((r) => r.actualMinor > 0).sort((a, b) => b.actualMinor - a.actualMinor);
  const shown = spending.slice(0, 8);
  const scale = Math.max(1, ...shown.map((r) => Math.max(r.actualMinor, r.plannedMinor)));
  const pct = (v: number) => `${(v / scale) * 100}%`;

  return (
    <ChartCard
      title="Where it goes"
      aside={spending.length > 8 ? `Top 8 of ${spending.length}` : undefined}
      table={{
        head: ["Category", "Spent", "Budgeted"],
        rows: spending.map((r) => [r.name, money(r.actualMinor), money(r.plannedMinor)]),
      }}
    >
      {shown.length ? (
        <ul className="flex flex-col gap-4">
          {shown.map((r) => {
            const over = r.plannedMinor > 0 && r.actualMinor > r.plannedMinor;
            return (
              <li key={r.id}>
                <Link href={r.href} className="group block">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium group-hover:underline">{r.name}</span>
                    <span className="tabular shrink-0 font-semibold">
                      <span className={over ? "text-negative" : undefined}>{money(r.actualMinor)}</span>
                      {r.plannedMinor > 0 && (
                        <span className="text-xs font-normal text-muted-foreground"> of {money(r.plannedMinor)}</span>
                      )}
                    </span>
                  </div>
                  <div className="relative mt-1.5 h-2 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: pct(r.actualMinor), background: over ? "var(--negative)" : META[r.groupKey].color }}
                    />
                    {r.plannedMinor > 0 && (
                      <span
                        aria-hidden
                        className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-foreground/60"
                        style={{ left: pct(r.plannedMinor) }}
                      />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Log some spending to see where it goes.</p>
      )}
    </ChartCard>
  );
}
