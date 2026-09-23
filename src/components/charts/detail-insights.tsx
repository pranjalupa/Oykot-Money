"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { BarTrend } from "@/components/charts/bar-trend";
import { LineTrend } from "@/components/charts/line-trend";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatCompact, formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

/**
 * How a group or category stands against its budget: the figure that answers
 * it, a bar, and the two numbers behind it on one line.
 *
 * It used to print the headline figure a second time in a four-stat grid
 * ("Left to spend ₹5,001" above "Remaining ₹5,001"), with "Used 44%" saying
 * what a bar says better. Same shape as the heroes on Home now, so every
 * summary in the app reads the same way.
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
  const pct = plannedMinor > 0 ? Math.round((spentMinor / plannedMinor) * 100) : 0;
  const diff = plannedMinor - spentMinor;
  const over = !isIncome && diff < 0;
  const unplanned = plannedMinor <= 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <p className="text-sm font-medium text-muted-foreground">
        {unplanned ? (isIncome ? "Received" : "Spent") : isIncome ? "Still expected" : over ? "Over budget" : "Left to spend"}
      </p>
      <p className="mt-1.5 font-heading text-[2.75rem] leading-none font-bold tracking-tight sm:text-5xl">
        {unplanned ? (
          <Money minor={spentMinor} />
        ) : (
          <Money minor={Math.abs(diff)} tone={over ? "negative" : "default"} />
        )}
      </p>

      {!unplanned && (
        <div
          role="progressbar"
          aria-label={isIncome ? "Received against expected" : "Budget used"}
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full rounded-full ${over ? "bg-negative" : "bg-primary"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      )}

      <p className="mt-3 text-sm text-muted-foreground">
        <Money minor={spentMinor} className="font-semibold text-foreground" />{" "}
        {isIncome ? "received" : "spent"}
        {!unplanned && (
          <>
            {" of "}
            {formatMoney(plannedMinor, { currency })}
            <span aria-hidden className="mx-1.5">·</span>
            {pct}% used
          </>
        )}
      </p>
      {footnote && <p className="mt-2 text-xs text-muted-foreground">{footnote}</p>}
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
          One point so far: <span className="ml-1 font-medium text-foreground">{last ? money(last.totalMinor) : "none"}</span>
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
