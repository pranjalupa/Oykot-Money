"use client";

import { useState } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Money } from "@/components/money";
import { LocalDate } from "@/components/currency-provider";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import type { PickerAccount, PickerCategory } from "@/components/transaction-fields";
import type { TransactionRow } from "@/lib/budget";

/**
 * Phones only: the whole transaction row is the tap target, and it opens a
 * sheet with the details and Edit / Delete — instead of two 32px icons
 * squeezed onto every row.
 */
export function TransactionRowSheet({
  transaction: t,
  label,
  detail,
  accounts,
  categories,
}: {
  transaction: TransactionRow;
  label: string;
  detail: string;
  accounts: PickerAccount[];
  categories: PickerCategory[];
}) {
  const [sheet, setSheet] = useState(false);
  const [edit, setEdit] = useState(false);
  const [remove, setRemove] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet(true)}
        aria-label={`Open ${label}`}
        className="absolute inset-0 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:hidden"
      />

      <Dialog open={sheet} onOpenChange={setSheet}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-8 font-heading text-lg">{label}</DialogTitle>
          </DialogHeader>
          <div className="rounded-xl bg-muted/60 px-4 py-4">
            <p className="font-heading text-3xl font-bold">
              <Money minor={t.direction === "inflow" ? t.amountMinor : -t.amountMinor} tone={t.direction === "inflow" ? "positive" : "default"} />
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              <LocalDate date={t.date} options={{ weekday: "long", day: "numeric", month: "long" }} />
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setSheet(false);
                setEdit(true);
              }}
            >
              <PencilSimple size={16} weight="bold" />
              Edit
            </Button>
            <Button
              variant="outline"
              className="h-11 text-destructive"
              onClick={() => {
                setSheet(false);
                setRemove(true);
              }}
            >
              <Trash size={16} weight="bold" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EditTransactionDialog transaction={t} accounts={accounts} categories={categories} open={edit} onOpenChange={setEdit} />
      <DeleteTransactionButton id={t.id} label={label} open={remove} onOpenChange={setRemove} />
    </>
  );
}
