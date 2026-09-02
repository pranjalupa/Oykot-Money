"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  CaretDown,
  CaretUp,
  PencilSimple,
  Repeat,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  updateCategory,
  setCategoryArchived,
  setCategoryAssumeSpent,
  moveCategory,
  type ActionResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/category-icon";
import { ICON_CHOICES } from "@/lib/defaults";
import { GROUP_META } from "@/lib/targets";
import { GROUP_KEYS, type GroupKey } from "@/db/schema";
import { cn } from "@/lib/utils";

type Cat = {
  id: string;
  name: string;
  groupKey: GroupKey;
  icon: string | null;
  parentId: string | null;
  archived: boolean;
  budgetsSeparately: boolean;
  assumeSpent: boolean;
};

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const [showArchived, setShowArchived] = useState(false);
  const visible = categories.filter((c) => showArchived || !c.archived);
  const archivedCount = categories.filter((c) => c.archived).length;

  return (
    <div className="flex flex-col gap-4">
      {GROUP_KEYS.map((g) => {
        const inGroup = visible.filter((c) => c.groupKey === g);
        if (!inGroup.length) return null;

        return (
          <div key={g}>
            <p className="mb-1.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: `var(--${g})` }}
              />
              {GROUP_META[g].label}
            </p>
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {inGroup.map((c, idx) => (
                <CategoryRow
                  key={c.id}
                  cat={c}
                  isFirst={idx === 0}
                  isLast={idx === inGroup.length - 1}
                />
              ))}
            </ul>
          </div>
        );
      })}

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {showArchived
            ? "Hide retired categories"
            : `Show ${archivedCount} retired categor${archivedCount === 1 ? "y" : "ies"}`}
        </button>
      )}
    </div>
  );
}

function CategoryRow({
  cat,
  isFirst,
  isLast,
}: {
  cat: Cat;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();

  function move(direction: "up" | "down") {
    start(async () => {
      const fd = new FormData();
      fd.set("id", cat.id);
      fd.set("direction", direction);
      const res = await moveCategory(fd);
      if (!res.ok) toast.error(res.error);
    });
  }

  function toggleArchive() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", cat.id);
      fd.set("archived", String(!cat.archived));
      await setCategoryArchived(fd);
      toast.success(cat.archived ? "Category restored" : "Category retired");
    });
  }

  function toggleAssumeSpent() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", cat.id);
      fd.set("assumeSpent", String(!cat.assumeSpent));
      const res = await setCategoryAssumeSpent(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        cat.assumeSpent
          ? `${cat.name} counts only what you log`
          : `${cat.name} counts as spent every month`,
      );
    });
  }

  // Needs only: assuming a Want was spent would quietly inflate discretionary
  // spending, and assuming income arrived is just wrong. A child that rolls its
  // plan up into its parent is excluded too — it has no plan of its own to
  // assume, so it would add spending against a budget of zero and read as
  // permanently overspent.
  const canAssume =
    cat.groupKey === "needs" &&
    !cat.archived &&
    (!cat.parentId || cat.budgetsSeparately);

  return (
    <li
      className={cn(
        "flex items-center gap-3 bg-card px-3 py-2.5",
        cat.archived && "opacity-55",
        pending && "opacity-40",
      )}
    >
      <CategoryIcon
        name={cat.icon}
        className="size-7 shrink-0 rounded-md bg-muted text-muted-foreground"
      />
      <span className="min-w-0 flex-1 truncate text-sm">
        {cat.parentId && <span className="text-muted-foreground">— </span>}
        {cat.name}
        {cat.archived && (
          <span className="ml-2 text-xs text-muted-foreground">retired</span>
        )}
        {cat.assumeSpent && !cat.archived && (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            assumed
          </span>
        )}
      </span>

      {canAssume && (
        <button
          type="button"
          onClick={toggleAssumeSpent}
          disabled={pending}
          aria-pressed={cat.assumeSpent}
          title={
            cat.assumeSpent
              ? `${cat.name} counts as spent each month without a transaction. Click to stop.`
              : `Count ${cat.name} as spent each month without logging it.`
          }
          aria-label={
            cat.assumeSpent
              ? `Stop assuming ${cat.name} is spent each month`
              : `Assume ${cat.name} is spent each month`
          }
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            cat.assumeSpent
              ? "bg-primary/15 text-primary hover:bg-primary/25"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Repeat size={14} weight="bold" />
        </button>
      )}

      {/* Arrows rather than drag-and-drop: reordering happens rarely, and a
          keyboard-reachable button beats a pointer-only gesture. */}
      <div className="flex shrink-0 flex-col">
        <button
          type="button"
          onClick={() => move("up")}
          disabled={pending || isFirst}
          aria-label={`Move ${cat.name} up`}
          className="flex h-3.5 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <CaretUp size={11} weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => move("down")}
          disabled={pending || isLast}
          aria-label={`Move ${cat.name} down`}
          className="flex h-3.5 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <CaretDown size={11} weight="bold" />
        </button>
      </div>

      <EditCategoryDialog cat={cat} />

      <button
        type="button"
        onClick={toggleArchive}
        disabled={pending}
        aria-label={cat.archived ? `Restore ${cat.name}` : `Retire ${cat.name}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ArrowCounterClockwise size={14} weight="bold" />
      </button>
    </li>
  );
}

function EditCategoryDialog({ cat }: { cat: Cat }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    updateCategory,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Category updated");
      setOpen(false);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`Edit ${cat.name}`}
        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <PencilSimple size={14} weight="bold" />
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Edit category</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="id" value={cat.id} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name-${cat.id}`}>Name</Label>
            <Input
              id={`name-${cat.id}`}
              name="name"
              required
              defaultValue={cat.name}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`group-${cat.id}`}>Group</Label>
            <select
              id={`group-${cat.id}`}
              name="groupKey"
              defaultValue={cat.groupKey}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {GROUP_KEYS.map((g) => (
                <option key={g} value={g}>
                  {GROUP_META[g].label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`icon-${cat.id}`}>Icon</Label>
            <select
              id={`icon-${cat.id}`}
              name="icon"
              defaultValue={cat.icon ?? "Tag"}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {ICON_CHOICES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          {cat.parentId && (
            <label className="flex items-start gap-2.5 rounded-md bg-muted/60 p-3 text-sm">
              <input
                type="checkbox"
                name="budgetsSeparately"
                defaultChecked={cat.budgetsSeparately}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Give it its own planned amount
                <span className="block text-xs text-muted-foreground">
                  Off means it rolls up into the parent&rsquo;s plan.
                </span>
              </span>
            </label>
          )}

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
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
