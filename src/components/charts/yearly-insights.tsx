"use client";

import { ChartCard } from "@/components/charts/chart-card";
import { BarTrend } from "@/components/charts/bar-trend";
import { useCurrency, useLocale } from "@/components/currency-provider";
import { formatMoney } from "@/lib/money";
import { formatMonthShort } from "@/lib/dates";

export type YearMonth = {
  month: string;
  income: number;
  expense: number;
  saved: number;
  needs: number;
  wants: number;
  investments: number;
};

const active = (m: YearMonth) => m.income !== 0 || m.expense !== 0;

/**
 * The year's one chart: which months you saved and which you overspent.
 *
 * A running total of the same figures, a savings-rate dial and a per-month
 * group mix all used to sit alongside it. They were the same story told
 * three more times; the savings rate lives in the hero above.
 */
export function MonthlySavings({
  months,
}: {
  months: YearMonth[];
}) {
  const currency = useCurrency();
  const locale = useLocale();
  const money = (m: number) => formatMoney(m, { currency, signed: true });
  const plain = (m: number) => formatMoney(m, { currency });
  const seen = months.filter(active);
  // The savings rate is the hero's note now; showing it here as well put the
  // same figure on screen twice.
  return (
    <ChartCard
      title="Saved each month"
      legend={[
        { label: "Saved", color: "var(--positive)" },
        { label: "Overspent", color: "var(--negative)" },
      ]}
      table={{
        head: ["Month", "Income", "Spent", "Saved"],
        rows: seen.map((m) => [formatMonthShort(m.month, locale), plain(m.income), plain(m.expense), money(m.saved)]),
      }}
    >
      <BarTrend
        data={months.map((m) => ({
          label: formatMonthShort(m.month, locale),
          value: m.saved,
          color: m.saved >= 0 ? "var(--positive)" : "var(--negative)",
          extra: active(m)
            ? [
                { label: "income", value: plain(m.income) },
                { label: "spent", value: plain(m.expense) },
              ]
            : undefined,
        }))}
        color="var(--positive)"
        valueLabel="Saved"
        format={money}
      />
    </ChartCard>
  );
}
