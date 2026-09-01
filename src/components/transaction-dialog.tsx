"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Plus, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createTransaction, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { GroupKey } from "@/db/schema";

export type PickerAccount = {
  id: string;
  name: string;
  kind: "spending" | "loan" | "asset";
};
export type PickerCategory = {
  id: string;
  name: string;
  groupKey: GroupKey;
  parentId: string | null;
};

const TABS = [
  { key: "outflow", label: "Spent" },
  { key: "inflow", label: "Received" },
  { key: "transfer", label: "Transfer" },
] as const;

export function TransactionDialog({
  accounts,
  categories,
  defaultDate,
  defaultCategoryId,
  trigger,
}: {
  accounts: PickerAccount[];
  categories: PickerCategory[];
  defaultDate: string;
  defaultCategoryId?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] =
    useState<(typeof TABS)[number]["key"]>("outflow");
  const [accountId, setAccountId] = useState("");
  const [counterAccountId, setCounterAccountId] = useState("");

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createTransaction,
    null,
  );

  const spending = accounts.filter((a) => a.kind === "spending");
  const nonSpending = accounts.filter((a) => a.kind !== "spending");

  useEffect(() => {
    if (!accountId && spending.length) setAccountId(spending[0].id);
  }, [accountId, spending]);

  // Money going out can land in any spend group; money coming in is Income.
  const relevant = useMemo(() => {
    const wanted: GroupKey[] =
      direction === "inflow"
        ? ["income"]
        : ["needs", "wants", "investments"];
    return categories.filter((c) => wanted.includes(c.groupKey));
  }, [categories, direction]);

  // Both ends tracked spending accounts => a pure transfer, no category.
  const fromKind = accounts.find((a) => a.id === accountId)?.kind;
  const toKind = accounts.find((a) => a.id === counterAccountId)?.kind;
  const isPureTransfer =
    direction === "transfer" && fromKind === "spending" && toKind === "spending";

  useEffect(() => {
    if (state?.ok) {
      toast.success("Transaction saved");
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ?? (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus size={16} weight="bold" />
          Add
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Add transaction</DialogTitle>
          <DialogDescription>
            {isPureTransfer
              ? "Moving money between your own accounts — this won't touch your budget."
              : "This counts toward the category you pick."}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
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
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                name="amount"
                inputMode="decimal"
                required
                autoFocus
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={defaultDate}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accountId">
              {direction === "inflow" ? "Into account" : "From account"}
            </Label>
            <select
              id="accountId"
              name="accountId"
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
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
              <Label htmlFor="counterAccountId">To account or person</Label>
              <select
                id="counterAccountId"
                name="counterAccountId"
                required
                value={counterAccountId}
                onChange={(e) => setCounterAccountId(e.target.value)}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="">Choose…</option>
                {accounts
                  .filter((a) => a.id !== accountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                      {a.kind === "loan" ? " (person)" : ""}
                      {a.kind === "asset" ? " (asset)" : ""}
                    </option>
                  ))}
              </select>
              {nonSpending.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add a person or asset account to lend or invest.
                </p>
              )}
            </div>
          )}

          {!isPureTransfer && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={defaultCategoryId ?? ""}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
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
            <Label htmlFor="merchant">Merchant / note</Label>
            <Input
              id="merchant"
              name="merchant"
              placeholder="Blinkit, landlord, …"
            />
          </div>

          {state && !state.ok && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
