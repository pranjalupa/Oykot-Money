import "server-only";

import { and, eq, max, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import {
  LOAN_CATEGORIES,
  LOAN_CATEGORY_KEYS,
  planPersonEntries,
  type LoanCategoryKey,
} from "@/lib/loan-categories";

/**
 * The four locked categories for this user, created on first need. An account
 * from the spreadsheet days already has them under their old names — those are
 * adopted (renamed and locked) rather than duplicated. Idempotent.
 */
export async function ensureLoanCategories(userId: string): Promise<Record<LoanCategoryKey, string>> {
  const existing = await db
    .select({ id: categories.id, name: categories.name, systemKey: categories.systemKey })
    .from(categories)
    .where(eq(categories.userId, userId));

  const byKey = new Map<string, string>();
  for (const c of existing) if (c.systemKey) byKey.set(c.systemKey, c.id);
  const missing = LOAN_CATEGORY_KEYS.filter((k) => !byKey.has(k));
  if (missing.length === 0) return Object.fromEntries(byKey) as Record<LoanCategoryKey, string>;

  const [{ value: last }] = await db
    .select({ value: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.userId, userId));
  let order = (last ?? 0) + 1;

  for (const key of missing) {
    const def = LOAN_CATEGORIES[key];
    const legacy = existing.find((c) => !c.systemKey && c.name === def.legacyName);
    if (legacy) {
      await db
        .update(categories)
        .set({ systemKey: key, name: def.name, groupKey: def.groupKey, parentId: null, archived: false })
        .where(eq(categories.id, legacy.id));
      continue;
    }
    // A parallel request may have just created it — the unique index makes
    // that a no-op here, and the re-read below picks it up.
    await db
      .insert(categories)
      .values({ userId, name: def.name, groupKey: def.groupKey, icon: def.icon, systemKey: key, sortOrder: order++ })
      .onConflictDoNothing();
  }

  const rows = await db
    .select({ id: categories.id, systemKey: categories.systemKey })
    .from(categories)
    .where(and(eq(categories.userId, userId), sql`${categories.systemKey} is not null`));
  return Object.fromEntries(rows.map((r) => [r.systemKey, r.id])) as Record<LoanCategoryKey, string>;
}

/**
 * A person's balance from their ledger — positive means they owe you. Same
 * signs as getAccountBalances: a transfer to the ledger raises it, an inflow
 * from it lowers it. `excludeId` leaves one transaction out, for re-deciding
 * an edit against the balance without it.
 */
export async function ledgerBalance(userId: string, ledgerId: string, excludeId?: string) {
  const [row] = await db
    .select({
      balance: sql<string>`coalesce(sum(
        case
          when ${transactions.counterAccountId} = ${ledgerId}
            then case when ${transactions.direction} = 'inflow' then -${transactions.amountMinor} else ${transactions.amountMinor} end
          when ${transactions.accountId} = ${ledgerId}
            then case when ${transactions.direction} = 'inflow' then ${transactions.amountMinor} else -${transactions.amountMinor} end
          else 0
        end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        or(eq(transactions.accountId, ledgerId), eq(transactions.counterAccountId, ledgerId)),
        excludeId ? ne(transactions.id, excludeId) : undefined,
      ),
    );
  return Number(row?.balance ?? 0);
}

/**
 * The rows to write for money with a person: the locked category decided by
 * the balance before it, split in two when the payment crosses zero.
 */
export async function personEntries<
  T extends { direction: string; amountMinor: number; counterAccountId: string | null; categoryId: string | null },
>(userId: string, tx: T, excludeId?: string): Promise<(T & { userId: string })[]> {
  if (!tx.counterAccountId) throw new Error("personEntries needs a person on the far end");
  const [keys, balance] = await Promise.all([
    ensureLoanCategories(userId),
    ledgerBalance(userId, tx.counterAccountId, excludeId),
  ]);
  const mode = tx.direction === "inflow" ? "got" : "gave";
  return planPersonEntries(balance, mode, tx.amountMinor).map((p) => ({
    ...tx,
    userId,
    amountMinor: p.amountMinor,
    categoryId: keys[p.key],
  }));
}
