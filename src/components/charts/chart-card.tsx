"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type LegendItem = {
  label: string;
  color: string;
  kind?: "bar" | "line" | "dashed";
};

/**
 * The frame every chart sits in — deliberately quiet.
 *
 * Title on top, the visual with room around it, and underneath one plain
 * sentence saying what it means. The takeaway is the point: a regular user
 * shouldn't have to decode axes to learn "you're ₹2,300 under pace".
 *
 * The table is one small link at the bottom rather than a toggle competing
 * with the title, but it's always there — the chart alone gates numbers
 * behind colour and hover.
 */
export function ChartCard({
  title,
  aside,
  legend,
  takeaway,
  note,
  table,
  children,
  className,
}: {
  title: string;
  /** Right side of the header — a headline figure, a period label. */
  aside?: React.ReactNode;
  legend?: LegendItem[];
  takeaway?: React.ReactNode;
  note?: React.ReactNode;
  table?: { head: string[]; rows: React.ReactNode[][]; note?: string };
  children: React.ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);

  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <header className="flex items-start justify-between gap-4">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        {aside && <div className="shrink-0 text-right text-sm text-muted-foreground">{aside}</div>}
      </header>

      {!asTable && legend && legend.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <Swatch color={l.color} kind={l.kind ?? "bar"} />
              {l.label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex-1">
        {asTable && table ? (
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-xs text-muted-foreground">
                  {table.head.map((h, i) => (
                    <th key={h} className={cn("py-2.5 font-medium", i === 0 ? "text-left" : "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, i) => (
                      <td key={i} className={cn("tabular py-2.5", i === 0 ? "text-left" : "text-right")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.note && <p className="pt-3 text-xs text-muted-foreground">{table.note}</p>}
          </div>
        ) : (
          children
        )}
      </div>

      {(takeaway || note || table) && (
        <footer className="mt-5 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {takeaway && <p className="text-sm font-medium text-foreground">{takeaway}</p>}
            {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
          </div>
          {table && (
            <button
              type="button"
              onClick={() => setAsTable((v) => !v)}
              className="shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {asTable ? "View as chart" : "View as table"}
            </button>
          )}
        </footer>
      )}
    </section>
  );
}

function Swatch({ color, kind }: { color: string; kind: "bar" | "line" | "dashed" }) {
  if (kind === "bar") return <span aria-hidden className="size-2.5 rounded-full" style={{ background: color }} />;
  return (
    <span
      aria-hidden
      className="w-3.5 border-t-2"
      style={{ borderColor: color, borderStyle: kind === "dashed" ? "dashed" : "solid" }}
    />
  );
}

/** Tooltip body: the value leads, the label follows. */
export function TooltipBox({
  title,
  rows,
}: {
  title: React.ReactNode;
  rows: { label: string; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div className="min-w-36 rounded-xl border border-border bg-card px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 text-muted-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 py-0.5">
          {r.color && <span aria-hidden className="size-2 rounded-full" style={{ background: r.color }} />}
          <span className="tabular font-semibold text-foreground">{r.value}</span>
          <span className="text-muted-foreground">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

/** X-axis styling. There is no y-axis anywhere: labels and tooltips carry values. */
export const X_AXIS = {
  tick: { fill: "var(--muted-foreground)", fontSize: 12 },
  axisLine: false,
  tickLine: false,
  tickMargin: 10,
} as const;
