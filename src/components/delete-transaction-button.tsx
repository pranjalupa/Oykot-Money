"use client";

import { useState, useTransition } from "react";
import { Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { deleteTransaction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconButton } from "@/components/icon-button";

/**
 * Delete with a confirm step, like every other delete in the app. A
 * transaction is the one thing here with no archive to fall back on, which
 * made it the worst place for a one-click delete.
 */
export function DeleteTransactionButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteTransaction(fd);
      toast.success("Transaction deleted");
      setOpen(false);
    });
  }

  return (
    <>
      <IconButton
        label={`Delete ${label}`}
        tone="danger"
        onClick={() => setOpen(true)}
      >
        <Trash size={14} weight="bold" />
      </IconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this transaction?</DialogTitle>
            <DialogDescription>
              {label} comes out of your history and your totals. This
              can&rsquo;t be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={confirm}
              disabled={pending}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
