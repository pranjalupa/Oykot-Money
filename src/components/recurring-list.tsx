"use client";

import { useActionState, useState, useTransition } from "react";
import { PencilSimple, Repeat, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import {
  setRecurringActive,
  deleteRecurringRule,
  updateRecurringRule,
  type ActionResult,
} from "@/app/actions";
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
import { CurrencySymbol } from "@/components/currency-provider";
import { toMajor } from "@/lib/money";
import { CategoryIcon } from "@/components/category-icon";
import { Money } from "@/components/money";
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
        transaction (rent, SIP, salary) and it lands here.
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
        <Money minor={rule.direction === "inflow" ? rule.amountMinor : -rule.amountMinor} />
      </span>

      <EditRecurringDialog rule={rule} label={label} />

      <IconButton
        label={rule.active ? `Pause ${label}` : `Resume ${label}`}
        onClick={toggle}
        disabled={pending}
      >
        <Repeat size={14} weight={rule.active ? "fill" : "regular"} />
      </IconButton>

      <IconButton
        label={`Remove repeat for ${label}. Past transactions stay`}
        tone="danger"
        onClick={remove}
        disabled={pending}
      >
        <Trash size={14} weight="bold" />
      </IconButton>
    </li>
  );
}

/**
 * Amount, day and label — the things that change when rent goes up. Affects
 * repeats from now on; transactions it already added are history and stay.
 */
function EditRecurringDialog({ rule, label }: { rule: RecurringRow; label: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const res = await updateRecurringRule(prev, fd);
      if (res.ok) {
        toast.success("Repeat updated");
        setOpen(false);
      }
      return res;
    },
    null,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <IconButton label={`Edit repeat for ${label}`}>
            <PencilSimple size={14} weight="bold" />
          </IconButton>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit repeat</DialogTitle>
          <DialogDescription>
            Applies from the next one. Transactions it already added stay as they
            are. Edit those directly if they need to change.
          </DialogDescription>
        </DialogHeader>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={rule.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`rep-amt-${rule.id}`}>
                Amount (<CurrencySymbol />)
              </Label>
              <Input
                id={`rep-amt-${rule.id}`}
                name="amount"
                inputMode="decimal"
                required
                autoFocus
                defaultValue={toMajor(rule.amountMinor)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`rep-day-${rule.id}`}>Day of month</Label>
              <Input
                id={`rep-day-${rule.id}`}
                name="dayOfMonth"
                type="number"
                min={1}
                max={31}
                required
                defaultValue={rule.dayOfMonth}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`rep-mer-${rule.id}`}>Merchant / note</Label>
            <Input
              id={`rep-mer-${rule.id}`}
              name="merchant"
              defaultValue={rule.merchant ?? ""}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Past the end of a short month, it lands on the last day.
          </p>
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
            {pending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
