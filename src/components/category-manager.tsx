"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  PencilSimple,
  Repeat,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  updateCategory,
  setCategoryArchived,
  setCategoryAssumeSpent,
  reorderCategories,
  deleteCategory,
  categoryImpact,
  type ActionResult,
} from "@/app/actions";
import { IconButton } from "@/components/icon-button";
import { SortableList, SortableRow } from "@/components/sortable-list";
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
import { IconPicker } from "@/components/icon-picker";
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
            <SortableGroup cats={inGroup} />
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

/**
 * One group's rows, reorderable by drag.
 *
 * Only ever sends this group's ids: reordering Needs must not renumber Wants,
 * and `sortOrder` is a single sequence across all of them.
 */
function SortableGroup({ cats }: { cats: Cat[] }) {
  const byId = new Map(cats.map((c) => [c.id, c]));

  async function save(ids: string[]) {
    const fd = new FormData();
    fd.set("ids", JSON.stringify(ids));
    const res = await reorderCategories(fd);
    if (!res.ok) toast.error(res.error);
    return res.ok;
  }

  return (
    <SortableList
      ids={cats.map((c) => c.id)}
      onReorder={save}
      className="divide-y divide-border overflow-hidden rounded-lg border border-border"
    >
      {(id) => {
        const cat = byId.get(id);
        return cat ? <CategoryRow key={id} cat={cat} /> : null;
      }}
    </SortableList>
  );
}

function CategoryRow({ cat }: { cat: Cat }) {
  const [pending, start] = useTransition();

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
    <SortableRow
      id={cat.id}
      handleLabel={`Reorder ${cat.name}`}
      disabled={cat.archived}
      className={cn(
        "gap-3 px-3 py-2.5",
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
        <IconButton
          label={
            cat.assumeSpent
              ? `Stop assuming ${cat.name} is spent each month`
              : `Assume ${cat.name} is spent each month`
          }
          tone={cat.assumeSpent ? "active" : "default"}
          onClick={toggleAssumeSpent}
          disabled={pending}
          aria-pressed={cat.assumeSpent}
        >
          <Repeat size={14} weight="bold" />
        </IconButton>
      )}

      <EditCategoryDialog cat={cat} />

      <IconButton
        label={cat.archived ? `Restore ${cat.name}` : `Retire ${cat.name}`}
        onClick={toggleArchive}
        disabled={pending}
      >
        <ArrowCounterClockwise size={14} weight="bold" />
      </IconButton>

      <DeleteCategoryButton cat={cat} disabled={pending} />
    </SortableRow>
  );
}

function EditCategoryDialog({ cat }: { cat: Cat }) {
  const [open, setOpen] = useState(false);
  // Close from inside the action rather than an effect watching `state` —
  // same result, without a second render pass.
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, fd) => {
      const res = await updateCategory(prev, fd);
      if (res.ok) {
        toast.success("Category updated");
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
          <IconButton label={`Edit ${cat.name}`}>
            <PencilSimple size={14} weight="bold" />
          </IconButton>
        }
      />

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

          <IconPicker id={`icon-${cat.id}`} defaultValue={cat.icon} />

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

/**
 * Delete, with the consequences read out first.
 *
 * `transactions.category_id` is ON DELETE SET NULL, so the spend survives and
 * only the label goes — that is a very different promise from "this deletes
 * your data", and the count is fetched on open so the confirm can be specific
 * instead of hedging.
 */
function DeleteCategoryButton({
  cat,
  disabled,
}: {
  cat: Cat;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<{
    transactions: number;
    children: number;
    repeats: number;
  } | null>(null);
  const [pending, start] = useTransition();

  function openConfirm() {
    setOpen(true);
    setImpact(null);
    categoryImpact(cat.id).then(setImpact);
  }

  function confirm() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", cat.id);
      const res = await deleteCategory(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${cat.name} deleted`);
      setOpen(false);
    });
  }

  return (
    <>
      <IconButton
        label={`Delete ${cat.name}`}
        tone="danger"
        onClick={openConfirm}
        disabled={disabled}
      >
        <Trash size={14} weight="bold" />
      </IconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {cat.name}?</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 text-sm">
            {impact === null ? (
              <p className="text-muted-foreground">Checking what this affects…</p>
            ) : (
              <>
                {impact.transactions > 0 && (
                  <p className="rounded-md bg-muted p-3">
                    {impact.transactions} transaction
                    {impact.transactions === 1 ? "" : "s"} will stay in your
                    history and keep counting towards your totals, but lose this
                    label and show as uncategorised.
                  </p>
                )}
                {impact.children > 0 && (
                  <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                    {impact.children} sub-categor
                    {impact.children === 1 ? "y" : "ies"} will be deleted too.
                  </p>
                )}
                {impact.repeats > 0 && (
                  <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                    {impact.repeats} monthly repeat
                    {impact.repeats === 1 ? "" : "s"} using it will stop and be
                    removed. The transactions they already made stay.
                  </p>
                )}
                {impact.transactions === 0 &&
                  impact.children === 0 &&
                  impact.repeats === 0 && (
                  <p className="text-muted-foreground">
                    Nothing else uses it. Safe to remove.
                  </p>
                )}
                <p className="text-muted-foreground">
                  Retiring it instead keeps everything and just hides it from
                  new transactions.
                </p>
              </>
            )}
          </div>

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
              disabled={pending || impact === null}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
