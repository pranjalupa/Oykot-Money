"use client";

import { Bar, BarChart, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox, X_AXIS } from "@/components/charts/chart-card";

export type Column = {
  label: string;
  title?: string;
  value: number;
  /** Drawn at full strength; the rest are softened so it stands out. */
  highlight?: boolean;
  color?: string;
  /** Short text above the bar. Omit to leave the bar unlabelled. */
  tag?: string;
  /** Extra tooltip rows. */
  extra?: { label: string; value: string }[];
};

/**
 * A handful of columns over time — six months, twelve at most. Past periods
 * are soft, the current one is solid, a dashed line marks the budget, and a
 * few labels sit above the bars so the axis isn't needed.
 */
export function ColumnTrend({
  data,
  color,
  valueLabel,
  format,
  reference,
  referenceLabel,
  height = 240,
}: {
  data: Column[];
  color: string;
  valueLabel: string;
  format: (minor: number) => string;
  reference?: number;
  referenceLabel?: string;
  height?: number;
}) {
  const anyHighlight = data.some((d) => d.highlight);
  const signed = data.some((d) => d.value < 0);
  return (
    <ChartContainer config={{ value: { label: valueLabel, color } }} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 8 }}>
        <XAxis dataKey="label" {...X_AXIS} interval={data.length > 8 ? "preserveStartEnd" : 0} minTickGap={6} />
        <YAxis hide domain={signed ? ["auto", "auto"] : [0, (max: number) => Math.max(max, reference ?? 0) * 1.08]} />
        {signed && <ReferenceLine y={0} stroke="var(--border)" />}
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 8 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as Column;
            return (
              <TooltipBox
                title={p.title ?? p.label}
                rows={[
                  { label: valueLabel.toLowerCase(), value: format(p.value), color: p.color ?? color },
                  ...(reference !== undefined && referenceLabel ? [{ label: referenceLabel.toLowerCase(), value: format(reference) }] : []),
                  ...(p.extra ?? []),
                ]}
              />
            );
          }}
        />
        {reference !== undefined && reference > 0 && (
          <ReferenceLine y={reference} stroke="var(--muted-foreground)" strokeOpacity={0.7} strokeDasharray="5 5" />
        )}
        <Bar dataKey="value" radius={8} maxBarSize={data.length > 8 ? 26 : 44} isAnimationActive={false}>
          {data.map((d) => (
            <Cell
              key={d.label}
              fill={d.color ?? color}
              fillOpacity={anyHighlight && !d.highlight ? 0.35 : 0.9}
            />
          ))}
          <LabelList dataKey="tag" position="top" offset={8} className="fill-muted-foreground" fontSize={11} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
