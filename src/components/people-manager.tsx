"use client";

import { useActionState, useState, useTransition } from "react";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bank,
  CaretRight,
  PencilSimple,
  Plus,
  Trash,
  User,
  Warning,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  createPerson,
  createTransaction,
  updatePerson,
  deletePerson,
  forgiveDebt,
  personHistory,
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
import { ArchiveButton } from "@/components/archive-button";
import { SortableList, SortableRow } from "@/components/sortable-list";
import { Money } from "@/components/money";
import { CurrencySymbol, LocalDate } from "@/components/currency-provider";
import type { PickerAccount, PickerCategory } from "@/components/transaction-fields";
import type { PersonRow, TransactionRow } from "@/lib/budget";
import { toMajor } from "@/lib/money";
import { cn } from "@/lib/utils";

type Picker = { accounts: PickerAccount[]; categories: PickerCategory[]; defaultDate: string };

/** Remembered per browser: the account you last paid a person from or into. */
const LAST_ACCOUNT = "oykot:last-person-account";

/**
 * Plain words for a balance. Positive means they'll pay you; the sign alone
 * ("-2,000") never says which way round it is.
 */
function balanceWords(b: number) {
  return b > 0 ? "You'll get" : b < 0 ? "You'll give" : "Settled";
}

/**
 * Settlements: everyone you lend to or borrow from.
 *
 * Money with a person starts from the person — tap them, then You gave or
 * You got — the way Khatabook and Splitwise do it. Rows stay quiet (name,
 * words, amount); everything you can do lives in the panel.
 */
export function PeopleManager({
  people,
  accounts,
  categories,
  defaultDate,
}: { people: PersonRow[] } & Picker) {
  const picker = { accounts, categories, defaultDate };
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
          return person ? <PersonRowItem key={id} person={person} picker={picker} /> : null;
        }}
      </SortableList>

      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {showArchived ? "Hide archived" : `Show ${archivedCount} archived`}
        </button>
      )}
    </div>
  );
}

function PersonRowItem({ person, picker }: { person: PersonRow; picker: Picker }) {
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<TransactionRow[] | null>(null);
  const owed = person.balanceMinor < 0;

  function loadHistory() {
    personHistory(person.id).then(setHistory, () => setHistory([]));
  }

  function openPanel() {
    setHistory(null);
    setOpen(true);
    loadHistory();
  }

  return (
    <SortableRow
      id={person.id}
      handleLabel={`Reorder ${person.name}`}
      disabled={person.archived}
      className={cn("gap-3 px-3 py-3", person.archived && "opacity-55")}
    >
      <button type="button" onClick={openPanel} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
        <CategoryIcon
          name={person.icon ?? (person.kind === "institution" ? "Bank" : "User")}
          className="size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium group-hover:underline">
            {person.name}
            {person.archived && <span className="ml-2 text-xs font-normal text-muted-foreground">archived</span>}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {person.handle && <>{person.handle} · </>}
            {balanceWords(person.balanceMinor)}
          </span>
        </span>
        {person.balanceMinor !== 0 && (
          <Money
            minor={Math.abs(person.balanceMinor)}
            tone={owed ? "negative" : "default"}
            className="shrink-0 text-sm font-semibold"
          />
        )}
        <CaretRight size={14} className="shrink-0 text-muted-foreground/60" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
          <PersonPanel person={person} picker={picker} history={history} onChanged={loadHistory} />
        </DialogContent>
      </Dialog>
    </SortableRow>
  );
}

type View = { kind: "overview" } | { kind: "money"; mode: "gave" | "got"; amount?: string } | { kind: "forgive" };

