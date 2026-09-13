import { ArrowsLeftRight, Repeat } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { LocalDate } from "@/components/currency-provider";
import { CategoryIcon } from "@/components/category-icon";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import type { PickerAccount, PickerCategory } from "@/components/transaction-fields";
import type { TransactionRow } from "@/lib/budget";

export function TransactionList({
  transactions,
  accounts,
  categories,
  emptyNote,
}: {
  transactions: TransactionRow[];
  /** Needed by Edit, which can move a transaction to another account. */
  accounts: PickerAccount[];
  categories: PickerCategory[];
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
        // A settlement moves money between you and a person (or your own
        // accounts). Borrowing is stored as an inflow, so the arrow flips.
        const isTransfer = !!t.counterAccountId && !t.categoryId;
        const borrowed = t.direction === "inflow" && !!t.counterAccountId;
        const route = borrowed
          ? `${t.counterAccountName ?? "?"} → ${t.accountName}`
          : `${t.accountName} → ${t.counterAccountName ?? "?"}`;
        const label = t.merchant || t.categoryName || (borrowed ? "Borrowed" : "Settlement");

        return (
          <li
            key={t.id}
            className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/50 sm:gap-4 sm:px-4"
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
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {label}
                {t.source === "recurring" && (
                  <Repeat
                    size={12}
                    weight="bold"
                    className="shrink-0 text-muted-foreground"
                    aria-label="Added by a monthly repeat"
                  />
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isTransfer
                  ? route
                  : t.counterAccountId
                    ? `${t.categoryName ?? "Uncategorised"} · ${route}`
                    : `${t.categoryName ?? "Uncategorised"} · ${t.accountName}`}
              </p>
            </div>

            {/* Date, amount and actions are fixed-width columns, so they line
                up from row to row whatever the name or amount length. */}
            <span className="flex w-10 shrink-0 flex-col items-center leading-none text-muted-foreground sm:w-12">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                <LocalDate date={t.date} options={{ day: "numeric" }} />
              </span>
              <span className="mt-0.5 text-[10px] uppercase">
                <LocalDate date={t.date} options={{ month: "short" }} />
              </span>
            </span>

            <Money
              minor={t.direction === "inflow" ? t.amountMinor : -t.amountMinor}
              tone={
                isTransfer
                  ? "muted"
                  : t.direction === "inflow"
                    ? "positive"
                    : "default"
              }
              className="w-20 shrink-0 text-right text-sm font-semibold sm:w-28"
            />

            <div className="flex shrink-0 items-center gap-0.5 border-l border-border pl-2 sm:pl-3">
              <EditTransactionDialog transaction={t} accounts={accounts} categories={categories} />
              <DeleteTransactionButton id={t.id} label={label} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
