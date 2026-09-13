"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrend } from "@/components/charts/bar-trend";
import { LineTrend } from "@/components/charts/line-trend";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-semibold">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

/**
 * How a group or category stands against its budget: the headline figure,
 * then the four numbers behind it.
 *
 * This was a dial. The dial drew one number — percent used — that the grid
 * beside it already carried, so it went.
 */
export function BudgetSummary({
  spentMinor,
  plannedMinor,
  isIncome,
  footnote,
}: {
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
      <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-12">
        <div className="shrink-0">
          <p className="text-xs text-muted-foreground">
            {plannedMinor <= 0 ? "Spent" : isIncome ? "Received" : over ? "Over budget" : "Left to spend"}
          </p>
          <p className="mt-1 font-heading text-4xl font-bold">
            {plannedMinor <= 0 ? (
              <Money minor={spentMinor} />
            ) : (
              <Money minor={Math.abs(diff)} tone={over ? "negative" : "default"} />
            )}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {plannedMinor > 0
              ? `${pct}% of ${money(plannedMinor)} ${isIncome ? "received" : "used"}`
              : "No budget set"}
          </p>
        </div>

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
        <BarTrend
          data={points.map((p, i) => ({
            label: formatMonthShort(p.month, locale),
            value: p.spentMinor,
            highlight: i === points.length - 1,
            extra: [
              { label: "budgeted", value: money(p.budgetedMinor) },
              ...(p.assumed ? [{ label: "", value: "assumed" }] : []),
            ],
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

/**
 * Is net worth growing? One line of the monthly snapshots — the only place
 * those snapshots are read, and the only history the app can't recompute.
 */
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
      aside={last ? formatCompact(last.totalMinor, currency) : undefined}
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
        <LineTrend
          data={points.map((p) => ({ label: formatMonthShort(p.month, locale), value: p.totalMinor }))}
          color="var(--primary)"
          valueLabel="Net worth"
          format={money}
          fromZero={false}
        />
      )}
    </ChartCard>
  );
}