/** Everything about one person: balance, the two buttons, history, and managing them. */
function PersonPanel({
  person,
  picker,
  history,
  onChanged,
}: {
  person: PersonRow;
  picker: Picker;
  history: TransactionRow[] | null;
  onChanged: () => void;
}) {
  const [view, setView] = useState<View>({ kind: "overview" });
  const [pending, start] = useTransition();
  const b = person.balanceMinor;
  const canRecord = !!person.accountId && !person.archived;

  function done() {
    setView({ kind: "overview" });
    onChanged();
  }

  function toggleArchive() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", person.id);
      fd.set("archived", String(!person.archived));
      await setPersonArchived(fd);
      toast.success(person.archived ? "Restored" : "Archived");
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3 font-heading">
          <CategoryIcon
            name={person.icon ?? (person.kind === "institution" ? "Bank" : "User")}
            className="size-9 shrink-0 rounded-md bg-muted text-muted-foreground"
          />
          <span className="min-w-0 truncate">{person.name}</span>
        </DialogTitle>
      </DialogHeader>

      {view.kind === "money" && canRecord && (
        <MoneyForm person={person} mode={view.mode} amount={view.amount} picker={picker} onDone={done} onBack={() => setView({ kind: "overview" })} />
      )}

      {view.kind === "forgive" && (
        <ForgiveForm person={person} picker={picker} onDone={done} onBack={() => setView({ kind: "overview" })} />
      )}

      {view.kind === "overview" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-muted/60 px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">{b === 0 ? "Nothing open between you" : balanceWords(b)}</p>
            <p className="mt-1 font-heading text-3xl font-bold">
              {b === 0 ? "All settled" : <Money minor={Math.abs(b)} tone={b < 0 ? "negative" : "default"} />}
            </p>
          </div>

          {canRecord && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="h-12 text-sm" onClick={() => setView({ kind: "money", mode: "gave" })}>
                  <ArrowUpRight size={16} weight="bold" />
                  You gave
                </Button>
                <Button variant="outline" className="h-12 text-sm" onClick={() => setView({ kind: "money", mode: "got" })}>
                  <ArrowDownLeft size={16} weight="bold" />
                  You got
                </Button>
              </div>

              {b !== 0 && (
                <Button
                  className="w-full"
                  onClick={() =>
                    setView({ kind: "money", mode: b > 0 ? "got" : "gave", amount: String(toMajor(Math.abs(b))) })
                  }
                >
                  Settle up · <Money minor={Math.abs(b)} />
                </Button>
              )}

              {b > 0 && (
                <button
                  type="button"
                  onClick={() => setView({ kind: "forgive" })}
                  className="self-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Not getting it back? Forgive it
                </button>
              )}
            </>
          )}

          <section>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">History</h3>
            {history === null ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : history.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {history.map((t) => {
                  const forgiven = t.source === "forgive";
                  const got = t.direction === "inflow";
                  const note = forgiven ? t.categoryName : t.merchant;
                  return (
                    <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="w-14 shrink-0 text-xs text-muted-foreground">
                        <LocalDate date={t.date} options={{ day: "numeric", month: "short" }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{forgiven ? "Forgiven" : got ? "You got" : "You gave"}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[note, forgiven ? null : t.accountName].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Money
                        minor={t.amountMinor}
                        tone={got ? "positive" : "default"}
                        className="w-20 shrink-0 text-right font-semibold"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <div className={cn("flex items-center justify-end gap-1 border-t border-border pt-3", pending && "opacity-50")}>
            <span className="mr-auto text-xs text-muted-foreground">Manage</span>
            <PersonDialog person={person} />
            <ArchiveButton
              label={person.archived ? `Restore ${person.name}` : `Archive ${person.name}`}
              name={person.name}
              balanceMinor={b}
              archived={person.archived}
              onToggle={toggleArchive}
              disabled={pending}
            />
            <DeletePersonButton person={person} disabled={pending} />
          </div>
        </div>
      )}
    </>
  );
}

/**
 * You gave / You got — amount, date, account, note. The person is already
 * known, so there's nothing else to pick. Saved through createTransaction:
 * gave is a transfer to their ledger, got is an inflow from it.
 */
function MoneyForm({
  person,
  mode,
  amount,
  picker,
  onDone,
  onBack,
}: {
  person: PersonRow;
  mode: "gave" | "got";
  amount?: string;
  picker: Picker;
  onDone: () => void;
  onBack: () => void;
}) {
  const spending = picker.accounts.filter((a) => a.kind === "spending" && !a.archived);
  const [accountId, setAccountId] = useState(() => {
    try {
      const last = window.localStorage.getItem(LAST_ACCOUNT);
      if (last && spending.some((a) => a.id === last)) return last;
    } catch {
      // Storage can be blocked; the first account is a fine default.
    }
    return spending[0]?.id ?? "";
  });

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(async (prev, fd) => {
    const res = await createTransaction(prev, fd);
    if (res.ok) {
      try {
        window.localStorage.setItem(LAST_ACCOUNT, String(fd.get("accountId")));
      } catch {
        // Not remembering the account is harmless.
      }
      toast.success(mode === "gave" ? `Saved: you gave ${person.name}` : `Saved: you got from ${person.name}`);
      onDone();
    }
    return res;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="direction" value={mode === "gave" ? "transfer" : "inflow"} />
      <input type="hidden" name="counterAccountId" value={person.accountId ?? ""} />

      <p className="text-sm font-semibold">
        {mode === "gave" ? `You gave ${person.name}` : `You got from ${person.name}`}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="person-amount">
            Amount (<CurrencySymbol />)
          </Label>
          <Input id="person-amount" name="amount" inputMode="decimal" required autoFocus placeholder="0" defaultValue={amount} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="person-date">Date</Label>
          <Input id="person-date" name="date" type="date" required defaultValue={picker.defaultDate} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="person-account">{mode === "gave" ? "Paid from" : "Received into"}</Label>
        <select
          id="person-account"
          name="accountId"
          required
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {spending.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="person-note">Note (optional)</Label>
        <Input id="person-note" name="merchant" placeholder="Lunch, rent share, …" />
      </div>

      <p className="text-xs text-muted-foreground">
        Not counted as {mode === "gave" ? "spending" : "income"} — it only changes what you and {person.name} owe each other.
      </p>

      {state && !state.ok && (
        <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} weight="bold" />
          Back
        </Button>
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}

/** Clear what someone owes you and count it as spending, in a category you pick. */
function ForgiveForm({
  person,
  picker,
  onDone,
  onBack,
}: {
  person: PersonRow;
  picker: Picker;
  onDone: () => void;
  onBack: () => void;
}) {
  const options = picker.categories.filter((c) => !c.archived && (c.groupKey === "wants" || c.groupKey === "needs"));
  const [categoryId, setCategoryId] = useState(options.find((c) => c.groupKey === "wants")?.id ?? options[0]?.id ?? "");
  const [pending, start] = useTransition();

  function confirm() {
    start(async () => {
      const res = await forgiveDebt(person.id, categoryId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Forgave ${person.name}`);
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {person.name} still owes you <Money minor={person.balanceMinor} className="font-semibold" />. Forgiving clears
        it, and counts that amount as spending today — the money isn&rsquo;t coming back, so it&rsquo;s a real cost.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgive-category">Count it in</Label>
        <select
          id="forgive-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.groupKey === "wants" ? "Wants" : "Needs"} · {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onBack} disabled={pending}>
          <ArrowLeft size={14} weight="bold" />
          Back
        </Button>
        <Button type="button" variant="destructive" className="flex-1" onClick={confirm} disabled={pending || !categoryId}>
          {pending ? "Forgiving…" : <>Forgive <Money minor={person.balanceMinor} /></>}
        </Button>
      </div>
    </div>
  );
}

/** One dialog for both add and edit — the fields are identical. */
export function PersonDialog({ person }: { person?: PersonRow }) {
  const editing = !!person;
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    // Close from inside the action rather than an effect watching `state`.
    async (prev, fd) => {
      const res = await (editing ? updatePerson : createPerson)(prev, fd);
      if (res.ok) {
        toast.success(editing ? "Saved" : "Person added");
        setOpen(false);
      }
      return res;
    },
    null,
  );

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
              <Label htmlFor="person-note-edit">Note (optional)</Label>
              <Input
                id="person-note-edit"
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
