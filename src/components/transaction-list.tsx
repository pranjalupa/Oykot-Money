import { ArrowsLeftRight, Repeat } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { LocalDate } from "@/components/currency-provider";
import { CategoryIcon } from "@/components/category-icon";
import { EditTransactionDialog } from "@/components/edit-transaction-dialog";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { TransactionRowSheet } from "@/components/transaction-row-sheet";
import type { PickerAccount, PickerCategory } from "@/components/transaction-fields";
import type { TransactionRow } from "@/lib/budget";

/**
 * Transactions, newest first.
 *
 * Phones: grouped under day headers, each row just icon · name · amount, and
 * tapping a row opens its sheet (details, Edit, Delete).
 * From sm up: no headers — the date is its own column before the amount, with
 * Edit and Delete inline.
 */
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
      {transactions.map((t, i) => {
        // A settlement moves money between you and a person (or your own
        // accounts). Money from a person is stored as an inflow, so the arrow flips.
        const isTransfer = !!t.counterAccountId && !t.categoryId;
        const borrowed = t.direction === "inflow" && !!t.counterAccountId;
        const route = borrowed
          ? `${t.counterAccountName ?? "?"} → ${t.accountName}`
          : `${t.accountName} → ${t.counterAccountName ?? "?"}`;
        const label =
          t.merchant ||
          t.categoryName ||
          (borrowed ? `Got from ${t.counterAccountName ?? "?"}` : `To ${t.counterAccountName ?? "?"}`);
        const detail = isTransfer
          ? route
          : t.counterAccountId
            ? `${t.categoryName ?? "Uncategorised"} · ${route}`
            : `${t.categoryName ?? "Uncategorised"} · ${t.accountName}`;
        const newDay = i === 0 || transactions[i - 1].date !== t.date;

        return [
          newDay && (
            <li
              key={`day-${t.date}`}
              className="bg-muted/40 px-4 py-2 text-xs font-semibold text-muted-foreground sm:hidden"
            >
              <LocalDate date={t.date} options={{ weekday: "short", day: "numeric", month: "short" }} />
            </li>
          ),
          <li
            key={t.id}
            className="group relative flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 active:bg-muted/60 sm:min-h-0 sm:gap-4 sm:active:bg-transparent"
          >
            {isTransfer ? (
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-8 sm:rounded-md">
                <ArrowsLeftRight size={16} weight="duotone" />
              </span>
            ) : (
              <CategoryIcon
                name={t.categoryIcon}
                className="size-9 shrink-0 rounded-lg bg-muted text-muted-foreground sm:size-8 sm:rounded-md"
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
              <p className="truncate text-xs text-muted-foreground">{detail}</p>
            </div>

            {/* Desktop columns: date, amount, actions — fixed widths so they line up. */}
            <span className="hidden w-12 shrink-0 flex-col items-center leading-none text-muted-foreground sm:flex">
              <span className="text-sm font-semibold text-foreground tabular-nums">
                <LocalDate date={t.date} options={{ day: "numeric" }} />
              </span>
              <span className="mt-0.5 text-[10px] uppercase">
                <LocalDate date={t.date} options={{ month: "short" }} />
              </span>
            </span>

            <Money
              minor={t.direction === "inflow" ? t.amountMinor : -t.amountMinor}
              tone={isTransfer ? "muted" : t.direction === "inflow" ? "positive" : "default"}
              className="shrink-0 text-right text-sm font-semibold sm:w-28"
            />

            <div className="hidden shrink-0 items-center gap-0.5 pl-1 sm:flex">
              <EditTransactionDialog transaction={t} accounts={accounts} categories={categories} />
              <DeleteTransactionButton id={t.id} label={label} />
            </div>

            <TransactionRowSheet transaction={t} label={label} detail={detail} accounts={accounts} categories={categories} />
          </li>,
        ];
      })}
    </ul>
  );
}
