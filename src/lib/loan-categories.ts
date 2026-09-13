import type { GroupKey } from "@/db/schema";

/**
 * The four locked categories behind You gave / You got.
 *
 * Money with a person counts in the month it moves — lending is money you
 * can't spend this month, borrowing is money you can — while the person's
 * ledger tracks what's still owed. Which of the four a payment lands in
 * depends on the balance before it (see lib/loan-ledger.ts), so the user only
 * ever picks "gave" or "got".
 *
 * Found by `categories.system_key`, never by name. Locked in app/actions.ts:
 * no rename, regroup, retire, delete or sub-categories; budgeting and
 * reordering still work.
 */
export const LOAN_CATEGORY_KEYS = ["lent", "repaid_in", "borrowed", "repaid_out"] as const;
export type LoanCategoryKey = (typeof LOAN_CATEGORY_KEYS)[number];

export const LOAN_CATEGORIES: Record<
  LoanCategoryKey,
  { name: string; groupKey: GroupKey; groupLabel: string; icon: string; legacyName: string }
> = {
  lent: { name: "Lent out", groupKey: "wants", groupLabel: "Wants", icon: "HandCoins", legacyName: "Money Lended" },
  repaid_in: {
    name: "Got paid back",
    groupKey: "income",
    groupLabel: "Income",
    icon: "ArrowUUpLeft",
    legacyName: "Debt (Repayment Received)",
  },
  borrowed: { name: "Borrowed", groupKey: "income", groupLabel: "Income", icon: "ArrowUUpRight", legacyName: "Money Borrowed" },
  repaid_out: {
    name: "Paid back",
    groupKey: "needs",
    groupLabel: "Needs",
    icon: "ArrowUUpRight",
    legacyName: "Debt (Repayment Given)",
  },
};

export const LOCKED_CATEGORY_NOTE = "Used by You gave / You got on people, so it can't be renamed, moved, retired or deleted.";

/**
 * Where a payment lands, from the person's balance before it (positive: they
 * owe you). A payment that crosses zero splits: paying Rahul ₹3,000 when you
 * owe him ₹1,000 is ₹1,000 paid back and ₹2,000 lent.
 */
export function planPersonEntries(
  balanceMinor: number,
  mode: "gave" | "got",
  amountMinor: number,
): { key: LoanCategoryKey; amountMinor: number }[] {
  const owedBack = mode === "gave" ? Math.max(0, -balanceMinor) : Math.max(0, balanceMinor);
  const repay = Math.min(amountMinor, owedBack);
  const fresh = amountMinor - repay;
  const parts: { key: LoanCategoryKey; amountMinor: number }[] = [];
  if (repay > 0) parts.push({ key: mode === "gave" ? "repaid_out" : "repaid_in", amountMinor: repay });
  if (fresh > 0) parts.push({ key: mode === "gave" ? "lent" : "borrowed", amountMinor: fresh });
  return parts;
}
