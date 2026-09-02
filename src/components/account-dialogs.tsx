"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, PencilSimple, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import {
  createAccount,
  updateAccount,
  updateAssetValue,
  type ActionResult,
} from "@/app/actions";
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
import { IconPicker } from "@/components/icon-picker";
import { toMajor } from "@/lib/money";
import { cn } from "@/lib/utils";

const KINDS = [
  {
    key: "spending",
    label: "Spending",
    hint: "A bank account, cash, or a wallet you spend from.",
  },
  {
    key: "loan",
    label: "Person",
    hint: "Someone you lend to or borrow from. Tracks what they owe you.",
  },
  {
    key: "asset",
    label: "Asset",
    hint: "SIP, PF, emergency fund. You set the value; no transaction history.",
  },
] as const;

function ErrorNote({ error }: { error: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
      {error}
    </p>
  );
}

export function NewAccountDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<(typeof KINDS)[number]["key"]>("spending");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createAccount,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Account added");
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus size={16} weight="bold" />
        Account
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">New account</DialogTitle>
          <DialogDescription>
            {KINDS.find((k) => k.key === kind)!.hint}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="kind" value={kind} />

          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                aria-pressed={kind === k.key}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                  kind === k.key
                    ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/15"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-name">Name</Label>
            <Input
              id="acc-name"
              name="name"
              required
              autoFocus
              placeholder={
                kind === "loan" ? "Rahul" : kind === "asset" ? "SIP" : "HDFC Savings"
              }
            />
          </div>

          {kind === "spending" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-subtype">Type</Label>
                <select
                  id="acc-subtype"
                  name="subtype"
                  defaultValue="bank"
                  className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="wallet">UPI wallet</option>
                  <option value="credit_card">Credit card</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="acc-opening">Balance right now (₹)</Label>
                <Input
                  id="acc-opening"
                  name="openingBalance"
                  inputMode="decimal"
                  defaultValue="0"
                />
              </div>
            </>
          )}

          {kind === "asset" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="acc-value">What it&rsquo;s worth today (₹)</Label>
              <Input
                id="acc-value"
                name="currentValue"
                inputMode="decimal"
                defaultValue="0"
              />
            </div>
          )}

          <IconPicker
            id="acc-icon"
            defaultValue={kind === "loan" ? "HandCoins" : "Bank"}
          />

          {state && !state.ok && <ErrorNote error={state.error} />}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Adding…" : "Add account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditAccountDialog({
  account,
}: {
  account: {
    id: string;
    name: string;
    kind: "spending" | "loan" | "asset";
    icon: string | null;
    openingBalanceMinor: number;
    currentValueMinor: number;
    includeInNetWorth: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  const isAsset = account.kind === "asset";

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    isAsset ? updateAssetValue : updateAccount,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(isAsset ? "Value updated" : "Account updated");
      setOpen(false);
    }
  }, [state, isAsset]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <IconButton label={`Edit ${account.name}`}>
            <PencilSimple size={14} weight="bold" />
          </IconButton>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {isAsset ? `Update ${account.name}` : "Edit account"}
          </DialogTitle>
          {isAsset && (
            <DialogDescription>
              Whatever the fund says it&rsquo;s worth today. No returns math —
              just the number.
            </DialogDescription>
          )}
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={account.id} />

          {isAsset ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`val-${account.id}`}>Current value (₹)</Label>
              <Input
                id={`val-${account.id}`}
                name="currentValue"
                inputMode="decimal"
                autoFocus
                defaultValue={toMajor(account.currentValueMinor) || ""}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`nm-${account.id}`}>Name</Label>
                <Input
                  id={`nm-${account.id}`}
                  name="name"
                  required
                  defaultValue={account.name}
                />
              </div>

              {account.kind === "spending" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`ob-${account.id}`}>Opening balance (₹)</Label>
                  <Input
                    id={`ob-${account.id}`}
                    name="openingBalance"
                    inputMode="decimal"
                    defaultValue={toMajor(account.openingBalanceMinor) || "0"}
                  />
                  <p className="text-xs text-muted-foreground">
                    The starting point transactions are added to.
                  </p>
                </div>
              )}

              <IconPicker
                id={`ic-${account.id}`}
                defaultValue={account.icon ?? "Bank"}
              />

              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="includeInNetWorth"
                  defaultChecked={account.includeInNetWorth}
                  className="size-4 accent-primary"
                />
                Count this in net worth
              </label>
            </>
          )}

          {state && !state.ok && <ErrorNote error={state.error} />}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
