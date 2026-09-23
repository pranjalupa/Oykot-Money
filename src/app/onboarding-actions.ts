"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, max, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgetLines,
  categories,
  groupTargets,
  profiles,
  transactions,
  DEFAULT_MONTH,
} from "@/db/schema";
import { getUserPrefs, requireUser } from "@/lib/auth";
import { requireWriter } from "@/lib/access";
import { currentMonthIn, todayIn } from "@/lib/dates";
import { toMinor } from "@/lib/money";
import { isGuideId } from "@/lib/guides";
import { SPEND_GROUPS } from "@/lib/targets";

// Not exported: a "use server" file may only export async functions.
const ACCOUNT_TYPES = ["bank", "cash", "wallet"] as const;
type AccountType = (typeof ACCOUNT_TYPES)[number];
const ICON: Record<AccountType, string> = { bank: "Bank", cash: "Money", wallet: "Wallet" };

export type OnboardingInput = {
  /** With an id: one of the starter accounts, edited. Without: a new one. Amounts in major units. */
  accounts: { id?: string; name: string; type: AccountType; balance: number }[];
  income: number;
  incomeCategoryId: string | null;
  split: { needs: number; wants: number; investments: number };
  /** Every starter spend category shown in the wizard: kept ones get this month's budget, the rest are retired. */
  budgets: { categoryId: string; keep: boolean; amount: number }[];
};

type Result = { ok: true } | { ok: false; error: string };
const fail = (error: string): Result => ({ ok: false, error });
const amount = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 0 ? toMinor(n) : null);

/**
 * Saves the setup wizard in one transaction: accounts with their balances,
 * the target split, this month's income and budgets. Unticked starter
 * categories are retired, not deleted, so they're one click from coming back.
 */
