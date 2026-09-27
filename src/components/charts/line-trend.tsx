"use client";

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox, X_AXIS, Y_AXIS } from "@/components/charts/chart-card";
import { useCurrency } from "@/components/currency-provider";
import { formatCompact } from "@/lib/money";

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
 * A light compact value axis (`Y_AXIS`) says how much; the tooltip gives the
 * exact figure for any one point.
 */
export function LineTrend({
  data,
  color,
  valueLabel,
  referenceLabel,
  format,
  fromZero = true,
  height,
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
  const currency = useCurrency();
  const hasReference = data.some((d) => d.reference !== undefined);

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      // Short on phones so the list below still shows; taller from sm.
      className={height ? "aspect-auto w-full" : "aspect-auto h-[170px] w-full sm:h-[220px]"}
      style={height ? { height } : undefined}
    >
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" {...X_AXIS} interval="preserveStartEnd" minTickGap={32} />
        <YAxis {...Y_AXIS} domain={fromZero ? [0, "auto"] : ["auto", "auto"]} tickFormatter={(v: number) => formatCompact(v, currency)} />
        {/* Pinned to the top edge: a tooltip that follows the touch point
            sits under the thumb reading it. */}
        <Tooltip
          position={{ y: 0 }}
          wrapperStyle={{ zIndex: 10, pointerEvents: "none" }}
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
