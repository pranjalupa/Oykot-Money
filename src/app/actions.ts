"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql, max, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgetLines,
  categories,
  groupTargets,
  transactions,
  recurringRules,
  GROUP_KEYS,
  ACCOUNT_KINDS,
  DEFAULT_MONTH,
  type GroupKey,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { toMinor } from "@/lib/money";
import { isValidDate, isValidMonth, SPEND_GROUPS } from "@/lib/targets";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/**
 * Ownership check. Every mutation that takes an id runs through one of these
 * before touching a row — an id from a form field is user input, and without
 * this a crafted request could reach another account's data.
 */
async function ownsCategory(userId: string, id: string) {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return !!row;
}

async function ownsAccount(userId: string, id: string) {
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .limit(1);
  return !!row;
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  const n = Number(String(raw ?? "").replace(/[,\s₹]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return toMinor(n);
}

function refresh() {
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export async function createTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();

  const date = String(formData.get("date") ?? "");
  const direction = String(formData.get("direction") ?? "outflow");
  const accountId = String(formData.get("accountId") ?? "");
  const rawCategory = String(formData.get("categoryId") ?? "");
  const rawCounter = String(formData.get("counterAccountId") ?? "");
  const amountMinor = parseAmount(formData.get("amount"));

  if (!isValidDate(date)) return fail("Pick a valid date.");
  if (amountMinor === null || amountMinor === 0)
    return fail("Enter an amount greater than zero.");
  if (!["outflow", "inflow", "transfer"].includes(direction))
    return fail("Unknown transaction type.");
  if (!accountId || !(await ownsAccount(user.id, accountId)))
    return fail("Pick an account.");

  const counterAccountId = rawCounter || null;
  if (counterAccountId && !(await ownsAccount(user.id, counterAccountId)))
    return fail("Pick a valid destination account.");
  if (counterAccountId === accountId)
    return fail("Pick two different accounts for a transfer.");

  let categoryId = rawCategory || null;
  if (categoryId && !(await ownsCategory(user.id, categoryId)))
    return fail("Pick a valid category.");

  // The rule from the data model: only a spending↔spending move skips a
  // category. Anything else — including lending to a person — needs one.
  if (direction === "transfer") {
    if (!counterAccountId) return fail("A transfer needs a destination account.");
    const [from] = await db
      .select({ kind: accounts.kind })
      .from(accounts)
      .where(eq(accounts.id, accountId));
    const [to] = await db
      .select({ kind: accounts.kind })
      .from(accounts)
      .where(eq(accounts.id, counterAccountId));

    if (from?.kind === "spending" && to?.kind === "spending") {
      categoryId = null; // invisible to the budget, by design
    } else if (!categoryId) {
      return fail("This transfer still needs a category.");
    }
  } else if (!categoryId) {
    return fail("Pick a category.");
  }

  const merchant = String(formData.get("merchant") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;

  await db.insert(transactions).values({
    userId: user.id,
    date,
    amountMinor,
    direction: direction as "outflow" | "inflow" | "transfer",
    accountId,
    counterAccountId,
    categoryId,
    merchant,
    note,
  });

  // "Repeat monthly" saves a template alongside the transaction. It's marked
  // as already run for this month, so today's entry isn't duplicated.
  if (formData.get("recurring") === "on") {
    await db.insert(recurringRules).values({
      userId: user.id,
      amountMinor,
      direction: direction as "outflow" | "inflow" | "transfer",
      accountId,
      counterAccountId,
      categoryId,
      merchant,
      note,
      dayOfMonth: Number(date.slice(8, 10)) || 1,
      lastRunMonth: date.slice(0, 7),
    });
  }

  refresh();
  return { ok: true };
}

export async function updateTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing transaction.");

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!existing) return fail("Transaction not found.");

  const date = String(formData.get("date") ?? "");
  const amountMinor = parseAmount(formData.get("amount"));
  const rawCategory = String(formData.get("categoryId") ?? "");

  if (!isValidDate(date)) return fail("Pick a valid date.");
  if (amountMinor === null || amountMinor === 0)
    return fail("Enter an amount greater than zero.");
  if (rawCategory && !(await ownsCategory(user.id, rawCategory)))
    return fail("Pick a valid category.");

  await db
    .update(transactions)
    .set({
      date,
      amountMinor,
      categoryId: rawCategory || null,
      merchant: String(formData.get("merchant") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  refresh();
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Budget lines — the "Planned" column                                         */
/* -------------------------------------------------------------------------- */

export async function setPlannedAmount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const month = String(formData.get("month") ?? "");
  const plannedMinor = parseAmount(formData.get("planned"));

  if (!isValidMonth(month)) return fail("Bad month.");
  if (plannedMinor === null) return fail("Enter a valid amount.");
  if (!(await ownsCategory(user.id, categoryId)))
    return fail("Category not found.");

  await db
    .insert(budgetLines)
    .values({ userId: user.id, month, categoryId, plannedMinor })
    .onConflictDoUpdate({
      target: [budgetLines.month, budgetLines.categoryId],
      set: { plannedMinor },
    });

  refresh();
  return { ok: true };
}

/** Copies last month's plan into this one — how the sheet gets started. */
export async function copyPlanFromPreviousMonth(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const month = String(formData.get("month") ?? "");
  if (!isValidMonth(month)) return fail("Bad month.");

  const [y, m] = month.split("-").map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const prevLines = await db
    .select()
    .from(budgetLines)
    .where(
      and(eq(budgetLines.userId, user.id), eq(budgetLines.month, prev)),
    );

  if (!prevLines.length) return fail("Nothing planned last month to copy.");

  await db
    .insert(budgetLines)
    .values(
      prevLines.map((l) => ({
        userId: user.id,
        month,
        categoryId: l.categoryId,
        plannedMinor: Number(l.plannedMinor),
      })),
    )
    .onConflictDoUpdate({
      target: [budgetLines.month, budgetLines.categoryId],
      set: { plannedMinor: sql`excluded.planned_minor` },
    });

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Target split                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `scope=default` writes the month=NULL row that prefills every future month.
 * `scope=month` overrides just this one.
 */
export async function setTargets(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const scope = String(formData.get("scope") ?? "default");
  const month = String(formData.get("month") ?? "");

  if (scope === "month" && !isValidMonth(month)) return fail("Bad month.");
  const targetMonth = scope === "month" ? month : DEFAULT_MONTH;

  const values = SPEND_GROUPS.map((g) => ({
    groupKey: g,
    percent: Number(formData.get(g) ?? 0),
  }));

  if (values.some((v) => !Number.isFinite(v.percent) || v.percent < 0 || v.percent > 100))
    return fail("Each share must be between 0 and 100.");

  const total = values.reduce((s, v) => s + v.percent, 0);
  if (total !== 100) return fail(`Shares must add up to 100% — that's ${total}%.`);

  for (const v of values) {
    await db
      .insert(groupTargets)
      .values({
        userId: user.id,
        month: targetMonth,
        groupKey: v.groupKey,
        percent: v.percent,
      })
      .onConflictDoUpdate({
        target: [groupTargets.userId, groupTargets.month, groupTargets.groupKey],
        set: { percent: v.percent },
      });
  }

  refresh();
  return { ok: true };
}

/** Drops this month's override so it inherits the default again. */
export async function clearMonthTargets(formData: FormData) {
  const user = await requireUser();
  const month = String(formData.get("month") ?? "");
  if (!isValidMonth(month)) return;

  await db
    .delete(groupTargets)
    .where(and(eq(groupTargets.userId, user.id), eq(groupTargets.month, month)));

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

export async function createCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const groupKey = String(formData.get("groupKey") ?? "") as GroupKey;
  const rawParent = String(formData.get("parentId") ?? "");

  if (!name) return fail("Give the category a name.");
  if (!GROUP_KEYS.includes(groupKey)) return fail("Pick a group.");

  let parentId: string | null = rawParent || null;
  if (parentId) {
    const [parent] = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, parentId), eq(categories.userId, user.id)))
      .limit(1);
    if (!parent) return fail("Parent category not found.");
    // Two levels max — a child can't itself become a parent.
    if (parent.parentId) return fail("Subcategories can't be nested further.");
  }

  const [{ value: lastOrder }] = await db
    .select({ value: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.userId, user.id));

  await db.insert(categories).values({
    userId: user.id,
    name,
    groupKey,
    parentId,
    budgetsSeparately: formData.get("budgetsSeparately") === "on",
    icon: String(formData.get("icon") ?? "") || null,
    sortOrder: (lastOrder ?? 0) + 1,
  });

  refresh();
  return { ok: true };
}

export async function updateCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const groupKey = String(formData.get("groupKey") ?? "") as GroupKey;

  if (!name) return fail("Give the category a name.");
  if (!GROUP_KEYS.includes(groupKey)) return fail("Pick a group.");
  if (!(await ownsCategory(user.id, id))) return fail("Category not found.");

  await db
    .update(categories)
    .set({
      name,
      groupKey,
      icon: String(formData.get("icon") ?? "") || null,
      budgetsSeparately: formData.get("budgetsSeparately") === "on",
    })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  refresh();
  return { ok: true };
}

/**
 * Archive rather than delete: transactions keep pointing at it, so history
 * doesn't silently change when you retire a category.
 */
export async function setCategoryArchived(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!(await ownsCategory(user.id, id))) return;

  await db
    .update(categories)
    .set({ archived })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Category ordering                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Swap a category with its neighbour inside the same group.
 *
 * Swapping two rows rather than renumbering the whole list keeps this to one
 * pair of writes and can't drift, even if sortOrder values aren't contiguous.
 */
export async function moveCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const dir = String(formData.get("direction") ?? "");
  if (dir !== "up" && dir !== "down") return fail("Bad direction.");

  const [me] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);
  if (!me) return fail("Category not found.");

  // Only reorder among siblings: same group, same parent, same archived state.
  const siblings = await db
    .select({ id: categories.id, sortOrder: categories.sortOrder })
    .from(categories)
    .where(
      and(
        eq(categories.userId, user.id),
        eq(categories.groupKey, me.groupKey),
        eq(categories.archived, me.archived),
        me.parentId
          ? eq(categories.parentId, me.parentId)
          : isNull(categories.parentId),
      ),
    )
    .orderBy(categories.sortOrder, categories.id);

  const i = siblings.findIndex((s) => s.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= siblings.length) return { ok: true }; // already at the end

  const a = siblings[i];
  const b = siblings[j];

  // Equal sortOrders would make a swap a no-op; nudge them apart first.
  const aOrder = a.sortOrder === b.sortOrder ? a.sortOrder + (dir === "up" ? 1 : -1) : a.sortOrder;

  await db
    .update(categories)
    .set({ sortOrder: b.sortOrder })
    .where(and(eq(categories.id, a.id), eq(categories.userId, user.id)));
  await db
    .update(categories)
    .set({ sortOrder: aOrder })
    .where(and(eq(categories.id, b.id), eq(categories.userId, user.id)));

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Recurring rules                                                             */
/* -------------------------------------------------------------------------- */

