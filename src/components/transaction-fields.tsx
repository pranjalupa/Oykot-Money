"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { quickAddCategory, quickAddPerson } from "@/app/actions";
import { CurrencySymbol } from "@/components/currency-provider";
import { Button } from "@/components/ui/button";
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
  { key: "transfer", label: "Settlement" },
] as const;
type Tab = (typeof TABS)[number]["key"];

/**
 * The three things a settlement can be. Only two directions are stored:
 *   lent     → direction 'transfer', your account → person (they owe you more,
 *              or you owe them less — lending and paying back are the same move)
 *   borrowed → direction 'inflow',   person → your account (the reverse)
 *   move     → direction 'transfer', your account → your account
 * The person is always the counter-account, so the balance maths in
 * lib/budget.ts needs no special case.
 */
const KINDS = [
  { key: "lent", label: "Money to them", hint: "Lending, or paying back what you owe." },
  { key: "borrowed", label: "Money from them", hint: "Borrowing, or getting paid back." },
  { key: "move", label: "Between my accounts", hint: "Between your own accounts — this won’t touch your budget." },
] as const;
type Kind = (typeof KINDS)[number]["key"];

const SPEND_GROUPS = [
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
  { key: "investments", label: "Investments" },
] as const;

/** The "+ Add…" option in a dropdown — never a real id. */
const NEW = "__new__";

