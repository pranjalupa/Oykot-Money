"use client";

import { useActionState, useState, useTransition } from "react";
import { Pause, PencilSimple, Play, Trash, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { IconButton } from "@/components/icon-button";
import { RowActions } from "@/components/row-actions";
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
    // Phones: edge to edge in the card, like Home's lists. Inset and boxed,
    // it left names ~110px at 375px.
    <ul className="-mx-5 divide-y divide-border overflow-hidden border-y border-border sm:mx-0 sm:rounded-lg sm:border">
      {rules.map((r) => (
        <Row key={r.id} rule={r} />
      ))}
    </ul>
  );
}

/**
 * One repeat: name over "30th · account" on the left, the amount
 * alone on the right. Inside Settings' padded card there's less width than on
 * Home, and an account column there cut names to "G…" at 375px. The actions are
 * words (Edit · Pause · Remove), folded behind "⋯" on phones. As icons beside
 * the amount they squeezed the name to nothing at 375px, and Pause was the
 * same ⟳ glyph as the repeat marker, filled or not.
 */
function Row({ rule }: { rule: RecurringRow }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

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
      setConfirming(false);
      toast.success("Repeat removed");
    });
  }

  const label = rule.merchant || rule.categoryName || "Transfer";

  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-3 bg-card px-5 py-3.5 sm:px-3 sm:py-2.5",
        pending && "opacity-40",
      )}
    >
      <CategoryIcon
        name={rule.categoryIcon}
        className={cn(
          "size-10 shrink-0 rounded-xl bg-muted text-muted-foreground sm:size-8 sm:rounded-md",
          !rule.active && "opacity-55",
        )}
      />

      <div className={cn("min-w-0 flex-1", !rule.active && "opacity-55")}>
        <p className="flex items-center gap-2 text-[15px] font-medium sm:text-sm">
          <span className="truncate">{label}</span>
          {!rule.active && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              Paused
            </span>
          )}
        </p>
        <p className="mt-1 truncate text-[13px] text-muted-foreground sm:mt-0 sm:text-xs">
          {/* The section says "every month"; the row only needs which day. */}
          {ordinal(rule.dayOfMonth)} · {rule.accountName}
        </p>
      </div>

      <Money
        minor={rule.direction === "inflow" ? rule.amountMinor : -rule.amountMinor}
        tone={rule.direction === "inflow" ? "positive" : "default"}
        className={cn("tabular shrink-0 text-[15px] font-semibold sm:text-sm", !rule.active && "opacity-55")}
      />

      <RowActions label={label}>
        <EditRecurringDialog rule={rule} label={label} />
        <IconButton
          label={rule.active ? `Pause ${label}` : `Resume ${label}`}
          text={rule.active ? "Pause" : "Resume"}
          onClick={toggle}
          disabled={pending}
        >
          {rule.active ? <Pause size={14} weight="bold" /> : <Play size={14} weight="bold" />}
        </IconButton>
        <IconButton
          label={`Remove repeat for ${label}`}
          text="Remove"
          tone="danger"
          onClick={() => setConfirming(true)}
          disabled={pending}
        >
          <Trash size={14} weight="bold" />
        </IconButton>
      </RowActions>

      {/* It deleted on one tap before, with no way back. */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Remove this repeat?</DialogTitle>
            <DialogDescription>
              {label} stops being added from next month. The transactions it
              already added stay. To stop it for a while instead, pause it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={pending}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "Removing…" : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
          <IconButton label={`Edit repeat for ${label}`} text="Edit">
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
