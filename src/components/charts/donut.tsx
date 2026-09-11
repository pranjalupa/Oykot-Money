"use client";

import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { TooltipBox } from "@/components/charts/chart-card";

export type Slice = { key: string; label: string; value: number; display: string; color: string };

/**
 * Parts of a whole, four slices at most, with the total in the middle.
 * Slices are separated by a surface gap, never outlined.
 */
export function Donut({
  slices,
  size = 216,
  thickness = 26,
  label,
  children,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  label: string;
  children: React.ReactNode;
}) {
  const outer = size / 2;
  const visible = slices.filter((s) => s.value > 0);
  const empty = visible.length === 0;
  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <PieChart width={size} height={size}>
        <Pie
          data={empty ? [{ key: "none", label: "", value: 1, display: "", color: "var(--muted)" }] : visible}
          dataKey="value"
          nameKey="label"
          innerRadius={outer - thickness}
          outerRadius={outer}
          paddingAngle={empty || visible.length === 1 ? 0 : 2}
          cornerRadius={6}
          stroke="var(--card)"
          strokeWidth={2}
          startAngle={90}
          endAngle={-270}
          isAnimationActive={false}
        >
          {(empty ? [{ key: "none", color: "var(--muted)" }] : visible).map((s) => (
            <Cell key={s.key} fill={s.color} />
          ))}
        </Pie>
        {!empty && (
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={payload[0].payload.label}
                  rows={[{ label: "", value: payload[0].payload.display, color: payload[0].payload.color }]}
                />
              ) : null
            }
          />
        )}
      </PieChart>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
        {children}
      </div>
    </div>
  );
}
