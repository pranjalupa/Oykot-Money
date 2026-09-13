"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox } from "@/components/charts/chart-card";

export type Slice = {
  key: string;
  label: string;
  value: number;
  display: string;
  color: string;
};

/**
 * A pie chart with the figures listed beside it. The list isn't decoration:
 * a pie alone makes people compare angles, and the amounts are what they
 * actually came for.
 */
export function PieSplit({
  slices,
  total,
  format,
  size = 200,
}: {
  slices: Slice[];
  /** Denominator for the share column — income, usually, not the pie's own sum. */
  total: number;
  format: (minor: number) => string;
  size?: number;
}) {
  const drawn = slices.filter((s) => s.value > 0);
  const share = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-8">
      <ChartContainer
        config={Object.fromEntries(slices.map((s) => [s.key, { label: s.label, color: s.color }]))}
        className="aspect-square shrink-0"
        style={{ width: size, height: size }}
      >
        <PieChart>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as Slice;
              return (
                <TooltipBox
                  title={p.label}
                  rows={[{ label: `${share(p.value)}% of income`, value: p.display, color: p.color }]}
                />
              );
            }}
          />
          <Pie
            data={drawn}
            dataKey="value"
            nameKey="label"
            outerRadius="100%"
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

      <ul className="flex w-full max-w-64 flex-col gap-3.5 text-sm">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-3">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="tabular font-medium">{s.display}</span>
            <span className="tabular w-10 text-right text-xs text-muted-foreground">{share(s.value)}%</span>
          </li>
        ))}
      </ul>
      <span className="sr-only">Total {format(total)}</span>
    </div>
  );
}
