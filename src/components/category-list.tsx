import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Money, BudgetBar } from "@/components/money";
import { CategoryIcon } from "@/components/category-icon";
import { PlannedInput } from "@/components/planned-input";
import type { CategoryRow } from "@/lib/budget";
import type { GroupKey } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * The plan-vs-actual table, same three columns as the sheet.
 * Planned amounts edit in place; the row itself links to the category's
 * transaction history.
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
  if (!categories.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyNote ?? "Nothing here yet."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {categories.map((cat) => (
        <li key={cat.id}>
          <Row cat={cat} groupKey={groupKey} month={month} />
          {cat.children.length > 0 && (
            <ul className="divide-y divide-border border-t border-border bg-muted/40">
              {cat.children.map((child) => (
                <li key={child.id}>
                  <Row cat={child} groupKey={groupKey} month={month} nested />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function Row({
  cat,
  groupKey,
  month,
  nested = false,
}: {
  cat: CategoryRow;
  groupKey: GroupKey;
  month: string;
  nested?: boolean;
}) {
  const diff = cat.plannedMinor - cat.actualMinor;
  const isIncome = groupKey === "income";
  // For income, beating the plan is good; for spending it's the opposite.
  const overPlan = !isIncome && cat.actualMinor > cat.plannedMinor && cat.plannedMinor > 0;
  const idle = cat.plannedMinor === 0 && cat.actualMinor === 0;
  // A rolled-up child's plan lives on the parent, so don't offer to edit it.
  const editablePlan = !nested || cat.budgetsSeparately;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60",
        nested && "pl-11",
      )}
    >
      {!nested && (
        <CategoryIcon
          name={cat.icon}
          className="size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <Link
            href={`/category/${cat.id}?month=${month}`}
            className={cn(
              "truncate text-sm hover:underline",
              idle ? "text-muted-foreground" : "font-medium",
              nested && "text-[13px]",
            )}
          >
            {cat.name}
          </Link>

          <span className="flex shrink-0 items-baseline gap-1 text-sm">
            <Money
              minor={cat.actualMinor}
              tone={overPlan ? "negative" : cat.actualMinor ? "default" : "muted"}
              className="font-semibold"
            />
            <span className="text-muted-foreground">/</span>
            {editablePlan ? (
              <PlannedInput
                categoryId={cat.id}
                month={month}
                plannedMinor={cat.plannedMinor}
              />
            ) : (
              <Money minor={cat.plannedMinor} tone="muted" className="text-xs" />
            )}
          </span>
        </div>

        {cat.plannedMinor > 0 && (
          <div className="mt-2 flex items-center gap-3">
            <BudgetBar
              actualMinor={cat.actualMinor}
              plannedMinor={cat.plannedMinor}
              groupKey={groupKey}
            />
            <span className="w-24 shrink-0 text-right text-[11px] text-muted-foreground">
              {overPlan ? (
                <>
                  <Money minor={Math.abs(diff)} tone="negative" /> over
                </>
              ) : (
                <>
                  <Money minor={diff} tone="muted" /> left
                </>
              )}
            </span>
          </div>
        )}
      </div>

      <Link
        href={`/category/${cat.id}?month=${month}`}
        aria-label={`Open ${cat.name}`}
        className="shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
      >
        <CaretRight size={14} />
      </Link>
    </div>
  );
}
