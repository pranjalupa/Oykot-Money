"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export type LegendItem = {
  label: string;
  color: string;
  kind?: "bar" | "line" | "dashed";
};

/**
 * The frame every chart sits in — deliberately quiet.
 *
 * Title on top with a Chart / Table switch at the top right, and the visual
 * with room around it. No caption underneath — the figures beside each chart
 * already say it. The table is always offered: the chart alone gates numbers
 * behind colour and hover.
 */
export function ChartCard({
  title,
  aside,
  legend,
  table,
  children,
  className,
}: {
  title: string;
  /** Right side of the header — a headline figure, a period label. */
  aside?: React.ReactNode;
  legend?: LegendItem[];
  table?: { head: string[]; rows: React.ReactNode[][]; note?: string };
  children: React.ReactNode;
  className?: string;
}) {
  const [asTable, setAsTable] = useState(false);

  return (
    <section className={cn("flex flex-col rounded-2xl border border-border bg-card p-5 sm:p-6", className)}>
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="font-heading text-base font-semibold">{title}</h2>
        <div className="flex shrink-0 items-center gap-3">
          {aside && <div className="text-right text-sm text-muted-foreground">{aside}</div>}
          {table && (
            <div role="tablist" aria-label={`${title} view`} className="flex rounded-lg bg-muted p-0.5">
              {(["Chart", "Table"] as const).map((v) => {
                const active = (v === "Table") === asTable;
                return (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setAsTable(v === "Table")}
                    className={cn(
                      "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          )}
        </div>
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
          <ScrollHint>
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
          </ScrollHint>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

/**
 * A capped-height scroller that says so. A table cut off at a row boundary
 * looks finished, so while there's more below, the bottom fades out with a
 * "Scroll for more" label; it disappears once you reach the end.
 */
function ScrollHint({ children }: { children: React.ReactNode }) {
  const [more, setMore] = useState(false);
  const check = (el: HTMLElement) => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const observer = new ResizeObserver(() => check(el));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="relative">
      <div ref={measure} onScroll={(e) => check(e.currentTarget)} className="max-h-80 overflow-auto">
        {children}
      </div>
      {more && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-14 items-end justify-center bg-gradient-to-t from-card via-card/80 to-transparent pb-1.5 text-[11px] font-medium text-muted-foreground"
        >
          Scroll for more ↓
        </div>
      )}
    </div>
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
