"use client";

import { Bar, BarChart, Cell, CartesianGrid, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox, X_AXIS, Y_AXIS } from "@/components/charts/chart-card";
import { useCurrency } from "@/components/currency-provider";
import { formatCompact } from "@/lib/money";

export type BarPoint = {
  label: string;
  value: number;
  /** Per-bar colour — saved months green, overspent months red. */
  color?: string;
  /** The current month, drawn solid while history sits back at 55%. */
  highlight?: boolean;
  /** Extra tooltip rows, such as the budget behind the bar. */
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
  height,
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
  const currency = useCurrency();
  const anyHighlight = data.some((d) => d.highlight);

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      // Short on phones so the list below still shows; taller from sm.
      className={height ? "aspect-auto w-full" : "aspect-auto h-[170px] w-full sm:h-[220px]"}
      style={height ? { height } : undefined}
    >
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...X_AXIS} interval="preserveStartEnd" minTickGap={6} />
        <YAxis {...Y_AXIS} tickFormatter={(v: number) => formatCompact(v, currency)} />
        {/* Pinned to the top edge, clear of the thumb doing the tapping. */}
        <Tooltip
          position={{ y: 0 }}
          wrapperStyle={{ zIndex: 10, pointerEvents: "none" }}
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
            // A halo in the card's colour: the label sits over the tallest
            // bars, and without one it read as part of them.
            label={
              referenceLabel
                ? {
                    value: `${referenceLabel} ${formatCompact(reference, currency)}`,
                    position: "insideTopRight",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                    stroke: "var(--card)",
                    strokeWidth: 4,
                    paintOrder: "stroke",
                  }
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
