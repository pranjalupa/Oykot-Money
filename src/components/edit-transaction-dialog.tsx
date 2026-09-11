"use client";

import { useActionState, useState } from "react";
import { PencilSimple, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import { updateTransaction, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  TransactionFields,
  type PickerAccount,
  type PickerCategory,
} from "@/components/transaction-fields";
import { toMajor } from "@/lib/money";
import type { TransactionRow } from "@/lib/budget";

/**
 * Everything is editable, account and type included — moving a transaction
 * to another account used to mean deleting and re-adding it.
 */
export function EditTransactionDialog({
  transaction,
  accounts,
  categories,
}: {
  transaction: TransactionRow;
  accounts: PickerAccount[];
  categories: PickerCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const res = await updateTransaction(prev, fd);
      if (res.ok) {
        toast.success("Transaction updated");
        setOpen(false);
      }
      return res;
    },
    null,
  );

  const label = transaction.merchant || transaction.categoryName || "transaction";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <IconButton label={`Edit ${label}`}>
            <PencilSimple size={14} weight="bold" />
          </IconButton>
        }
      />

      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit transaction</DialogTitle>
          <DialogDescription>
            Change anything. Move it to another account and both balances follow.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={transaction.id} />
          <TransactionFields
            idPrefix={`edit-${transaction.id}`}
            accounts={accounts}
            categories={categories}
            initial={{
              direction: transaction.direction,
              amount: String(toMajor(transaction.amountMinor)),
              date: transaction.date,
              accountId: transaction.accountId,
              counterAccountId: transaction.counterAccountId,
              categoryId: transaction.categoryId,
              merchant: transaction.merchant,
            }}
          />

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
