"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { RadialProgress } from "@/components/charts/radial-progress";
import { ColumnTrend } from "@/components/charts/column-trend";
import { AreaTrend } from "@/components/charts/area-trend";
import { RankedBars } from "@/components/charts/ranked-bars";
import { DivergingBars } from "@/components/charts/diverging-bars";
import { Donut } from "@/components/charts/donut";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

type GroupKey = "needs" | "wants" | "investments" | "income";
/** Chart colour for a group; Income isn't part of the stacked palette. */
export const groupColor = (g: GroupKey) => (g === "income" ? "var(--primary)" : `var(--chart-${g})`);

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-semibold">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

/** How much of a group's (or category's) budget is used — a ring in its colour. */
export function BudgetRing({
  groupKey,
  spentMinor,
  plannedMinor,
  isIncome,
  footnote,
}: {
  groupKey: GroupKey;
  spentMinor: number;
  plannedMinor: number;
  isIncome: boolean;
  footnote?: string;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const pct = plannedMinor > 0 ? Math.round((spentMinor / plannedMinor) * 100) : 0;
  const diff = plannedMinor - spentMinor;
  const over = !isIncome && diff < 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
        <RadialProgress
          percent={pct}
          color={over ? "var(--negative)" : groupColor(groupKey)}
          size={176}
          label={`${pct}% of budget ${isIncome ? "received" : "used"}`}
        >
          {plannedMinor <= 0 ? (
            <span className="text-sm text-muted-foreground">No budget set</span>
          ) : isIncome ? (
            <>
              <span className="font-heading text-3xl font-bold">{pct}%</span>
              <span className="mt-0.5 text-xs text-muted-foreground">received</span>
            </>
          ) : (
            <>
              <span className="font-heading text-2xl font-bold">
                <Money minor={Math.abs(diff)} tone={over ? "negative" : "default"} />
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">{over ? "over budget" : "left"}</span>
            </>
          )}
        </RadialProgress>
        <dl className="grid w-full flex-1 grid-cols-2 gap-x-6 gap-y-7">
          <Stat label={isIncome ? "Received" : "Spent"} value={<Money minor={spentMinor} />} />
          <Stat label="Budgeted" value={<Money minor={plannedMinor} tone={plannedMinor ? "default" : "muted"} />} />
          <Stat label={isIncome ? "Received" : "Used"} value={plannedMinor > 0 ? `${pct}%` : "—"} sub={footnote} />
          <Stat
            label={isIncome ? "Still expected" : over ? "Over by" : "Remaining"}
            value={<Money minor={Math.abs(diff)} tone={over ? "negative" : "default"} />}
          />
        </dl>
      </div>
      {plannedMinor > 0 && <p className="sr-only">{money(spentMinor)} of {money(plannedMinor)}</p>}
    </section>
  );
}

type TrendPoint = { month: string; budgetedMinor: number; spentMinor: number; assumed?: boolean };

