"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { PencilSimple } from "@phosphor-icons/react";
import { setPlannedAmount } from "@/app/actions";
import { formatMoney, toMajor } from "@/lib/money";
import { useCurrency } from "@/components/currency-provider";
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
  const currency = useCurrency();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(toMajor(plannedMinor) || ""));
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    setEditing(false);
    const next = Number(value.replace(/[^\d.-]/g, "") || 0);
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
        // A pencil and a dashed underline, always visible: a plain number
        // gave no hint it could be changed.
        className={cn(
          "tabular group/edit inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          pending && "opacity-50",
        )}
        title="Edit planned amount"
        aria-label={`Edit planned amount, currently ${plannedMinor > 0 ? formatMoney(plannedMinor, { currency }) : "not set"}`}
      >
        <span className="border-b border-dashed border-muted-foreground/50 group-hover/edit:border-foreground/60">
          {plannedMinor > 0 ? formatMoney(plannedMinor, { currency }) : "set budget"}
        </span>
        <PencilSimple size={11} weight="bold" aria-hidden className="shrink-0 opacity-60 group-hover/edit:opacity-100" />
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      autoFocus
      inputMode="decimal"
      aria-label="Budgeted amount"
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
