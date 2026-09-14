"use client";

import { useState } from "react";
import { DotsThree } from "@phosphor-icons/react";
import { IconButton } from "@/components/icon-button";

/**
 * A row's icon buttons. Inline from sm up; on a phone they fold behind one
 * "⋯" button and open as a strip under the row, so the name and amount keep
 * the width. The row's container needs `flex-wrap`.
 */
export function RowActions({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="hidden shrink-0 items-center gap-0.5 sm:flex">{children}</div>
      <IconButton
        label={open ? `Hide actions for ${label}` : `Actions for ${label}`}
        tone={open ? "active" : "default"}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="size-9 sm:hidden"
      >
        <DotsThree size={18} weight="bold" />
      </IconButton>
      {open && (
        <div className="flex basis-full items-center justify-end gap-1 border-t border-border pt-2 sm:hidden">{children}</div>
      )}
    </>
  );
}