/** Six months: is this month normal? Past months soft, this one solid. */
export function PeriodTrend({
  title,
  points,
  color,
  isIncome,
}: {
  title: string;
  points: TrendPoint[];
  color: string;
  isIncome: boolean;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const verb = isIncome ? "received" : "spent";
  const current = points[points.length - 1];
  const earlier = points.slice(0, -1).filter((p) => p.spentMinor > 0);
  const avg = earlier.length ? Math.round(earlier.reduce((s, p) => s + p.spentMinor, 0) / earlier.length) : null;
  const any = points.some((p) => p.spentMinor || p.budgetedMinor);
  const delta = avg === null || !current ? null : current.spentMinor - avg;

  return (
    <ChartCard
      title={title}
      takeaway={
        !any
          ? "No history yet."
          : delta === null
            ? "Your history starts here — next month adds a comparison."
            : delta === 0
              ? `Right on your ${earlier.length}-month average.`
              : `This month is ${money(Math.abs(delta))} ${delta < 0 ? "below" : "above"} your ${earlier.length}-month average.`
      }
      note={current && current.budgetedMinor > 0 ? `Dashed line: this month's budget, ${money(current.budgetedMinor)}.` : undefined}
      table={{
        head: ["Month", "Budgeted", isIncome ? "Received" : "Spent"],
        rows: points.map((p) => [formatMonthShort(p.month, locale), money(p.budgetedMinor), `${money(p.spentMinor)}${p.assumed ? " (assumed)" : ""}`]),
      }}
    >
      {any ? (
        <ColumnTrend
          data={points.map((p, i) => ({
            label: formatMonthShort(p.month, locale),
            value: p.spentMinor,
            highlight: i === points.length - 1,
            tag: p.spentMinor > 0 ? formatCompact(p.spentMinor, currency) : undefined,
            extra: [{ label: "budgeted", value: money(p.budgetedMinor) }, ...(p.assumed ? [{ label: "", value: "assumed" }] : [])],
          }))}
          color={color}
          valueLabel={verb[0].toUpperCase() + verb.slice(1)}
          format={money}
          reference={current?.budgetedMinor || undefined}
          referenceLabel="Budget"
        />
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">Nothing budgeted or {verb} in the last six months.</p>
      )}
    </ChartCard>
  );
}

/** Where a category's money actually goes, by merchant. */
export function MerchantBreakdown({
  items,
  categoryName,
  color,
}: {
  items: { label: string; totalMinor: number; count: number }[];
  categoryName: string;
  color: string;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const total = items.reduce((s, i) => s + i.totalMinor, 0);
  const top = items[0];
  return (
    <ChartCard
      title="Where it goes"
      takeaway={top && total > 0 ? `${top.label} is ${Math.round((top.totalMinor / total) * 100)}% of ${categoryName} this month.` : `Nothing logged in ${categoryName} this month.`}
      note={items.length ? "From the merchant or note on each transaction." : undefined}
      table={{ head: ["Merchant", "Spent", "Transactions"], rows: items.map((i) => [i.label, money(i.totalMinor), String(i.count)]) }}
    >
      {items.length ? (
        <RankedBars
          items={items.map((i) => ({
            key: i.label,
            label: i.label,
            value: i.totalMinor,
            display: money(i.totalMinor),
            color,
            sub: `${i.count} transaction${i.count === 1 ? "" : "s"} · ${Math.round((i.totalMinor / total) * 100)}%`,
          }))}
        />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Transactions you log here will be broken down by merchant.</p>
      )}
    </ChartCard>
  );
}

/** Is net worth growing? One soft line of the monthly snapshots. */
export function NetWorthTrend({ points }: { points: { month: string; totalMinor: number }[] }) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const first = points[0];
  const last = points[points.length - 1];
  const change = first && last ? last.totalMinor - first.totalMinor : 0;
  return (
    <ChartCard
      title="Net worth over time"
      takeaway={
        points.length < 2
          ? "Your history starts this month."
          : change === 0
            ? `Unchanged since ${formatMonthShort(first.month, locale)}.`
            : `${change > 0 ? "Up" : "Down"} ${money(Math.abs(change))} since ${formatMonthShort(first.month, locale)}.`
      }
      note={points.length < 2 ? "Each month is recorded as you use the app — check back next month for the line." : "Each point is the last value seen that month."}
      table={{ head: ["Month", "Net worth"], rows: points.map((p) => [formatMonthShort(p.month, locale), money(p.totalMinor)]) }}
    >
      {points.length < 2 ? (
        <div className="flex h-[200px] items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground">
          One point so far: <span className="ml-1 font-medium text-foreground">{last ? money(last.totalMinor) : "—"}</span>
        </div>
      ) : (
        <AreaTrend
          data={points.map((p) => ({ label: formatMonthShort(p.month, locale), value: p.totalMinor }))}
          color="var(--primary)"
          valueLabel="Net worth"
          format={money}
          fromZero={false}
          height={220}
        />
      )}
    </ChartCard>
  );
}

/** What net worth is made of — what you hold, as a whole. */
export function NetWorthMix({
  cash,
  assets,
  owedToYou,
  youOwe,
  total,
}: {
  cash: number;
  assets: number;
  owedToYou: number;
  youOwe: number;
  total: number;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const parts = [
    { key: "cash", label: "Cash", value: Math.max(cash, 0), color: "var(--chart-investments)" },
    { key: "assets", label: "Assets", value: Math.max(assets, 0), color: "var(--chart-needs)" },
    { key: "owed", label: "Owed to you", value: Math.max(owedToYou, 0), color: "var(--chart-wants)" },
  ].map((p) => ({ ...p, display: money(p.value) }));
  const held = parts.reduce((s, p) => s + p.value, 0);
  const top = [...parts].sort((a, b) => b.value - a.value)[0];
  const share = (v: number) => (held > 0 ? Math.round((v / held) * 100) : 0);

  return (
    <ChartCard
      title="What it's made of"
      takeaway={held > 0 ? `${top.label} is ${share(top.value)}% of what you hold.` : "Add an account or asset to see this."}
      note={youOwe > 0 ? `Net worth is this, minus ${money(youOwe)} you owe.` : undefined}
      table={{ head: ["", "Amount", "Share"], rows: [...parts.map((p) => [p.label, p.display, `${share(p.value)}%`]), ...(youOwe > 0 ? [["You owe", `−${money(youOwe)}`, ""]] : [])] }}
    >
      <div className="flex flex-col items-center gap-6">
        <Donut slices={parts} size={180} thickness={22} label={`Net worth ${money(total)}`}>
          <span className="text-xs text-muted-foreground">Net worth</span>
          <span className="mt-1 font-heading text-lg font-bold"><Money minor={total} /></span>
        </Donut>
        <ul className="flex w-full flex-col gap-3 text-sm">
          {parts.map((p) => (
            <li key={p.key} className="flex items-center gap-3">
              <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
              <span className="flex-1">{p.label}</span>
              <span className="tabular font-medium">{p.display}</span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}

/** Who owes whom — owed to you to the right, what you owe to the left. */
export function PeopleBalances({ people }: { people: { id: string; name: string; balanceMinor: number }[] }) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const open = people.filter((p) => p.balanceMinor !== 0).sort((a, b) => Math.abs(b.balanceMinor) - Math.abs(a.balanceMinor));
  if (!open.length) return null;
  const top = open[0];
  return (
    <ChartCard
      title="Balances"
      takeaway={top.balanceMinor > 0 ? `${top.name} owes you the most — ${money(top.balanceMinor)}.` : `You owe ${top.name} the most — ${money(-top.balanceMinor)}.`}
      table={{ head: ["Person", "Balance"], rows: open.map((p) => [p.name, p.balanceMinor > 0 ? `owes you ${money(p.balanceMinor)}` : `you owe ${money(-p.balanceMinor)}`]) }}
    >
      <DivergingBars
        leftLabel="You owe"
        rightLabel="Owes you"
        leftColor="var(--negative)"
        rightColor="var(--positive)"
        items={open.slice(0, 8).map((p) => ({
          key: p.id,
          label: p.name,
          value: p.balanceMinor,
          display: money(Math.abs(p.balanceMinor)),
        }))}
      />
    </ChartCard>
  );
}
