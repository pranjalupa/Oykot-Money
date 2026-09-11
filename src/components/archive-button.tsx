"use client";

import { useState } from "react";
import { ArrowCounterClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconButton } from "@/components/icon-button";
import { Money } from "@/components/money";

/**
 * Archive / restore. Archived things drop out of net worth, so archiving one
 * that still holds money asks first — otherwise net worth just changes and
 * nothing says why.
 */
export function ArchiveButton({
  label,
  name,
  balanceMinor,
  archived,
  onToggle,
  disabled,
}: {
  label: string;
  name: string;
  balanceMinor: number;
  archived: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const needsConfirm = !archived && balanceMinor !== 0;

  return (
    <>
      <IconButton
        label={label}
        onClick={() => (needsConfirm ? setOpen(true) : onToggle())}
        disabled={disabled}
      >
        <ArrowCounterClockwise size={14} weight="bold" />
      </IconButton>

      {needsConfirm && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Archive {name}?</DialogTitle>
              <DialogDescription>
                It still has a balance of <Money minor={balanceMinor} />. Archived
                items don&rsquo;t count in net worth, so yours will change by that
                amount. Restore it any time to count it again.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setOpen(false);
                  onToggle();
                }}
              >
                Archive anyway
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
