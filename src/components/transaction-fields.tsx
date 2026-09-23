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
  /** Set on the four locked loan categories, which are never picked by hand. */
  systemKey?: string | null;
};
export type Direction = "outflow" | "inflow" | "transfer";

/**
 * What the form is recording. Only three directions are stored:
 *   outflow  Spent             your account, a spend category
 *   inflow   Received          your account, an income category
 *   person   You gave → 'transfer' your account → their ledger
 *            You got  → 'inflow'   their ledger → your account
 *   move     Move              'transfer' your account → your account
 * Money with a person counts in this month's budget, in one of four locked
 * categories the server picks from their balance (lib/loan-categories.ts).
 * A move between your own accounts has no category and never touches it.
 */
export type TransactionTab = "outflow" | "inflow" | "person" | "move";
const TAB_LABEL: Record<TransactionTab, string> = {
  outflow: "Spent",
  inflow: "Received",
  person: "Lend / Borrow",
  move: "Move",
};
/** What fits in a chip at phone width — "Lend / Borrow" wrapped to two lines. */
const TAB_LABEL_SHORT: Record<TransactionTab, string> = {
  ...TAB_LABEL,
  person: "People",
};
type PersonMode = "gave" | "got";

const SPEND_GROUPS = [
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
  { key: "investments", label: "Investments" },
] as const;

/** The "+ Add…" option in a dropdown — never a real id. */
const NEW = "__new__";

const SELECT =
  "h-11 rounded-md border border-input bg-transparent px-3 text-base sm:h-9 sm:text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

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
  tabs: tabsProp,
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
  /** Which tabs to offer. Move is hidden unless asked for, or already in use. */
  tabs?: TransactionTab[];
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

  const initialTab: TransactionTab = initial.counterAccountId
    ? initial.direction === "inflow" || kindOf(initial.counterAccountId) !== "spending"
      ? "person"
      : "move"
    : initial.direction === "transfer"
      ? "move"
      : (initial.direction ?? "outflow");
  const tabs: TransactionTab[] =
    tabsProp ?? (initialTab === "move" ? ["outflow", "inflow", "person", "move"] : ["outflow", "inflow", "person"]);

  // Initial values come from props once — no effect needed to pick a default.
  const [tab, setTab] = useState<TransactionTab>(tabs.includes(initialTab) ? initialTab : tabs[0]);
  const [personMode, setPersonMode] = useState<PersonMode>(
    initial.direction === "inflow" && initial.counterAccountId ? "got" : "gave",
  );
  const [accountId, setAccountId] = useState(initial.accountId ?? spending[0]?.id ?? "");
  const [counterAccountId, setCounterAccountId] = useState(initial.counterAccountId ?? "");
  const [categoryId, setCategoryId] = useState(initial.categoryId ?? "");
  const [adding, setAdding] = useState<null | "person" | "category">(null);
  const [draftName, setDraftName] = useState("");
  const [draftGroup, setDraftGroup] = useState<GroupKey>("needs");
  const [saving, startSaving] = useTransition();

  const direction: Direction =
    tab === "person" ? (personMode === "got" ? "inflow" : "transfer") : tab === "move" ? "transfer" : tab;
  const hasCategory = tab === "outflow" || tab === "inflow";

  const groupsFor = (t: TransactionTab): GroupKey[] => (t === "inflow" ? ["income"] : ["needs", "wants", "investments"]);
  const relevant = usableCategories.filter((c) => groupsFor(tab).includes(c.groupKey) && !c.systemKey);

  // The far end: a person, or your own account for a move. Assets hold a
  // typed-in value, not a ledger, so they're never offered — unless an old
  // entry already points at one.
  const counterFits = (a: PickerAccount, t: TransactionTab) =>
    t === "move" ? a.kind === "spending" : a.kind === "loan" || (a.kind === "asset" && keep.has(a.id));
  const counterOptions = usable.filter((a) => a.id !== accountId && counterFits(a, tab));

  function pickTab(next: TransactionTab) {
    setTab(next);
    setAdding(null);
    if (counterAccountId && !usable.some((a) => a.id === counterAccountId && counterFits(a, next))) {
      setCounterAccountId("");
    }
    if (categoryId && !usableCategories.some((c) => c.id === categoryId && groupsFor(next).includes(c.groupKey))) {
      setCategoryId("");
    }
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
        {tab === "person" && <option value={NEW}>+ Add person or lender…</option>}
      </select>
      {adding === "person" && inlineAdd("person")}
    </div>
  );

  return (
    <>
      <input type="hidden" name="direction" value={direction} />

      {tabs.length > 1 && (
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pickTab(t)}
              aria-pressed={tab === t}
              className={cn(
                "flex-1 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors max-sm:h-10 sm:py-1.5",
                tab === t
                  ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{TAB_LABEL_SHORT[t]}</span>
              <span className="hidden sm:inline">{TAB_LABEL[t]}</span>
            </button>
          ))}
        </div>
      )}

      {tab === "person" && (
        <div className="grid grid-cols-2 gap-2">
          {(["gave", "got"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setPersonMode(m)}
              aria-pressed={personMode === m}
              className={cn(
                "rounded-lg border px-3 py-2.5 text-left transition-colors",
                personMode === m
                  ? "border-foreground/25 bg-secondary text-secondary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block text-sm font-semibold">{m === "gave" ? "You gave" : "You got"}</span>
              <span className="block text-xs opacity-80">
                {m === "gave" ? "Lent, or paid them back" : "Borrowed, or got paid back"}
              </span>
            </button>
          ))}
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

      {tab === "outflow" && accountField("From account")}
      {tab === "inflow" && accountField("Into account")}

      {tab === "person" && (
        <>
          {counterField("Who")}
          {accountField(personMode === "gave" ? "Paid from" : "Received into")}
          <p className="-mt-2 text-xs text-muted-foreground">
            {personMode === "gave"
              ? "Counts as spending this month (as Lent out, or Paid back if you owed them)."
              : "Counts as money in this month (as Borrowed, or Got paid back if they owed you)."}
          </p>
        </>
      )}

      {tab === "move" && (
        <>
          {accountField("From account")}
          {counterField("To account")}
          <p className="-mt-2 text-xs text-muted-foreground">
            Between your own accounts. This won&rsquo;t touch your budget.
          </p>
        </>
      )}

      {hasCategory && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id("category")}>Category</Label>
          <select
            id={id("category")}
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => (e.target.value === NEW ? startAdding("category") : setCategoryId(e.target.value))}
            className={SELECT}
          >
            <option value="">Choose…</option>
            {relevant.map((c) => (
              <option key={c.id} value={c.id}>
                {c.parentId ? "\u00a0\u00a0\u00a0" : ""}
                {c.name}
              </option>
            ))}
            <option value={NEW}>+ New category…</option>
          </select>
          {adding === "category" && inlineAdd("category")}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("merchant")}>{tab === "outflow" || tab === "inflow" ? "Merchant / note" : "Note"}</Label>
        <Input
          id={id("merchant")}
          name="merchant"
          placeholder={tab === "person" ? "Lunch, rent share, …" : "Blinkit, landlord, …"}
          defaultValue={initial.merchant ?? ""}
        />
      </div>

      {showRepeat && (
        <label className="flex items-start gap-2.5 rounded-md bg-muted/60 p-3 text-sm">
          <input type="checkbox" name="recurring" className="mt-0.5 size-4 accent-primary" />
          <span>
            Repeat every month
            <span className="block text-xs text-muted-foreground">
              Rent, SIP, salary: added automatically on the same date each month.
              Manage them in Settings.
            </span>
          </span>
        </label>
      )}
    </>
  );
}
