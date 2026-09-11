"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { Donut } from "@/components/charts/donut";
import { BulletBars } from "@/components/charts/bullet-bars";
import { RankedBars } from "@/components/charts/ranked-bars";
import { DivergingBars } from "@/components/charts/diverging-bars";
import { useCurrency } from "@/components/currency-provider";
import { formatMoney } from "@/lib/money";

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
    // Unspent money is drawn as empty track, not a heavy slice competing with spending.
    { key: "left", label: "Not spent", value: left, display: money(left), color: "var(--muted)" },
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
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:justify-center sm:gap-10">
        <Donut slices={slices} label={`Spent ${money(total)} of ${money(incomeMinor)} income`}>
          <span className="text-xs text-muted-foreground">Spent</span>
          <span className="mt-1 font-heading text-2xl font-bold"><Money minor={total} /></span>
          {incomeMinor > 0 && <span className="mt-1 text-xs text-muted-foreground">of {money(incomeMinor)}</span>}
        </Donut>
        <ul className="flex w-full max-w-60 flex-col gap-3.5 text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex items-center gap-3">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="flex-1">{s.label}</span>
              <span className="tabular font-medium">{s.display}</span>
              <span className="tabular w-10 text-right text-xs text-muted-foreground">{share(s.value)}%</span>
            </li>
          ))}
        </ul>
      </div>
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

/** Close to your target split? A bar per group against its target mark. */
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
      note="Shares of income. The dark mark is your target."
      table={{
        head: ["Group", "Spent", "Budgeted", "Target"],
        rows: rows.map((r) => [meta[r.key].label, `${r.actualPercent}%`, `${r.plannedPercent}%`, `${r.targetPercent}%`]),
      }}
    >
      <BulletBars
        items={rows.map((r) => ({
          key: r.key,
          label: meta[r.key].label,
          color: meta[r.key].color,
          href: r.href,
          spent: r.actualPercent,
          budgeted: r.plannedPercent,
          target: r.targetPercent,
          status:
            r.actualPercent > r.targetPercent
              ? `${r.actualPercent - r.targetPercent} pts over target`
              : `${r.actualPercent}% of ${r.targetPercent}% target`,
          detail: `Spent ${money(r.actualMinor)} · budgeted ${money(r.plannedMinor)}`,
        }))}
      />
      {editor && <div className="mt-6 border-t border-border pt-4">{editor}</div>}
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

/** Which categories take the most — biggest first, coloured by group. */
export function TopCategories({ rows }: { rows: CategorySpend[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const spending = rows.filter((r) => r.actualMinor > 0).sort((a, b) => b.actualMinor - a.actualMinor);
  const total = spending.reduce((s, r) => s + r.actualMinor, 0);
  const shown = spending.slice(0, 8);
  const color = Object.fromEntries(GROUPS.map((g) => [g.key, g.color]));

  return (
    <ChartCard
      title="Where it goes"
      takeaway={shown[0] ? `${shown[0].name} is your biggest line — ${Math.round((shown[0].actualMinor / total) * 100)}% of spending.` : "Nothing spent yet this month."}
      note={spending.length > 8 ? `Top 8 of ${spending.length} categories. The pale bar is the budget.` : "The pale bar is the budget."}
      table={{
        head: ["Category", "Spent", "Budgeted"],
        rows: spending.map((r) => [r.name, money(r.actualMinor), money(r.plannedMinor)]),
      }}
    >
      {shown.length ? (
        <RankedBars
          items={shown.map((r) => ({
            key: r.id,
            label: r.name,
            href: r.href,
            value: r.actualMinor,
            track: r.plannedMinor,
            display: money(r.actualMinor),
            color: color[r.groupKey],
            sub: r.plannedMinor > 0 ? `of ${money(r.plannedMinor)} budgeted` : "Not budgeted",
          }))}
        />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Log some spending to see where it goes.</p>
      )}
    </ChartCard>
  );
}

/** Where did I overspend? Over to the left, room to spare to the right. */
export function OverUnder({ rows }: { rows: CategorySpend[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const budgeted = rows.filter((r) => r.plannedMinor > 0 || r.actualMinor > 0);
  const sorted = [...budgeted].sort((a, b) => a.plannedMinor - a.actualMinor - (b.plannedMinor - b.actualMinor));
  const over = sorted.filter((r) => r.actualMinor > r.plannedMinor);
  const overBy = over.reduce((s, r) => s + (r.actualMinor - r.plannedMinor), 0);

  return (
    <ChartCard
      title="Over and under budget"
      takeaway={
        over.length === 0
          ? "Nothing is over budget this month."
          : `${over.length} categor${over.length === 1 ? "y is" : "ies are"} over budget, by ${money(overBy)} in total.`
      }
      note={over[0] ? `${over[0].name} is furthest over.` : undefined}
      table={{
        head: ["Category", "Budgeted", "Spent", "Difference"],
        rows: sorted.map((r) => [r.name, money(r.plannedMinor), money(r.actualMinor), money(r.plannedMinor - r.actualMinor)]),
      }}
    >
      {sorted.length ? (
        <DivergingBars
          leftLabel="Over budget"
          rightLabel="Left to spend"
          leftColor="var(--negative)"
          rightColor="var(--positive)"
          items={sorted.slice(0, 8).map((r) => {
            const d = r.plannedMinor - r.actualMinor;
            return {
              key: r.id,
              label: r.name,
              href: r.href,
              value: d,
              display: d >= 0 ? `${money(d)} left` : `${money(-d)} over`,
            };
          })}
        />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Set some budgets to compare against.</p>
      )}
    </ChartCard>
  );
}
