"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { setPlannedAmount } from "@/app/actions";
import { toMajor } from "@/lib/money";
import { cn } from "@/lib/utils";

/**
 * Click the planned figure, type a new one, Enter or blur to save.
 * Editing the plan is the single most frequent write in this app, so it
 * shouldn't cost a dialog.
 */
export function PlannedInput({
  categoryId,
  month,
  plannedMinor,
}: {
  categoryId: string;
  month: string;
  plannedMinor: number;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(toMajor(plannedMinor) || ""));
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    setEditing(false);
    const next = Number(value.replace(/[,\s₹]/g, "") || 0);
    if (next === toMajor(plannedMinor)) return;

    start(async () => {
      const fd = new FormData();
      fd.set("categoryId", categoryId);
      fd.set("month", month);
      fd.set("planned", String(next));
      const res = await setPlannedAmount(null, fd);
      if (!res.ok) {
        toast.error(res.error);
        setValue(String(toMajor(plannedMinor) || ""));
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
          requestAnimationFrame(() => inputRef.current?.select());
        }}
        className={cn(
          "tabular rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          pending && "opacity-50",
        )}
        title="Edit planned amount"
      >
        {plannedMinor > 0 ? `₹${toMajor(plannedMinor).toLocaleString("en-IN")}` : "set plan"}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      autoFocus
      inputMode="decimal"
      aria-label="Planned amount in rupees"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          save();
        }
        if (e.key === "Escape") {
          setValue(String(toMajor(plannedMinor) || ""));
          setEditing(false);
        }
      }}
      onClick={(e) => e.preventDefault()}
      className="tabular h-6 w-24 rounded border border-input bg-background px-1.5 text-right text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    />
  );
}
