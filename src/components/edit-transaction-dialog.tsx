"use client";

import { useActionState, useEffect, useState } from "react";
import { PencilSimple, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import { updateTransaction, type ActionResult } from "@/app/actions";
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
import { toMajor } from "@/lib/money";
import type { PickerCategory } from "@/components/transaction-dialog";
import type { TransactionRow } from "@/lib/budget";

/**
 * Amount, date, category and note are the things people actually get wrong.
 * Which account it came from isn't editable here — changing that rewrites two
 * balances, and deleting and re-adding is clearer than a silent correction.
 */
export function EditTransactionDialog({
  transaction,
  categories,
}: {
  transaction: TransactionRow;
  categories: PickerCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateTransaction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Transaction updated");
      setOpen(false);
    }
  }, [state]);

  const isTransfer = transaction.direction === "transfer" && !transaction.categoryId;

  // Income transactions pick from Income; everything else from the spend groups.
  const relevant = categories.filter((c) =>
    transaction.direction === "inflow"
      ? c.groupKey === "income"
      : c.groupKey !== "income",
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <IconButton
            label={`Edit ${transaction.merchant || transaction.categoryName || "transaction"}`}
          >
            <PencilSimple size={14} weight="bold" />
          </IconButton>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit transaction</DialogTitle>
          <DialogDescription>
            {transaction.accountName}
            {transaction.counterAccountName
              ? ` → ${transaction.counterAccountName}`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={transaction.id} />

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`amt-${transaction.id}`}>Amount (₹)</Label>
              <Input
                id={`amt-${transaction.id}`}
                name="amount"
                inputMode="decimal"
                required
                autoFocus
                defaultValue={toMajor(transaction.amountMinor)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`date-${transaction.id}`}>Date</Label>
              <Input
                id={`date-${transaction.id}`}
                name="date"
                type="date"
                required
                defaultValue={transaction.date}
              />
            </div>
          </div>

          {!isTransfer && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`cat-${transaction.id}`}>Category</Label>
              <select
                id={`cat-${transaction.id}`}
                name="categoryId"
                defaultValue={transaction.categoryId ?? ""}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <option value="">Uncategorised</option>
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
            <Label htmlFor={`mer-${transaction.id}`}>Merchant / note</Label>
            <Input
              id={`mer-${transaction.id}`}
              name="merchant"
              defaultValue={transaction.merchant ?? ""}
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
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
