"use client";

import Link from "next/link";
import { ChartCard } from "@/components/charts/chart-card";
import { PieSplit } from "@/components/charts/pie-split";
import { BarRanking } from "@/components/charts/bar-ranking";
import { useCurrency } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";

const GROUPS = [
  { key: "needs", label: "Needs", color: "var(--chart-needs)" },
  { key: "wants", label: "Wants", color: "var(--chart-wants)" },
  { key: "investments", label: "Investments", color: "var(--chart-investments)" },
] as const;
type SpendGroup = (typeof GROUPS)[number]["key"];

/** Where this month's income went — part of a whole, four slices. */
export function WhereMoneyWent({
  incomeMinor,
  incomeIsBudgeted,
  spent,
}: {
  incomeMinor: number;
  incomeIsBudgeted: boolean;
  spent: Record<SpendGroup, number>;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const total = GROUPS.reduce((s, g) => s + spent[g.key], 0);
  const left = Math.max(incomeMinor - total, 0);
  const share = (v: number) => (incomeMinor > 0 ? Math.round((v / incomeMinor) * 100) : 0);
  const slices = [
    ...GROUPS.map((g) => ({ key: g.key, label: g.label, value: spent[g.key], display: money(spent[g.key]), color: g.color })),
    // Unspent money takes the neutral stone rather than a fourth group
    // colour: quiet enough not to compete with the three that are actually
    // spending, but --muted would vanish against a white card.
    { key: "left", label: "Not spent", value: left, display: money(left), color: "var(--chart-neutral)" },
  ];
  const top = [...GROUPS].sort((a, b) => spent[b.key] - spent[a.key])[0];

  return (
    <ChartCard
      title="Where your money went"
      takeaway={
        total === 0
          ? "Nothing spent yet this month."
          : incomeMinor <= 0
            ? `${top.label} is your biggest group so far.`
            : left > 0
              ? `${money(left)} of your income is still unspent.`
              : `You've spent ${money(total - incomeMinor)} more than you earned.`
      }
      note={total > 0 && incomeMinor > 0 ? `${top.label} took the most — ${share(spent[top.key])}% of income.` : incomeIsBudgeted ? "Shares are of your budgeted income until income arrives." : undefined}
      table={{ head: ["", "Amount", "Of income"], rows: slices.map((s) => [s.label, s.display, `${share(s.value)}%`]) }}
    >
      {total === 0 && left === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          Log some income and spending to see the split.
        </p>
      ) : (
        <PieSplit slices={slices} total={incomeMinor > 0 ? incomeMinor : total} format={money} />
      )}
    </ChartCard>
  );
}

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
 * Are you close to your target split? Three rows of figures, not a chart —
 * with only three groups there's nothing to see that the percentages don't
 * say outright. The editor for the split lives here too, next to the budget
 * it shapes.
 */
export function TargetCard({
  rows,
  custom,
  editor,
}: {
  rows: TargetRow[];
  custom: boolean;
  editor?: React.ReactNode;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const over = rows.filter((r) => r.actualPercent > r.targetPercent);
  const meta = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

  return (
    <ChartCard
      title="Your target split"
      aside={custom ? "Custom this month" : "Default split"}
      takeaway={
        over.length === 0
          ? "Every group is within its target so far."
          : `${over.map((r) => meta[r.key].label).join(" and ")} ${over.length === 1 ? "is" : "are"} over target.`
      }
      note="Shares of income."
    >
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((r) => {
          const isOver = r.actualPercent > r.targetPercent;
          return (
            <li key={r.key} className="flex items-center gap-3 py-3 first:pt-0">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: meta[r.key].color }} />
              <Link href={r.href} className="flex-1 text-sm font-medium hover:underline">
                {meta[r.key].label}
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
      </ul>
      {editor && <div className="mt-5 border-t border-border pt-4">{editor}</div>}
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
 * The month's other angle on the same rows (over versus under budget) is
 * gone: it ranked the same categories a different way, and the category
 * lists on the group pages already flag what's over.
 */
export function TopCategories({ rows }: { rows: CategorySpend[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const spending = rows.filter((r) => r.actualMinor > 0).sort((a, b) => b.actualMinor - a.actualMinor);
  const total = spending.reduce((s, r) => s + r.actualMinor, 0);
  const shown = spending.slice(0, 8);
  const color = Object.fromEntries(GROUPS.map((g) => [g.key, g.color]));
  const over = spending.filter((r) => r.plannedMinor > 0 && r.actualMinor > r.plannedMinor);

  return (
    <ChartCard
      title="Where it goes"
      takeaway={shown[0] ? `${shown[0].name} is your biggest line — ${Math.round((shown[0].actualMinor / total) * 100)}% of spending.` : "Nothing spent yet this month."}
      note={
        [
          spending.length > 8 ? `Top 8 of ${spending.length} categories.` : null,
          over.length ? `${over.length} over budget.` : null,
        ]
          .filter(Boolean)
          .join(" ") || undefined
      }
      table={{
        head: ["Category", "Spent", "Budgeted"],
        rows: spending.map((r) => [r.name, money(r.actualMinor), money(r.plannedMinor)]),
      }}
    >
      {shown.length ? (
        <BarRanking
          valueLabel="Spent"
          format={money}
          compact={(m) => formatCompact(m, currency)}
          items={shown.map((r) => ({
            key: r.id,
            label: r.name,
            value: r.actualMinor,
            color: color[r.groupKey],
            sub: r.plannedMinor > 0 ? `of ${money(r.plannedMinor)} budgeted` : "not budgeted",
          }))}
        />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Log some spending to see where it goes.</p>
      )}
    </ChartCard>
  );
}
