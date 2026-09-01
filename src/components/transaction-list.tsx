import { ArrowsLeftRight, Trash } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/category-icon";
import { deleteTransaction } from "@/app/actions";
import type { TransactionRow } from "@/lib/budget";

export function TransactionList({
  transactions,
  emptyNote,
}: {
  transactions: TransactionRow[];
  emptyNote?: string;
}) {
  if (!transactions.length) {
    return (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyNote ?? "No transactions yet."}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {transactions.map((t) => {
        const isTransfer = t.direction === "transfer" && !t.categoryId;
        const label = t.merchant || t.categoryName || "Transfer";

        return (
          <li
            key={t.id}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
          >
            {isTransfer ? (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <ArrowsLeftRight size={16} weight="duotone" />
              </span>
            ) : (
              <CategoryIcon
                name={t.categoryIcon}
                className="size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
              />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{label}</p>
              <p className="truncate text-xs text-muted-foreground">
                {new Date(t.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
                {" · "}
                {isTransfer
                  ? `${t.accountName} → ${t.counterAccountName ?? "?"}`
                  : `${t.categoryName ?? "Uncategorised"} · ${t.accountName}`}
              </p>
            </div>

            <Money
              minor={t.direction === "inflow" ? t.amountMinor : -t.amountMinor}
              tone={
                isTransfer
                  ? "muted"
                  : t.direction === "inflow"
                    ? "positive"
                    : "default"
              }
              className="shrink-0 text-sm font-semibold"
            />

            <form action={deleteTransaction} className="shrink-0">
              <input type="hidden" name="id" value={t.id} />
              <button
                type="submit"
                aria-label={`Delete ${label}`}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Trash size={14} weight="bold" />
              </button>
            </form>
          </li>
        );
      })}
    </ul>
  );
}
