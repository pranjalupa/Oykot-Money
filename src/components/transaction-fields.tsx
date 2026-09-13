"use client";

import { useMemo, useState } from "react";
import { CurrencySymbol } from "@/components/currency-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { GroupKey } from "@/db/schema";

export type PickerAccount = {
  id: string;
  name: string;
  kind: "spending" | "loan" | "asset";
  archived?: boolean;
};
export type PickerCategory = {
  id: string;
  name: string;
  groupKey: GroupKey;
  parentId: string | null;
  archived?: boolean;
};
export type Direction = "outflow" | "inflow" | "transfer";

const TABS = [
  { key: "outflow", label: "Spent" },
  { key: "inflow", label: "Received" },
  { key: "transfer", label: "Transfer" },
] as const;

const SELECT =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * The fields of a transaction, shared by Add and Edit so the two can never
 * drift — the same types, accounts and category rules in both.
 *
 * Archived accounts, people and retired categories are left out of the
 * choices. An edit still keeps whatever the transaction already points at, so
 * opening an old entry never silently swaps its account.
 */
export function TransactionFields({
  idPrefix,
  accounts,
  categories,
  initial = {},
  showRepeat = false,
}: {
  idPrefix: string;
  accounts: PickerAccount[];
  categories: PickerCategory[];
  initial?: {
    direction?: Direction;
    amount?: string;
    date?: string;
    accountId?: string;
    counterAccountId?: string | null;
    categoryId?: string | null;
    merchant?: string | null;
  };
  showRepeat?: boolean;
}) {
  const keep = new Set(
    [initial.accountId, initial.counterAccountId, initial.categoryId].filter(Boolean),
  );
  const usable = accounts.filter((a) => !a.archived || keep.has(a.id));
  const usableCategories = categories.filter((c) => !c.archived || keep.has(c.id));
  const spending = usable.filter((a) => a.kind === "spending");

  // Initial values come from props once — no effect needed to pick a default.
  const [direction, setDirection] = useState<Direction>(initial.direction ?? "outflow");
  const [accountId, setAccountId] = useState(initial.accountId ?? spending[0]?.id ?? "");
  const [counterAccountId, setCounterAccountId] = useState(initial.counterAccountId ?? "");

  // Money going out can land in any spend group; money coming in is Income.
  const relevant = useMemo(() => {
    const wanted: GroupKey[] =
      direction === "inflow" ? ["income"] : ["needs", "wants", "investments"];
    return usableCategories.filter((c) => wanted.includes(c.groupKey));
  }, [usableCategories, direction]);

  const kindOf = (id: string) => usable.find((a) => a.id === id)?.kind;
  const isPureTransfer =
    direction === "transfer" &&
    kindOf(accountId) === "spending" &&
    kindOf(counterAccountId) === "spending";
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <>
      <input type="hidden" name="direction" value={direction} />

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setDirection(t.key)}
            aria-pressed={direction === t.key}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              direction === t.key
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("amount")}>
            Amount (<CurrencySymbol />)
          </Label>
          <Input
            id={id("amount")}
            name="amount"
            inputMode="decimal"
            required
            autoFocus
            placeholder="0"
            defaultValue={initial.amount}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("date")}>Date</Label>
          <Input id={id("date")} name="date" type="date" required defaultValue={initial.date} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("account")}>
          {direction === "inflow" ? "Into account" : "From account"}
        </Label>
        <select
          id={id("account")}
          name="accountId"
          required
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className={SELECT}
        >
          {spending.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {direction === "transfer" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("counter")}>To account or person</Label>
          <select
            id={id("counter")}
            name="counterAccountId"
            required
            value={counterAccountId}
            onChange={(e) => setCounterAccountId(e.target.value)}
            className={SELECT}
          >
            <option value="">Choose…</option>
            {/* Assets hold a typed-in value, not a ledger — money doesn't move into them here. */}
            {usable
              .filter((a) => a.id !== accountId && (a.kind !== "asset" || keep.has(a.id)))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.kind === "loan" ? " (person)" : ""}
                  {a.kind === "asset" ? " (asset)" : ""}
                </option>
              ))}
          </select>
          {isPureTransfer && (
            <p className="text-xs text-muted-foreground">
              Between your own accounts — this won&rsquo;t touch your budget.
            </p>
          )}
        </div>
      )}

      {!isPureTransfer && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("category")}>Category</Label>
          <select
            key={direction}
            id={id("category")}
            name="categoryId"
            required
            defaultValue={initial.categoryId ?? ""}
            className={SELECT}
          >
            <option value="">Choose…</option>
            {relevant.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? "— " : ""}
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("merchant")}>Merchant / note</Label>
        <Input
          id={id("merchant")}
          name="merchant"
          placeholder="Blinkit, landlord, …"
          defaultValue={initial.merchant ?? ""}
        />
      </div>

      {showRepeat && (
        <label className="flex items-start gap-2.5 rounded-md bg-muted/60 p-3 text-sm">
          <input type="checkbox" name="recurring" className="mt-0.5 size-4 accent-primary" />
          <span>
            Repeat every month
            <span className="block text-xs text-muted-foreground">
              Rent, SIP, salary — added automatically on the same date each month.
              Manage them in Settings.
            </span>
          </span>
        </label>
      )}
    </>
  );
}
