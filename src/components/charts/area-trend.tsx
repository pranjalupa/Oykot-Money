"use client";

import { useId } from "react";
import { Area, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox, X_AXIS } from "@/components/charts/chart-card";

export type AreaPoint = {
  label: string;
  /** Tooltip heading; defaults to `label`. */
  title?: string;
  value: number | null;
  reference?: number;
};

/**
 * One soft area for a single measure over time, optionally with a dashed
 * reference line (a budget pace, a target). Gradient fill, no y-axis, no grid.
 */
export function AreaTrend({
  data,
  color,
  valueLabel,
  referenceLabel,
  format,
  height = 240,
  fromZero = true,
}: {
  data: AreaPoint[];
  color: string;
  valueLabel: string;
  referenceLabel?: string;
  format: (minor: number) => string;
  height?: number;
  /** Start the scale at zero (amounts) or let it hug the data (net worth). */
  fromZero?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color }, reference: { label: referenceLabel ?? "", color: "var(--muted-foreground)" } }}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" {...X_AXIS} interval="preserveStartEnd" minTickGap={28} />
        <YAxis hide domain={fromZero ? [0, "auto"] : ["auto", "auto"]} />
        <Tooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as AreaPoint;
            return (
              <TooltipBox
                title={p.title ?? p.label}
                rows={[
                  ...(p.value !== null ? [{ label: valueLabel.toLowerCase(), value: format(p.value), color }] : []),
                  ...(p.reference !== undefined && referenceLabel
                    ? [{ label: referenceLabel.toLowerCase(), value: format(p.reference), color: "var(--muted-foreground)" }]
                    : []),
                ]}
              />
            );
          }}
        />
        {referenceLabel && (
          <Line dataKey="reference" stroke="var(--muted-foreground)" strokeOpacity={0.7} strokeWidth={1.5} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
        )}
        <Area
          dataKey="value"
          type="monotone"
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#fill-${id})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)", fill: color }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  );
}
