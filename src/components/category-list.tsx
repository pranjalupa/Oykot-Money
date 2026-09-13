"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretRight, Repeat } from "@phosphor-icons/react";
import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/category-icon";
import { PlannedInput } from "@/components/planned-input";
import type { CategoryRow } from "@/lib/budget";
import type { GroupKey } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * The plan-vs-actual table.
 *
 * Three named columns — Budgeted, Spent, Remaining — rather than the old
 * `12,000 / 15,000` slash, which made you remember which side was which. The
 * headers carry the meaning so the numbers don't have to.
 *
 * Untouched rows collapse behind a toggle by default: a month starts with every
 * category at zero, and a screen of zeroes hides the handful of lines that
 * actually moved.
 */
export function CategoryList({
  categories,
  groupKey,
  month,
  emptyNote,
}: {
  categories: CategoryRow[];
  groupKey: GroupKey;
  month: string;
  emptyNote?: string;
}) {
  const [showIdle, setShowIdle] = useState(false);

  const { shown, idleCount, totals } = useMemo(() => {
    const isIdle = (c: CategoryRow) =>
      c.plannedMinor === 0 && c.actualMinor === 0;
    const idle = categories.filter(isIdle);
    return {
      shown: showIdle ? categories : categories.filter((c) => !isIdle(c)),
      idleCount: idle.length,
      totals: categories.reduce(
        (acc, c) => ({
          planned: acc.planned + c.plannedMinor,
          actual: acc.actual + c.actualMinor,
        }),
        { planned: 0, actual: 0 },
      ),
    };
  }, [categories, showIdle]);

  if (!categories.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyNote ?? "Nothing here yet."}
      </p>
    );
  }

  const isIncome = groupKey === "income";

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-left font-medium">
                Category
              </th>
              <th scope="col" className="w-28 px-3 py-3 text-right font-medium">
                Budgeted
              </th>
              <th scope="col" className="w-28 px-3 py-3 text-right font-medium">
                {isIncome ? "Received" : "Spent"}
              </th>
              <th scope="col" className="hidden w-28 px-3 py-3 text-right font-semibold sm:table-cell">
                Remaining
              </th>
              <th scope="col" className="w-9 px-2 py-3">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {shown.map((cat) => (
              <Row
                key={cat.id}
                cat={cat}
                groupKey={groupKey}
                month={month}
                depth={0}
              />
            ))}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-border bg-muted/40 font-medium">
              <td className="px-4 py-3.5">Total</td>
              <td className="px-3 py-3.5 text-right">
                <Money minor={totals.planned} />
              </td>
              <td className="px-3 py-3.5 text-right">
                <Money minor={totals.actual} />
              </td>
              <td className="hidden px-3 py-3.5 text-right sm:table-cell">
                <Remaining
                  planned={totals.planned}
                  actual={totals.actual}
                  isIncome={isIncome}
                />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {idleCount > 0 && (
        <div className="border-t border-border px-4 py-3.5">
          <button
            type="button"
            onClick={() => setShowIdle((v) => !v)}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {showIdle
              ? `Hide ${idleCount} untouched`
              : `Show ${idleCount} untouched categor${idleCount === 1 ? "y" : "ies"}`}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({
  cat,
  groupKey,
  month,
  depth,
}: {
  cat: CategoryRow;
  groupKey: GroupKey;
  month: string;
  depth: number;
}) {
  const isIncome = groupKey === "income";
  const nested = depth > 0;
  const idle = cat.plannedMinor === 0 && cat.actualMinor === 0;
  // A rolled-up child's plan lives on the parent, so don't offer to edit it.
  const editablePlan = !nested || cat.budgetsSeparately;
  // Every rupee here came from the assumption rather than the ledger.
  const assumed = cat.assumedMinor > 0 && cat.assumedMinor === cat.actualMinor;
  const router = useRouter();
  const href = `/category/${cat.id}?month=${month}`;

  return (
    <>
      {/* The whole row opens the category. Links and the planned input keep
          their own behaviour, and stay the keyboard route in. */}
      <tr
        onClick={(e) => {
          if ((e.target as Element).closest("a, button, input, select, textarea, label")) return;
          router.push(href);
        }}
        className={cn("group cursor-pointer hover:bg-muted/60", nested && "bg-muted/20")}
      >
        <td className="px-4 py-3.5">
          <div
            className="flex items-center gap-2.5"
            style={{ paddingLeft: depth * 20 }}
          >
            {!nested && (
              <CategoryIcon
                name={cat.icon}
                className="size-7 shrink-0 rounded-md bg-muted text-muted-foreground"
              />
            )}
            <Link
              href={`/category/${cat.id}?month=${month}`}
              className={cn(
                "truncate hover:underline",
                idle ? "text-muted-foreground" : "font-medium",
                nested && "text-[13px]",
              )}
            >
              {cat.name}
            </Link>
            {assumed && (
              <Repeat
                size={11}
                weight="bold"
                aria-label="Assumed spent — no transaction logged"
                className="shrink-0 text-muted-foreground"
              />
            )}
          </div>
        </td>

        <td className="px-3 py-3.5 text-right">
          {editablePlan ? (
            <PlannedInput
              categoryId={cat.id}
              month={month}
              plannedMinor={cat.plannedMinor}
            />
          ) : (
            <Money minor={cat.plannedMinor} tone="muted" />
          )}
        </td>

        <td className="px-3 py-3.5 text-right">
          <Money
            minor={cat.actualMinor}
            tone={cat.actualMinor ? "default" : "muted"}
            className={cn(assumed && "text-muted-foreground")}
          />
          {/* On phones the Remaining column is hidden; it rides under Spent. */}
          <div className="text-[11px] sm:hidden">
            <Remaining
              planned={cat.plannedMinor}
              actual={cat.actualMinor}
              isIncome={isIncome}
            />
          </div>
        </td>

        <td className="hidden px-3 py-3.5 text-right sm:table-cell">
          <Remaining
            planned={cat.plannedMinor}
            actual={cat.actualMinor}
            isIncome={isIncome}
          />
        </td>

        <td className="px-2 py-3.5">
          <Link
            href={`/category/${cat.id}?month=${month}`}
            aria-label={`Open ${cat.name}`}
            className="flex justify-center text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
          >
            <CaretRight size={14} />
          </Link>
        </td>
      </tr>

      {cat.children.map((child) => (
        <Row
          key={child.id}
          cat={child}
          groupKey={groupKey}
          month={month}
          depth={depth + 1}
        />
      ))}
    </>
  );
}

/**
 * Budget minus spend. For income the sign flips meaning — earning more than
 * planned is good — so the tone is decided per group rather than by the number.
 */
function Remaining({
  planned,
  actual,
  isIncome,
}: {
  planned: number;
  actual: number;
  isIncome: boolean;
}) {
  if (planned === 0 && actual === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const diff = planned - actual;
  const over = diff < 0;

  return (
    <Money
      minor={diff}
      signed={over}
      tone={over ? (isIncome ? "positive" : "negative") : "muted"}
      className={over ? "font-semibold" : undefined}
    />
  );
}