export async function setRecurringActive(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  await db
    .update(recurringRules)
    .set({ active })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id)));

  refresh();
}

export async function deleteRecurringRule(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  // Deletes the template only — transactions it already created stay put,
  // because those actually happened.
  await db
    .delete(recurringRules)
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id)));

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

export async function createAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as (typeof ACCOUNT_KINDS)[number];

  if (!name) return fail("Give the account a name.");
  if (!ACCOUNT_KINDS.includes(kind)) return fail("Pick an account type.");

  const opening = parseAmount(formData.get("openingBalance")) ?? 0;
  const value = parseAmount(formData.get("currentValue")) ?? 0;
  const subtype = String(formData.get("subtype") ?? "") || null;

  const [{ value: lastOrder }] = await db
    .select({ value: max(accounts.sortOrder) })
    .from(accounts)
    .where(eq(accounts.userId, user.id));

  await db.insert(accounts).values({
    userId: user.id,
    name,
    kind,
    subtype: kind === "spending" ? subtype : null,
    openingBalanceMinor: kind === "spending" ? opening : 0,
    openingBalanceDate: kind === "spending" ? new Date().toISOString().slice(0, 10) : null,
    currentValueMinor: kind === "asset" ? value : 0,
    valueUpdatedAt: kind === "asset" ? new Date().toISOString().slice(0, 10) : null,
    isLiability: subtype === "credit_card",
    icon: String(formData.get("icon") ?? "") || null,
    sortOrder: (lastOrder ?? 0) + 1,
  });

  refresh();
  return { ok: true };
}

export async function updateAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return fail("Give the account a name.");
  if (!(await ownsAccount(user.id, id))) return fail("Account not found.");

  const opening = parseAmount(formData.get("openingBalance"));
  const includeInNetWorth = formData.get("includeInNetWorth") === "on";

  await db
    .update(accounts)
    .set({
      name,
      includeInNetWorth,
      icon: String(formData.get("icon") ?? "") || null,
      ...(opening !== null ? { openingBalanceMinor: opening } : {}),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  refresh();
  return { ok: true };
}

/** For asset accounts — the whole point is you punch the number in yourself. */
export async function updateAssetValue(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const value = parseAmount(formData.get("currentValue"));

  if (value === null) return fail("Enter a valid amount.");
  if (!(await ownsAccount(user.id, id))) return fail("Account not found.");

  await db
    .update(accounts)
    .set({
      currentValueMinor: value,
      valueUpdatedAt: new Date().toISOString().slice(0, 10),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  refresh();
  return { ok: true };
}

export async function setAccountArchived(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!(await ownsAccount(user.id, id))) return;

  await db
    .update(accounts)
    .set({ archived })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  refresh();
}
