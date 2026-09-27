"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaretRight, Repeat } from "@phosphor-icons/react";
import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/category-icon";
import { PlannedInput, PlannedSheet } from "@/components/planned-input";
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
      {/* Phones: a list, one two-line row per category. */}
      <ul className="divide-y divide-border sm:hidden">
        {shown.map((cat) => (
          <MobileRow key={cat.id} cat={cat} groupKey={groupKey} month={month} depth={0} />
        ))}
        {/* Same two columns as the rows, text aligned with their names. */}
        <li className="flex gap-3 bg-muted/40 px-4 py-4">
          <span aria-hidden className="w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">Total</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              <Money minor={totals.actual} tone="muted" /> {isIncome ? "received" : "spent"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[15px]">
              <Remaining planned={totals.planned} actual={totals.actual} isIncome={isIncome} words />
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Budget <Money minor={totals.planned} tone="muted" />
            </p>
          </div>
        </li>
      </ul>

      {/* From sm up: the plan-vs-actual table. */}
      <div className="hidden overflow-x-auto sm:block">
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
              ? `Hide ${idleCount} with no budget or spending`
              : `Show ${idleCount} more with no budget or spending`}
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
                aria-label="Assumed spent, no transaction logged"
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
 * One category on a phone, in two columns with one figure per line:
 *   [icon] Rent                 ₹7,000 left
 *          ₹3,000 spent    Budget ₹10,000 ✎
 * Spent reads down the left, what's left and the plan down the right. The old
 * single line ("₹3,000 spent · Budget ₹10,000 ✎") put three figures and a
 * pencil side by side and read as cramped. The row opens the category; the
 * budget opens the budget sheet.
 */
function MobileRow({
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
  const editablePlan = !nested || cat.budgetsSeparately;
  const assumed = cat.assumedMinor > 0 && cat.assumedMinor === cat.actualMinor;

  return (
    <>
      <li className={cn("relative flex min-h-[72px] items-center gap-3 px-4 py-4 active:bg-muted/60", nested && "bg-muted/20")}>
        {/* The whole row is the link; the budget button sits above it. */}
        <Link href={`/category/${cat.id}?month=${month}`} aria-label={`Open ${cat.name}`} className="absolute inset-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:-outline-offset-2" />
        {nested ? (
          <span aria-hidden className="w-10 shrink-0" />
        ) : (
          <CategoryIcon name={cat.icon} className="size-10 shrink-0 rounded-xl bg-muted text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn("flex min-w-0 items-center gap-1.5 text-[15px]", idle ? "text-muted-foreground" : "font-medium")}>
            <span className="truncate">{cat.name}</span>
            {assumed && <Repeat size={11} weight="bold" aria-label="Assumed spent" className="shrink-0 text-muted-foreground" />}
          </p>
          <p className="mt-1 truncate text-[13px] text-muted-foreground">
            <Money minor={cat.actualMinor} tone="muted" /> {isIncome ? "received" : "spent"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <p className="text-[15px]">
            <Remaining planned={cat.plannedMinor} actual={cat.actualMinor} isIncome={isIncome} words />
          </p>
          <div className="mt-1 text-[13px] text-muted-foreground">
            {editablePlan ? (
              <PlannedSheet categoryId={cat.id} categoryName={cat.name} month={month} plannedMinor={cat.plannedMinor} />
            ) : (
              <span>Rolls into parent</span>
            )}
          </div>
        </div>
      </li>
      {cat.children.map((child) => (
        <MobileRow key={child.id} cat={child} groupKey={groupKey} month={month} depth={depth + 1} />
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
  words = false,
}: {
  planned: number;
  actual: number;
  isIncome: boolean;
  /** Phones: "₹7,000 left" / "₹500 over" instead of a bare signed number. */
  words?: boolean;
}) {
  if (planned === 0 && actual === 0) {
    return <span className="text-muted-foreground">No budget</span>;
  }

  const diff = planned - actual;
  const over = diff < 0;

  if (words) {
    const label = isIncome ? (over ? "extra" : "to come") : over ? "over" : "left";
    return (
      <span className="whitespace-nowrap">
        <Money
          minor={Math.abs(diff)}
          tone={over ? (isIncome ? "positive" : "negative") : "default"}
          className="font-semibold"
        />{" "}
        <span className={cn("text-xs", over && !isIncome ? "text-negative" : "text-muted-foreground")}>{label}</span>
      </span>
    );
  }

  return (
    <Money
      minor={diff}
      signed={over}
      tone={over ? (isIncome ? "positive" : "negative") : "muted"}
      className={over ? "font-semibold" : undefined}
    />
  );
}
