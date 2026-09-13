"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox, X_AXIS } from "@/components/charts/chart-card";

export type LinePoint = {
  label: string;
  /** null leaves the line unstarted — days that haven't happened yet. */
  value: number | null;
  /** Optional second series, drawn dashed and muted behind the first. */
  reference?: number;
  /** Tooltip heading, when it should read fuller than the axis label. */
  title?: string;
};

/**
 * A plain line chart. Used for anything cumulative — spending against pace,
 * net worth across months.
 *
 * There's no y-axis: the takeaway under the card and the tooltip carry the
 * numbers, and an axis of rupee amounts costs more room than it earns.
 */
export function LineTrend({
  data,
  color,
  valueLabel,
  referenceLabel,
  format,
  fromZero = true,
  height = 220,
}: {
  data: LinePoint[];
  color: string;
  valueLabel: string;
  referenceLabel?: string;
  format: (minor: number) => string;
  /** Start the scale at zero. Off for net worth, where the change is the point. */
  fromZero?: boolean;
  height?: number;
}) {
  const hasReference = data.some((d) => d.reference !== undefined);

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...X_AXIS} interval="preserveStartEnd" minTickGap={24} />
        <YAxis hide domain={fromZero ? [0, "auto"] : ["auto", "auto"]} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as LinePoint;
            if (p.value === null) return null;
            return (
              <TooltipBox
                title={p.title ?? p.label}
                rows={[
                  { label: valueLabel.toLowerCase(), value: format(p.value), color },
                  ...(p.reference !== undefined && referenceLabel
                    ? [{ label: referenceLabel.toLowerCase(), value: format(p.reference), color: "var(--muted-foreground)" }]
                    : []),
                ]}
              />
            );
          }}
        />
        {hasReference && (
          <Line
            dataKey="reference"
            type="monotone"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
        <Line
          dataKey="value"
          type="monotone"
          stroke={color}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
