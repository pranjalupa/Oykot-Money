"use client";

import { useTransition } from "react";
import { Repeat, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import { setRecurringActive, deleteRecurringRule } from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

export type RecurringRow = {
  id: string;
  amountMinor: number;
  direction: "outflow" | "inflow" | "transfer";
  dayOfMonth: number;
  active: boolean;
  merchant: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  accountName: string;
};

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function RecurringList({ rules }: { rules: RecurringRow[] }) {
  if (!rules.length) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Nothing repeats yet. Tick &ldquo;Repeat every month&rdquo; when adding a
        transaction — rent, SIP, salary — and it lands here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      {rules.map((r) => (
        <Row key={r.id} rule={r} />
      ))}
    </ul>
  );
}

function Row({ rule }: { rule: RecurringRow }) {
  const [pending, start] = useTransition();

  function toggle() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", rule.id);
      fd.set("active", String(!rule.active));
      await setRecurringActive(fd);
      toast.success(rule.active ? "Paused" : "Resumed");
    });
  }

  function remove() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", rule.id);
      await deleteRecurringRule(fd);
      toast.success("Repeat removed");
    });
  }

  const label = rule.merchant || rule.categoryName || "Transfer";

  return (
    <li
      className={cn(
        "flex items-center gap-3 bg-card px-3 py-2.5",
        !rule.active && "opacity-55",
        pending && "opacity-40",
      )}
    >
      <CategoryIcon
        name={rule.categoryIcon}
        className="size-7 shrink-0 rounded-md bg-muted text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {ordinal(rule.dayOfMonth)} of each month · {rule.accountName}
          {!rule.active && " · paused"}
        </p>
      </div>

      <span
        className={cn(
          "tabular shrink-0 text-sm font-semibold",
          rule.direction === "inflow" && "text-positive",
        )}
      >
        {formatMoney(rule.direction === "inflow" ? rule.amountMinor : -rule.amountMinor)}
      </span>

      <IconButton
        label={rule.active ? `Pause ${label}` : `Resume ${label}`}
        onClick={toggle}
        disabled={pending}
      >
        <Repeat size={14} weight={rule.active ? "fill" : "regular"} />
      </IconButton>

      <IconButton
        label={`Remove repeat for ${label} — past transactions stay`}
        tone="danger"
        onClick={remove}
        disabled={pending}
      >
        <Trash size={14} weight="bold" />
      </IconButton>
    </li>
  );
}
