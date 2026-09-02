"use client";

import { useState, useTransition } from "react";
import { ArrowCounterClockwise, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  deleteAccount,
  accountImpact,
  setAccountArchived,
  reorderAccounts,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/category-icon";
import { IconButton } from "@/components/icon-button";
import { SortableList, SortableRow } from "@/components/sortable-list";
import { Money } from "@/components/money";
import { EditAccountDialog } from "@/components/account-dialogs";
import type { AccountBalance } from "@/lib/budget";
import { cn } from "@/lib/utils";

export function AccountsManager({
  accounts,
  title,
  blurb,
  empty,
}: {
  accounts: AccountBalance[];
  title: string;
  blurb: string;
  empty: string;
}) {
  const byId = new Map(accounts.map((a) => [a.id, a]));

  async function save(ids: string[]) {
    const fd = new FormData();
    fd.set("ids", JSON.stringify(ids));
    const res = await reorderAccounts(fd);
    if (!res.ok) toast.error(res.error);
    return res.ok;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{blurb}</p>
      </div>

      {accounts.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <SortableList
          ids={accounts.map((a) => a.id)}
          onReorder={save}
          className="divide-y divide-border"
        >
          {(id) => {
            const account = byId.get(id);
            return account ? <Row key={id} account={account} /> : null;
          }}
        </SortableList>
      )}
    </section>
  );
}

function Row({ account }: { account: AccountBalance }) {
  const [pending, start] = useTransition();

  function archive() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", account.id);
      fd.set("archived", "true");
      await setAccountArchived(fd);
      toast.success(`${account.name} archived`);
    });
  }

  return (
    <SortableRow
      id={account.id}
      handleLabel={`Reorder ${account.name}`}
      className={cn("gap-3 px-3 py-3", pending && "opacity-40")}
    >
      <CategoryIcon
        name={account.icon}
        className="size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{account.name}</p>
        {account.kind === "asset" && (
          <p className="text-xs text-muted-foreground">
            {account.valueUpdatedAt
              ? `Updated ${new Date(account.valueUpdatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
              : "Value not set yet"}
          </p>
        )}
        {account.kind === "spending" && account.subtype && (
          <p className="text-xs text-muted-foreground capitalize">
            {account.subtype.replace("_", " ")}
            {!account.includeInNetWorth && " · not in net worth"}
          </p>
        )}
      </div>

      <Money
        minor={account.balanceMinor}
        className="shrink-0 text-sm font-semibold"
      />

      <EditAccountDialog account={account} />

      <IconButton
        label={`Archive ${account.name}`}
        onClick={archive}
        disabled={pending}
      >
        <ArrowCounterClockwise size={14} weight="bold" />
      </IconButton>

      <DeleteAccountButton account={account} disabled={pending} />
    </SortableRow>
  );
}

/**
 * Delete is only ever offered as a real option for an untouched account —
 * `transactions.account_id` is ON DELETE RESTRICT, so anything with history is
 * refused by Postgres regardless. The count is fetched on open so the dialog
 * can say which case you're in before you press anything.
 */
function DeleteAccountButton({
  account,
  disabled,
}: {
  account: AccountBalance;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [impact, setImpact] = useState<{ transactions: number } | null>(null);
  const [pending, start] = useTransition();

  function openConfirm() {
    setOpen(true);
    setImpact(null);
    accountImpact(account.id).then(setImpact);
  }

  function confirm() {
    start(async () => {
      const fd = new FormData();
      fd.set("id", account.id);
      const res = await deleteAccount(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${account.name} deleted`);
      setOpen(false);
    });
  }

  const blocked = impact !== null && impact.transactions > 0;

  return (
    <>
      <IconButton
        label={`Delete ${account.name}`}
        tone="danger"
        onClick={openConfirm}
        disabled={disabled}
      >
        <Trash size={14} weight="bold" />
      </IconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {account.name}?</DialogTitle>
          </DialogHeader>

          <div className="text-sm">
            {impact === null ? (
              <p className="text-muted-foreground">
                Checking what this affects…
              </p>
            ) : blocked ? (
              <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                {impact.transactions} transaction
                {impact.transactions === 1 ? "" : "s"} use this account, so it
                can&rsquo;t be deleted — that would rewrite your history.
                Archive it instead: the balance stays and it stops appearing in
                new transactions.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Nothing uses it. Safe to remove.
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
              disabled={pending || impact === null || blocked}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
