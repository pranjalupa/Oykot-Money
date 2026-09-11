"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

/**
 * A ring that fills as something gets used up, with the number that matters
 * in the middle. The most natural picture for a budget: how much is gone.
 * Fixed size on purpose — a ring doesn't need to stretch.
 */
export function RadialProgress({
  percent,
  color,
  size = 196,
  thickness = 14,
  label,
  children,
}: {
  /** 0–100; anything above draws a full ring. */
  percent: number;
  color: string;
  size?: number;
  thickness?: number;
  /** What the ring means, for screen readers. */
  label: string;
  children: React.ReactNode;
}) {
  const outer = size / 2;
  return (
    <div className="relative mx-auto shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <RadialBarChart
        width={size}
        height={size}
        data={[{ value: Math.max(0, Math.min(percent, 100)) }]}
        startAngle={90}
        endAngle={-270}
        innerRadius={outer - thickness}
        outerRadius={outer}
        barSize={thickness}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
        <RadialBar
          dataKey="value"
          fill={color}
          background={{ fill: "var(--muted)" }}
          cornerRadius={thickness}
          isAnimationActive={false}
        />
      </RadialBarChart>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        {children}
      </div>
    </div>
  );
}