const SELECT =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * The fields of a transaction, shared by Add and Edit so the two can never
 * drift — the same types, accounts and category rules in both.
 *
 * Archived accounts, people and retired categories are left out of the
 * choices. An edit still keeps whatever the transaction already points at, so
 * opening an old entry never silently swaps its account.
 *
 * A person or category can be added from the dropdown itself: a small inline
 * field rather than a second dialog stacked on this one.
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
  // Added from this form but not yet back from the server's revalidation.
  const [addedAccounts, setAddedAccounts] = useState<PickerAccount[]>([]);
  const [addedCategories, setAddedCategories] = useState<PickerCategory[]>([]);
  const allAccounts = [...accounts, ...addedAccounts.filter((a) => !accounts.some((b) => b.id === a.id))];
  const allCategories = [...categories, ...addedCategories.filter((c) => !categories.some((b) => b.id === c.id))];

  const keep = new Set(
    [initial.accountId, initial.counterAccountId, initial.categoryId].filter(Boolean),
  );
  const usable = allAccounts.filter((a) => !a.archived || keep.has(a.id));
  const usableCategories = allCategories.filter((c) => !c.archived || keep.has(c.id));
  const spending = usable.filter((a) => a.kind === "spending");
  const kindOf = (id: string | null | undefined) => usable.find((a) => a.id === id)?.kind;

  // Initial values come from props once — no effect needed to pick a default.
  const [tab, setTab] = useState<Tab>(
    initial.direction === "inflow" && initial.counterAccountId ? "transfer" : (initial.direction ?? "outflow"),
  );
  const [kind, setKind] = useState<Kind>(
    initial.direction === "inflow" && initial.counterAccountId
      ? "borrowed"
      : initial.direction === "transfer" && kindOf(initial.counterAccountId) === "spending"
        ? "move"
        : "lent",
  );
  const [accountId, setAccountId] = useState(initial.accountId ?? spending[0]?.id ?? "");
  const [counterAccountId, setCounterAccountId] = useState(initial.counterAccountId ?? "");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [adding, setAdding] = useState<null | "person" | "category">(null);
  const [draftName, setDraftName] = useState("");
  const [draftGroup, setDraftGroup] = useState<GroupKey>("needs");
  const [saving, startSaving] = useTransition();

  const settlement = tab === "transfer";
  const direction: Direction = settlement && kind === "borrowed" ? "inflow" : tab;

  // Money going out can land in any spend group; money coming in is Income.
  const groupsFor = (t: Tab): GroupKey[] => (t === "inflow" ? ["income"] : ["needs", "wants", "investments"]);
  const relevant = usableCategories.filter((c) => groupsFor(tab).includes(c.groupKey));

  // The far end: a person for money to or from them, your own account for a
  // move. Assets hold a typed-in value, not a ledger, so they're never offered —
  // unless an old entry already points at one.
  const counterOptions = usable.filter((a) =>
    a.id === accountId
      ? false
      : kind === "move"
        ? a.kind === "spending"
        : a.kind === "loan" || (a.kind === "asset" && keep.has(a.id)),
  );

  function pickTab(next: Tab) {
    setTab(next);
    setAdding(null);
    if (categoryId && !usableCategories.some((c) => c.id === categoryId && groupsFor(next).includes(c.groupKey))) {
      setCategoryId("");
    }
  }

  function pickKind(next: Kind) {
    setKind(next);
    setAdding(null);
    const stillValid = usable.some(
      (a) => a.id === counterAccountId && (next === "move" ? a.kind === "spending" : a.kind !== "spending"),
    );
    if (!stillValid) setCounterAccountId("");
  }

  function startAdding(what: "person" | "category") {
    setAdding(what);
    setDraftName("");
  }

  function addPerson() {
    const name = draftName.trim();
    if (!name) return;
    startSaving(async () => {
      const res = await quickAddPerson(name);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAddedAccounts((a) => [...a, res.account]);
      setCounterAccountId(res.account.id);
      setAdding(null);
      toast.success(`${res.account.name} added`);
    });
  }

  function addCategory() {
    const name = draftName.trim();
    if (!name) return;
    const groupKey: GroupKey = tab === "inflow" ? "income" : draftGroup;
    startSaving(async () => {
      const res = await quickAddCategory(name, groupKey);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setAddedCategories((c) => [...c, res.category]);
      setCategoryId(res.category.id);
      setAdding(null);
      toast.success(`${res.category.name} added`);
    });
  }

  const id = (name: string) => `${idPrefix}-${name}`;

  // No `name` on these inputs: they create a person or category, they are not
  // part of the transaction that gets submitted.
  const inlineAdd = (what: "person" | "category") => {
    const submit = what === "person" ? addPerson : addCategory;
    return (
      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-2.5">
        <div className="flex gap-2">
          <Input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={what === "person" ? "Their name" : "Category name"}
            aria-label={what === "person" ? "New person's name" : "New category name"}
            maxLength={80}
            className="h-8"
          />
          {what === "category" && tab !== "inflow" && (
            <select
              value={draftGroup}
              onChange={(e) => setDraftGroup(e.target.value as GroupKey)}
              aria-label="Group"
              className={cn(SELECT, "h-8")}
            >
              {SPEND_GROUPS.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.label}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex justify-end gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(null)}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={saving || !draftName.trim()} onClick={submit}>
            {saving ? "Adding…" : what === "person" ? "Add person" : "Add category"}
          </Button>
        </div>
      </div>
    );
  };

  const accountField = (label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id("account")}>{label}</Label>
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
  );

  const counterField = (label: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id("counter")}>{label}</Label>
      <select
        id={id("counter")}
        name="counterAccountId"
        required
        value={counterAccountId}
        onChange={(e) => (e.target.value === NEW ? startAdding("person") : setCounterAccountId(e.target.value))}
        className={SELECT}
      >
        <option value="">Choose…</option>
        {counterOptions.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
        {kind !== "move" && <option value={NEW}>+ Add person…</option>}
      </select>
      {adding === "person" && inlineAdd("person")}
    </div>
  );

  return (
    <>
      <input type="hidden" name="direction" value={direction} />

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => pickTab(t.key)}
            aria-pressed={tab === t.key}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {settlement && (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => pickKind(k.key)}
                aria-pressed={kind === k.key}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  kind === k.key
                    ? "border-foreground/20 bg-secondary text-secondary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{KINDS.find((k) => k.key === kind)?.hint}</p>
        </div>
      )}

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

      {!settlement && accountField(tab === "inflow" ? "Into account" : "From account")}

      {settlement && kind === "lent" && (
        <>
          {accountField("From account")}
          {counterField("To person")}
        </>
      )}
      {settlement && kind === "borrowed" && (
        <>
          {counterField("From person")}
          {accountField("Into account")}
        </>
      )}
      {settlement && kind === "move" && (
        <>
          {accountField("From account")}
          {counterField("To account")}
        </>
      )}

      {/* Spent and Received always need a category. Money to a person may
          count as spending if you pick one; money from them and moves never do. */}
      {(!settlement || kind === "lent") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("category")}>{settlement ? "Count as spending from" : "Category"}</Label>
          <select
            id={id("category")}
            name="categoryId"
            required={!settlement}
            value={categoryId}
            onChange={(e) => (e.target.value === NEW ? startAdding("category") : setCategoryId(e.target.value))}
            className={SELECT}
          >
            <option value="">{settlement ? "Don't count as spending" : "Choose…"}</option>
            {relevant.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? "— " : ""}
                {c.name}
              </option>
            ))}
            <option value={NEW}>+ New category…</option>
          </select>
          {adding === "category" && inlineAdd("category")}
          {settlement && adding !== "category" && (
            <p className="text-xs text-muted-foreground">
              Pick a category and it comes out of that budget, as well as your account.
            </p>
          )}
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
