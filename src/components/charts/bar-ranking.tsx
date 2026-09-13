"use client";

import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { TooltipBox } from "@/components/charts/chart-card";

export type RankedItem = {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Second tooltip row — what was budgeted for this line. */
  sub?: string;
};

/** Names get their own column, so cap them rather than let the chart shrink. */
const MAX_LABEL = 13;
const clip = (s: string) => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s);

/**
 * Recharts' own tick wraps a long name onto a second line, which then
 * collides with the row above. One line, clipped, every time.
 */
function NameTick({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) {
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill="var(--muted-foreground)" fontSize={12}>
      {payload?.value}
    </text>
  );
}

/**
 * A horizontal bar chart, biggest first. Horizontal because category names
 * are words: rotated under a column chart they'd be unreadable on a phone.
 */
export function BarRanking({
  items,
  format,
  compact,
  valueLabel,
}: {
  items: RankedItem[];
  format: (minor: number) => string;
  /** Short form for the label on the bar — the full figure is in the tooltip. */
  compact: (minor: number) => string;
  valueLabel: string;
}) {
  const data = items.map((i) => ({ ...i, short: clip(i.label) }));

  return (
    <ChartContainer
      config={{ value: { label: valueLabel } }}
      className="aspect-auto w-full"
      style={{ height: Math.max(data.length * 38 + 16, 120) }}
    >
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="short"
          width={104}
          tick={<NameTick />}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5, radius: 8 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof data)[number];
            return (
              <TooltipBox
                title={p.label}
                rows={[
                  { label: valueLabel.toLowerCase(), value: format(p.value), color: p.color },
                  ...(p.sub ? [{ label: "", value: p.sub }] : []),
                ]}
              />
            );
          }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={22} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.key} fill={d.color} />
          ))}
          {/* The amount rides at the end of its bar: with no x-axis it's the
              only way to read a value without hovering, which a phone can't. */}
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            fill="var(--muted-foreground)"
            fontSize={11}
            formatter={(v) => (typeof v === "number" ? compact(v) : "")}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
