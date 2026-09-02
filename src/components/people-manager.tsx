"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  ArrowCounterClockwise,
  Bank,
  PencilSimple,
  Plus,
  Trash,
  User,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createPerson,
  updatePerson,
  deletePerson,
  setPersonArchived,
  reorderPeople,
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
import { IconPicker } from "@/components/icon-picker";
import { IconButton } from "@/components/icon-button";
import { SortableList, SortableRow } from "@/components/sortable-list";
import { Money } from "@/components/money";
import type { PersonRow } from "@/lib/budget";
import { cn } from "@/lib/utils";

export function PeopleManager({ people }: { people: PersonRow[] }) {
  const [showArchived, setShowArchived] = useState(false);
  const visible = people.filter((p) => showArchived || !p.archived);
  const archivedCount = people.filter((p) => p.archived).length;
  const byId = new Map(visible.map((p) => [p.id, p]));

  async function save(ids: string[]) {
    const fd = new FormData();
    fd.set("ids", JSON.stringify(ids));
    const res = await reorderPeople(fd);
    if (!res.ok) toast.error(res.error);
    return res.ok;
  }

  if (!people.length) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          Nobody here yet. Add someone you&rsquo;ve lent money to, or a bank you
          borrowed from.
        </p>
        <div className="mt-4 flex justify-center">
          <PersonDialog />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SortableList
        ids={visible.map((p) => p.id)}
        onReorder={save}
        className="divide-y divide-border overflow-hidden rounded-xl border border-border"
      >
        {(id) => {
          const person = byId.get(id);
          return person ? <PersonRowItem key={id} person={person} /> : null;
        }}
      </SortableList>

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {showArchived
            ? "Hide archived"
            : `Show ${archivedCount} archived`}
        </button>
      )}
    </div>
  );
}

function PersonRowItem({ person }: { person: PersonRow }) {
  const [pending, start] = useTransition();

  function toggleArchive() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", person.id);
      fd.set("archived", String(!person.archived));
      await setPersonArchived(fd);
      toast.success(person.archived ? "Restored" : "Archived");
    });
  }

  // Positive means they owe you, negative means you owe them. The word matters
  // more than the sign here — "-2,000" alone never says which way round it is.
  const owes = person.balanceMinor > 0;
  const owed = person.balanceMinor < 0;

  return (
    <SortableRow
      id={person.id}
      handleLabel={`Reorder ${person.name}`}
      disabled={person.archived}
      className={cn(
        "gap-3 px-3 py-3",
        person.archived && "opacity-55",
        pending && "opacity-40",
      )}
    >
      <CategoryIcon
        name={person.icon ?? (person.kind === "institution" ? "Bank" : "User")}
        className="size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {person.name}
          {person.archived && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              archived
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {person.handle && <span>{person.handle} · </span>}
          {owes ? "owes you" : owed ? "you owe" : "settled up"}
        </p>
      </div>

      <Money
        minor={Math.abs(person.balanceMinor)}
        tone={owed ? "negative" : person.balanceMinor === 0 ? "muted" : "default"}
        className="shrink-0 text-sm font-semibold"
      />

      <PersonDialog person={person} />

      <IconButton
        label={person.archived ? `Restore ${person.name}` : `Archive ${person.name}`}
        onClick={toggleArchive}
        disabled={pending}
      >
        <ArrowCounterClockwise size={14} weight="bold" />
      </IconButton>

      <DeletePersonButton person={person} disabled={pending} />
    </SortableRow>
  );
}

/** One dialog for both add and edit — the fields are identical. */
export function PersonDialog({ person }: { person?: PersonRow }) {
  const editing = !!person;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    editing ? updatePerson : createPerson,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(editing ? "Saved" : "Person added");
      setOpen(false);
    }
  }, [state, editing]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {editing ? (
        <DialogTrigger
          render={
            <IconButton label={`Edit ${person.name}`}>
              <PencilSimple size={14} weight="bold" />
            </IconButton>
          }
        />
      ) : (
        <DialogTrigger
          render={
            <Button size="sm">
              <Plus size={14} weight="bold" />
              Add person
            </Button>
          }
        />
      )}

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${person.name}` : "Add someone"}</DialogTitle>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          {editing && <input type="hidden" name="id" value={person.id} />}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              name="name"
              defaultValue={person?.name}
              placeholder="Rahul"
              autoFocus
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="person-handle">Handle (optional)</Label>
            <Input
              id="person-handle"
              name="handle"
              defaultValue={person?.handle ?? ""}
              placeholder="@rahul, or a phone number"
            />
            <p className="text-xs text-muted-foreground">
              Only to tell two people with the same name apart.
            </p>
          </div>

          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Who is this?</legend>
            <div className="grid grid-cols-2 gap-2">
              <KindOption
                value="person"
                current={person?.kind ?? "person"}
                icon={<User size={16} weight="duotone" />}
                label="A person"
                hint="A friend, family"
              />
              <KindOption
                value="institution"
                current={person?.kind ?? "person"}
                icon={<Bank size={16} weight="duotone" />}
                label="A lender"
                hint="Bank, NBFC"
              />
            </div>
          </fieldset>

          <IconPicker
            id="person-icon"
            defaultValue={person?.icon ?? "User"}
          />

          {editing && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-note">Note (optional)</Label>
              <Input
                id="person-note"
                name="note"
                defaultValue={person.note ?? ""}
                placeholder="What this is about"
              />
            </div>
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
            {editing ? "Save" : "Add"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function KindOption({
  value,
  current,
  icon,
  label,
  hint,
}: {
  value: string;
  current: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2.5 text-sm transition-colors has-checked:border-primary has-checked:bg-primary/5">
      <input
        type="radio"
        name="kind"
        value={value}
        defaultChecked={current === value}
        className="sr-only"
      />
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function DeletePersonButton({
  person,
  disabled,
}: {
  person: PersonRow;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", person.id);
      const res = await deletePerson(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${person.name} deleted`);
      setOpen(false);
    });
  }

  return (
    <>
      <IconButton
        label={`Delete ${person.name}`}
        tone="danger"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        <Trash size={14} weight="bold" />
      </IconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {person.name}?</DialogTitle>
          </DialogHeader>

          <div className="text-sm">
            {person.hasHistory ? (
              <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                They have transactions, so this can&rsquo;t be deleted —
                removing them would rewrite your history. Archive them instead:
                the balance stays, they just stop appearing in new transactions.
              </p>
            ) : (
              <p className="text-muted-foreground">
                No transactions yet, so nothing is lost.
              </p>
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
              disabled={pending || person.hasHistory}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
