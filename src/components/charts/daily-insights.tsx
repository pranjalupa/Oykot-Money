"use client";

import { Money } from "@/components/money";
import { ChartCard } from "@/components/charts/chart-card";
import { RadialProgress } from "@/components/charts/radial-progress";
import { AreaTrend } from "@/components/charts/area-trend";
import { CalendarHeatmap } from "@/components/charts/calendar-heatmap";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatMoney } from "@/lib/money";
import { formatDay } from "@/lib/dates";

type Day = { date: string; totalMinor: number };
const iso = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;
const daysIn = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Where spending stands against a straight line from nothing to the budget. */
function pace(budget: number, spent: number, throughDay: number, last: number) {
  if (budget <= 0 || throughDay <= 0) return null;
  const expected = Math.round((budget * Math.min(throughDay, last)) / last);
  return { expected, diff: expected - spent };
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-heading text-xl font-semibold">{value}</dd>
      {sub && <dd className="mt-0.5 text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}

/** The question Daily exists to answer: how much can I spend today? */
export function DailyHero({
  month,
  budgetMinor,
  spentMinor,
  remainingMinor,
  safePerDayMinor,
  daysLeft,
  isCurrentMonth,
  throughDay,
}: {
  month: string;
  budgetMinor: number;
  spentMinor: number;
  remainingMinor: number;
  safePerDayMinor: number;
  daysLeft: number;
  isCurrentMonth: boolean;
  throughDay: number;
}) {
  const currency = useCurrency();
  const money = (m: number) => formatMoney(m, { currency });
  const used = budgetMinor > 0 ? Math.round((spentMinor / budgetMinor) * 100) : 0;
  const over = remainingMinor < 0;
  const p = pace(budgetMinor, spentMinor, throughDay, daysIn(month));

  return (
    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-12">
        <RadialProgress
          percent={used}
          color={over ? "var(--negative)" : "var(--primary)"}
          label={`${used}% of this month's Needs and Wants budget used`}
        >
          <span className="text-xs text-muted-foreground">
            {isCurrentMonth ? "Safe to spend today" : "Per day"}
          </span>
          <span className="mt-1 font-heading text-3xl font-bold">
            <Money minor={safePerDayMinor} tone={over ? "negative" : "default"} />
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {budgetMinor > 0 ? `${used}% of budget used` : "No budget set"}
          </span>
        </RadialProgress>

        <dl className="grid w-full flex-1 grid-cols-2 gap-x-6 gap-y-7">
          <Stat label="Remaining" value={<Money minor={remainingMinor} tone="auto" />} sub="Needs and Wants" />
          <Stat label="Spent" value={<Money minor={spentMinor} />} sub={`of ${money(budgetMinor)} budgeted`} />
          <Stat
            label={isCurrentMonth ? "Days left" : "Days in month"}
            value={daysLeft}
            sub={isCurrentMonth ? "including today" : undefined}
          />
          <Stat
            label="Pace"
            value={!p ? "—" : p.diff >= 0 ? "Under pace" : "Over pace"}
            sub={!p ? undefined : p.diff >= 0 ? `${money(p.diff)} to spare` : `${money(-p.diff)} more than planned by now`}
          />
        </dl>
      </div>
    </section>
  );
}

/**
 * Spending so far against the budget's even pace. Fixed costs counted as
 * assumed-spent have no date, so they're counted from day one.
 */
export function PaceCard({
  month,
  days,
  budgetMinor,
  spentMinor,
  throughDay,
}: {
  month: string;
  days: Day[];
  budgetMinor: number;
  spentMinor: number;
  throughDay: number;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const last = daysIn(month);

  if (budgetMinor <= 0) {
    return (
      <ChartCard title="Spending pace">
        <p className="py-12 text-center text-sm text-muted-foreground">
          Set a budget for Needs and Wants to see whether you&rsquo;re on pace.
        </p>
      </ChartCard>
    );
  }

  const byDate = new Map(days.map((d) => [d.date, d.totalMinor]));
  const assumed = Math.max(0, spentMinor - days.reduce((s, d) => s + d.totalMinor, 0));
  const cumulative: number[] = [];
  for (let d = 1; d <= last; d++) cumulative.push((cumulative[d - 2] ?? assumed) + (byDate.get(iso(month, d)) ?? 0));
  const data = cumulative.map((total, i) => ({
    label: String(i + 1),
    title: formatDay(iso(month, i + 1), locale),
    value: i + 1 <= throughDay ? total : null,
    reference: Math.round((budgetMinor * (i + 1)) / last),
  }));
  const p = pace(budgetMinor, spentMinor, throughDay, last);

  return (
    <ChartCard
      title="Spending pace"
      legend={[
        { label: "Spent so far", color: "var(--primary)", kind: "line" },
        { label: "Budget pace", color: "var(--muted-foreground)", kind: "dashed" },
      ]}
      takeaway={
        !p
          ? "The month hasn't started yet."
          : p.diff >= 0
            ? `You're ${money(p.diff)} under your budget pace.`
            : `You're ${money(-p.diff)} over your budget pace.`
      }
      note={assumed > 0 ? `Starts at ${money(assumed)} of fixed costs you assume are spent.` : "Under the dashed line means on track."}
      table={{
        head: ["Day", "Spent so far", "Budget pace"],
        rows: data.map((d) => [d.title, d.value === null ? "—" : money(d.value), money(d.reference)]),
      }}
    >
      <AreaTrend data={data} color="var(--primary)" valueLabel="Spent so far" referenceLabel="Budget pace" format={money} />
    </ChartCard>
  );
}

/** Which days were expensive — the month as a calendar. */
export function SpendingCalendar({
  month,
  days,
  today,
}: {
  month: string;
  days: Day[];
  today: string;
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency });
  const values = Object.fromEntries(days.map((d) => [d.date, d.totalMinor]));
  const biggest = [...days].sort((a, b) => b.totalMinor - a.totalMinor)[0];
  const last = daysIn(month);
  const elapsed = Array.from({ length: last }, (_, i) => iso(month, i + 1)).filter((d) => d <= today);
  const quiet = elapsed.filter((d) => !values[d]).length;

  return (
    <ChartCard
      title="Spending calendar"
      takeaway={biggest ? `Biggest day: ${formatDay(biggest.date, locale)}, ${money(biggest.totalMinor)}.` : "Nothing spent yet this month."}
      note={elapsed.length ? `${quiet} no-spend day${quiet === 1 ? "" : "s"} so far. Needs and Wants only.` : undefined}
      table={{
        head: ["Day", "Spent"],
        rows: [...days].sort((a, b) => a.date.localeCompare(b.date)).map((d) => [formatDay(d.date, locale), money(d.totalMinor)]),
        note: "Days with no spending are left out.",
      }}
    >
      <CalendarHeatmap month={month} values={values} format={money} locale={locale} today={today} />
    </ChartCard>
  );
}
