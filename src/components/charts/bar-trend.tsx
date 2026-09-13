"use client";

import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox, X_AXIS } from "@/components/charts/chart-card";

export type BarPoint = {
  label: string;
  value: number;
  /** Per-bar colour — saved months green, overspent months red. */
  color?: string;
  /** The current month, drawn solid while history sits back at 55%. */
  highlight?: boolean;
  /** Extra tooltip rows: the budget behind the bar, an "assumed" flag. */
  extra?: { label: string; value: string }[];
};

/**
 * A plain column chart, one bar per month. Used wherever the question is
 * "which periods were high or low" — saved each month, the six-month trend.
 */
export function BarTrend({
  data,
  color,
  valueLabel,
  format,
  reference,
  referenceLabel,
  height = 220,
}: {
  data: BarPoint[];
  color: string;
  valueLabel: string;
  format: (minor: number) => string;
  /** A dashed line across the chart — this month's budget. */
  reference?: number;
  referenceLabel?: string;
  height?: number;
}) {
  const anyHighlight = data.some((d) => d.highlight);

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...X_AXIS} interval="preserveStartEnd" minTickGap={6} />
        <YAxis hide />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 8 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as BarPoint;
            return (
              <TooltipBox
                title={p.label}
                rows={[
                  { label: valueLabel.toLowerCase(), value: format(p.value), color: p.color ?? color },
                  ...(p.extra ?? []),
                ]}
              />
            );
          }}
        />
        {/* Zero line, so bars below it read as overspending rather than a short bar. */}
        {data.some((d) => d.value < 0) && <ReferenceLine y={0} stroke="var(--border)" />}
        {reference !== undefined && reference > 0 && (
          <ReferenceLine
            y={reference}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={
              referenceLabel
                ? { value: referenceLabel, position: "insideTopRight", fill: "var(--muted-foreground)", fontSize: 11 }
                : undefined
            }
          />
        )}
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={44} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.color ?? color}
              fillOpacity={!anyHighlight || d.highlight ? 1 : 0.55}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
