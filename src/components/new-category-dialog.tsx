"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus, Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createCategory, type ActionResult } from "@/app/actions";
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
import { ICON_CHOICES } from "@/lib/defaults";
import type { GroupKey } from "@/db/schema";

export function NewCategoryDialog({
  groupKey,
  parents,
}: {
  groupKey: GroupKey;
  parents: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [parentId, setParentId] = useState("");
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    createCategory,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Category added");
      setOpen(false);
      setParentId("");
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Plus size={15} weight="bold" />
        Category
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">New category</DialogTitle>
          <DialogDescription>
            Make it a subcategory to break something like Subscriptions into
            its parts.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="groupKey" value={groupKey} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required autoFocus placeholder="Netflix" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="parentId">Sits under (optional)</Label>
            <select
              id="parentId"
              name="parentId"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <option value="">Nothing — top level</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {parentId && (
            <label className="flex items-start gap-2.5 rounded-md bg-muted/60 p-3 text-sm">
              <input
                type="checkbox"
                name="budgetsSeparately"
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                Give it its own planned amount
                <span className="block text-xs text-muted-foreground">
                  Off means it just rolls up into the parent&rsquo;s plan.
                </span>
              </span>
            </label>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="icon">Icon</Label>
            <select
              id="icon"
              name="icon"
              defaultValue="Tag"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {ICON_CHOICES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

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
            {pending ? "Adding…" : "Add category"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