export async function completeOnboarding(input: OnboardingInput): Promise<Result> {
  const user = await requireWriter();
  const { timeZone } = await getUserPrefs();
  const month = currentMonthIn(timeZone);
  const today = todayIn(timeZone);

  const rows = (input.accounts ?? []).map((a) => ({
    id: typeof a.id === "string" ? a.id : undefined,
    name: String(a.name ?? "").trim().slice(0, 60),
    type: ACCOUNT_TYPES.includes(a.type) ? a.type : "bank",
    balance: amount(a.balance),
  }));
  if (rows.length === 0) return fail("Add at least one account.");
  if (rows.length > 12) return fail("That's a lot of accounts. Add the rest from Money.");
  if (rows.some((r) => !r.name)) return fail("Every account needs a name.");
  if (rows.some((r) => r.balance === null)) return fail("Balances must be a number, zero or more.");

  const split = SPEND_GROUPS.map((g) => ({ groupKey: g, percent: Number(input.split?.[g]) }));
  if (split.some((s) => !Number.isInteger(s.percent) || s.percent < 0 || s.percent > 100))
    return fail("Each share must be a whole number between 0 and 100.");
  if (split.reduce((s, v) => s + v.percent, 0) !== 100) return fail("Your split must add up to 100%.");

  const income = amount(input.income);
  if (income === null) return fail("Income must be a number, zero or more.");

  const owned = await db
    .select({ id: categories.id, groupKey: categories.groupKey, systemKey: categories.systemKey })
    .from(categories)
    .where(eq(categories.userId, user.id));
  const cat = new Map(owned.map((c) => [c.id, c]));

  const budgets = (input.budgets ?? []).map((b) => ({ ...b, minor: amount(b.amount) }));
  for (const b of budgets) {
    const c = cat.get(b.categoryId);
    if (!c || c.systemKey || c.groupKey === "income") return fail("A category in your budget wasn't found.");
    if (b.keep && b.minor === null) return fail("Budget amounts must be a number, zero or more.");
  }
  const incomeCat = input.incomeCategoryId ? cat.get(input.incomeCategoryId) : null;
  if (input.incomeCategoryId && (!incomeCat || incomeCat.groupKey !== "income" || incomeCat.systemKey))
    return fail("Pick an income category.");

  const existing = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.kind, "spending")));
  const existingIds = new Set(existing.map((a) => a.id));

  await db.transaction(async (tx) => {
    const [{ value: lastOrder }] = await tx
      .select({ value: max(accounts.sortOrder) })
      .from(accounts)
      .where(eq(accounts.userId, user.id));
    let order = (lastOrder ?? 0) + 1;

    const keptIds = new Set<string>();
    for (const r of rows) {
      const values = {
        name: r.name,
        subtype: r.type,
        icon: ICON[r.type],
        openingBalanceMinor: r.balance ?? 0,
        openingBalanceDate: today,
      };
      if (r.id && existingIds.has(r.id)) {
        keptIds.add(r.id);
        await tx.update(accounts).set(values).where(and(eq(accounts.id, r.id), eq(accounts.userId, user.id)));
      } else {
        await tx.insert(accounts).values({ ...values, userId: user.id, kind: "spending", sortOrder: order++ });
      }
    }

    // Starter accounts you removed: deleted if nothing uses them, otherwise archived.
    const removed = [...existingIds].filter((id) => !keptIds.has(id));
    if (removed.length) {
      const used = await tx
        .selectDistinct({ a: transactions.accountId, c: transactions.counterAccountId })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, user.id),
            or(inArray(transactions.accountId, removed), inArray(transactions.counterAccountId, removed)),
          ),
        );
      const inUse = new Set(used.flatMap((u) => [u.a, u.c]));
      const free = removed.filter((id) => !inUse.has(id));
      const busy = removed.filter((id) => inUse.has(id));
      if (free.length) await tx.delete(accounts).where(and(eq(accounts.userId, user.id), inArray(accounts.id, free)));
      if (busy.length)
        await tx.update(accounts).set({ archived: true }).where(and(eq(accounts.userId, user.id), inArray(accounts.id, busy)));
    }

    for (const s of split) {
      await tx
        .insert(groupTargets)
        .values({ userId: user.id, month: DEFAULT_MONTH, groupKey: s.groupKey, percent: s.percent })
        .onConflictDoUpdate({
          target: [groupTargets.userId, groupTargets.month, groupTargets.groupKey],
          set: { percent: s.percent },
        });
    }

    const lines = [
      ...(incomeCat && income > 0 ? [{ categoryId: incomeCat.id, plannedMinor: income }] : []),
      ...budgets.filter((b) => b.keep).map((b) => ({ categoryId: b.categoryId, plannedMinor: b.minor ?? 0 })),
    ];
    for (const l of lines) {
      await tx
        .insert(budgetLines)
        .values({ userId: user.id, month, categoryId: l.categoryId, plannedMinor: l.plannedMinor })
        .onConflictDoUpdate({ target: [budgetLines.month, budgetLines.categoryId], set: { plannedMinor: l.plannedMinor } });
    }

    const retire = budgets.filter((b) => !b.keep).map((b) => b.categoryId);
    if (retire.length)
      await tx
        .update(categories)
        .set({ archived: true })
        .where(and(eq(categories.userId, user.id), inArray(categories.id, retire)));

    await tx.update(profiles).set({ onboardedAt: new Date(), updatedAt: new Date() }).where(eq(profiles.userId, user.id));
  });

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Skip the wizard — the app works with the starter set, and the guides still show. */
export async function skipOnboarding(): Promise<Result> {
  const user = await requireUser();
  await db.update(profiles).set({ onboardedAt: new Date() }).where(eq(profiles.userId, user.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function dismissGuide(id: string) {
  const user = await requireUser();
  if (!isGuideId(id)) return;
  await db
    .update(profiles)
    .set({ dismissedGuides: sql`array_append(${profiles.dismissedGuides}, ${id})` })
    .where(and(eq(profiles.userId, user.id), sql`not (${id} = any(${profiles.dismissedGuides}))`));
}

export async function resetGuides() {
  const user = await requireUser();
  await db.update(profiles).set({ dismissedGuides: sql`'{}'::text[]` }).where(eq(profiles.userId, user.id));
  revalidatePath("/", "layout");
}
