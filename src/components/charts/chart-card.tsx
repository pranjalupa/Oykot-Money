"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type LegendItem = {
  label: string;
  color: string;
  /** Mirrors the mark: a block for bars and areas, a stroke for lines. */
  kind?: "bar" | "line" | "dashed";
};

/**
 * The frame every chart sits in: title, legend, and a Chart / Table switch.
 *
 * The table isn't optional. A chart alone gates its numbers behind colour and
 * hover; the table is the same data readable by anyone — screen reader,
 * colour-blind reader, someone who just wants the figure.
 */
export function ChartCard({
  title,
  description,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  legend?: LegendItem[];
  table: { head: string[]; rows: React.ReactNode[][]; note?: string };
  children: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      <header className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-bold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex shrink-0 gap-0.5 rounded-md bg-muted p-0.5" role="group" aria-label={`${title} view`}>
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium capitalize transition-colors",
                view === v
                  ? "bg-card text-foreground ring-1 ring-foreground/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {/* A legend only when there's more than one series — a single series is
          named by the title. */}
      {view === "chart" && legend && legend.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-3 text-xs text-muted-foreground">
          {legend.map((l) => (
            <li key={l.label} className="flex items-center gap-1.5">
              <Swatch color={l.color} kind={l.kind ?? "bar"} />
              {l.label}
            </li>
          ))}
        </ul>
      )}

      <div className="px-2 pt-2 pb-3">
        {view === "chart" ? (
          children
        ) : (
          <div className="max-h-80 overflow-auto px-2">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                  {table.head.map((h, i) => (
                    <th key={h} className={cn("py-2 font-semibold", i === 0 ? "text-left" : "text-right")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {table.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, i) => (
                      <td key={i} className={cn("tabular py-1.5", i === 0 ? "text-left" : "text-right")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {table.note && <p className="pt-2 text-xs text-muted-foreground">{table.note}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

function Swatch({ color, kind }: { color: string; kind: "bar" | "line" | "dashed" }) {
  if (kind === "bar") return <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: color }} />;
  return (
    <span
      aria-hidden
      className="w-3.5 border-t-2"
      style={{ borderColor: color, borderStyle: kind === "dashed" ? "dashed" : "solid" }}
    />
  );
}

/**
 * Tooltip body: values lead, labels follow, each series keyed by a short line
 * in its colour — the reader already knows the series, they want the number.
 */
export function TooltipBox({
  title,
  rows,
}: {
  title: React.ReactNode;
  rows: { label: string; value: React.ReactNode; color?: string }[];
}) {
  return (
    <div className="min-w-36 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 text-muted-foreground">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && <span aria-hidden className="w-2.5 border-t-2" style={{ borderColor: r.color }} />}
          <span className="tabular font-semibold text-foreground">{r.value}</span>
          <span className="text-muted-foreground">{r.label}</span>
        </p>
      ))}
    </div>
  );
}

/** Shared axis/grid styling: hairline, solid, recessive. */
export const AXIS = {
  tick: { fill: "var(--muted-foreground)", fontSize: 11 },
  axisLine: false,
  tickLine: false,
} as const;
