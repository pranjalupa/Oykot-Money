"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { TransactionList } from "@/components/transaction-list";
import type { PickerAccount, PickerCategory } from "@/components/transaction-fields";
import type { TransactionRow } from "@/lib/budget";
import { toMajor } from "@/lib/money";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "all", label: "All" },
  { key: "outflow", label: "Spent" },
  { key: "inflow", label: "Received" },
  { key: "transfer", label: "Transfers" },
] as const;

const SELECT =
  "h-8 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * Search and filter over the month's transactions.
 *
 * Filters run in the browser over what the page already loaded (the month,
 * up to 300 rows), so typing is instant and there's no request per keystroke.
 * Search matches the merchant, category, both accounts and the amount — "450"
 * finds the ₹450 dinner.
 */
export function TransactionBrowser({
  transactions,
  accounts,
  categories,
  emptyNote,
}: {
  transactions: TransactionRow[];
  accounts: PickerAccount[];
  categories: PickerCategory[];
  emptyNote?: string;
}) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]["key"]>("all");
  const [categoryId, setCategoryId] = useState("");

  // Only categories that actually appear this month — a filter that can only
  // ever return nothing is noise.
  const usedCategories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const t of transactions) {
      if (t.categoryId && t.categoryName) seen.set(t.categoryId, t.categoryName);
    }
    return [...seen].sort((a, b) => a[1].localeCompare(b[1]));
  }, [transactions]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (type !== "all" && t.direction !== type) return false;
      if (categoryId && t.categoryId !== categoryId) return false;
      if (!q) return true;
      return [
        t.merchant,
        t.categoryName,
        t.accountName,
        t.counterAccountName,
        String(toMajor(t.amountMinor)),
      ].some((v) => v?.toLowerCase().includes(q));
    });
  }, [transactions, query, type, categoryId]);

  const filtering = Boolean(query || type !== "all" || categoryId);
  const clear = () => {
    setQuery("");
    setType("all");
    setCategoryId("");
  };

  return (
    <div>
      {transactions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative min-w-40 flex-1">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search merchant, category, amount"
              aria-label="Search transactions"
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="flex gap-1 rounded-lg bg-muted p-0.5" role="group" aria-label="Type">
            {TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setType(t.key)}
                aria-pressed={type === t.key}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  type === t.key
                    ? "bg-card text-foreground ring-1 ring-foreground/15"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {usedCategories.length > 1 && (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              aria-label="Category"
              className={SELECT}
            >
              <option value="">All categories</option>
              {usedCategories.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          )}

          {filtering && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <X size={12} weight="bold" />
              Clear · {shown.length} of {transactions.length}
            </button>
          )}
        </div>
      )}

      {filtering && shown.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing matches.{" "}
          <button type="button" onClick={clear} className="underline underline-offset-4">
            Clear the filters
          </button>
        </p>
      ) : (
        <TransactionList
          transactions={shown}
          accounts={accounts}
          categories={categories}
          emptyNote={emptyNote}
        />
      )}
    </div>
  );
}
