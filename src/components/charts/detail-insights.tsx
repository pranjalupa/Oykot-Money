"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrend } from "@/components/charts/bar-trend";
import { LineTrend } from "@/components/charts/line-trend";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold">{value}</dd>
    </div>
  );
}

/**
 * How a group or category stands against its budget: the headline figure,
 * then the four numbers behind it in one row.
 *
 * Same shape as the Net worth card on Money — a label, one big number, and a
 * divided row of stats — so every summary in the app reads the same way.
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
  const pct = plannedMinor > 0 ? Math.round((spentMinor / plannedMinor) * 100) : 0;
  const diff = plannedMinor - spentMinor;
  const over = !isIncome && diff < 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {plannedMinor <= 0 ? (isIncome ? "Received" : "Spent") : isIncome ? "Still expected" : over ? "Over budget" : "Left to spend"}
      </p>
      <p className="mt-1 font-heading text-4xl font-bold">
        {plannedMinor <= 0 ? (
          <Money minor={spentMinor} />
        ) : (
          <Money minor={Math.abs(diff)} tone={over ? "negative" : "default"} />
        )}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
        <Stat label={isIncome ? "Received" : "Spent"} value={<Money minor={spentMinor} tone={spentMinor ? "default" : "muted"} />} />
        <Stat label="Budgeted" value={<Money minor={plannedMinor} tone={plannedMinor ? "default" : "muted"} />} />
        <Stat label={isIncome ? "Received" : "Used"} value={plannedMinor > 0 ? `${pct}%` : "—"} />
        <Stat
          label={isIncome ? "Still expected" : over ? "Over by" : "Remaining"}
          value={<Money minor={Math.abs(diff)} tone={over ? "negative" : plannedMinor ? "default" : "muted"} />}
        />
      </dl>
      {footnote && <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>}
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
  const any = points.some((p) => p.spentMinor || p.budgetedMinor);

  return (
    <ChartCard
      title={title}
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
  const last = points[points.length - 1];
  return (
    <ChartCard
      title="Net worth over time"
      aside={last ? formatCompact(last.totalMinor, currency) : undefined}
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
