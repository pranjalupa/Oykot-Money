"use client";

import { useActionState, useState } from "react";
import { Plus, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createTransaction, type ActionResult } from "@/app/actions";
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

export type { PickerAccount, PickerCategory } from "@/components/transaction-fields";

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
  // Close from inside the action rather than an effect watching `state`.
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const res = await createTransaction(prev, fd);
      if (res.ok) {
        toast.success("Transaction saved");
        setOpen(false);
      }
      return res;
    },
    null,
  );

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
            Counts toward the category you pick. Moving money between your own
            accounts doesn&rsquo;t touch the budget.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <TransactionFields
            idPrefix="new"
            accounts={accounts}
            categories={categories}
            initial={{ date: defaultDate, categoryId: defaultCategoryId ?? null }}
            showRepeat
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
            {pending ? "Saving…" : "Save transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
