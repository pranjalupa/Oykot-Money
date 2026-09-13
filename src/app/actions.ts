"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql, max, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgetLines,
  categories,
  groupTargets,
  transactions,
  recurringRules,
  people,
  profiles,
  subscriptions,
  netWorthSnapshots,
  merchantRules,
  GROUP_KEYS,
  ACCOUNT_KINDS,
  PERSON_KINDS,
  DEFAULT_MONTH,
  type GroupKey,
  type PersonKind,
} from "@/db/schema";
import { requireUser, getUserPrefs } from "@/lib/auth";
import { requireWriter } from "@/lib/access";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayIn } from "@/lib/dates";
import { toMinor } from "@/lib/money";
import { isCurrency } from "@/lib/currency";
import { isRegion, isTimeZone } from "@/lib/region";
import { isValidDate, isValidMonth, SPEND_GROUPS } from "@/lib/targets";
import { listPeople, listTransactions, type TransactionRow } from "@/lib/budget";
import { personEntries } from "@/lib/loan-ledger";
import { LOCKED_CATEGORY_NOTE } from "@/lib/loan-categories";

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

/** The four categories behind You gave / You got (lib/loan-categories.ts). */
async function isLockedCategory(userId: string, id: string) {
  const [row] = await db
    .select({ systemKey: categories.systemKey })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);
  return !!row?.systemKey;
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
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return toMinor(n);
}

/** "Today" for the signed-in user, in their timezone. */
async function userToday() {
  return todayIn((await getUserPrefs()).timeZone);
}

function refresh() {
  revalidatePath("/", "layout");
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

type TransactionInput = {
  date: string;
  amountMinor: number;
  direction: "outflow" | "inflow" | "transfer";
  accountId: string;
  counterAccountId: string | null;
  categoryId: string | null;
  merchant: string | null;
  note: string | null;
};

/**
 * Validation shared by add and edit, so an edit can never save something add
 * would have refused — the account, type and category rules are the same.
 */
async function readTransaction(
  userId: string,
  formData: FormData,
): Promise<(TransactionInput & { withPerson: boolean }) | { error: string }> {
  const date = String(formData.get("date") ?? "");
  const direction = String(formData.get("direction") ?? "outflow");
  const accountId = String(formData.get("accountId") ?? "");
  const rawCategory = String(formData.get("categoryId") ?? "");
  const rawCounter = String(formData.get("counterAccountId") ?? "");
  const amountMinor = parseAmount(formData.get("amount"));

  if (!isValidDate(date)) return { error: "Pick a valid date." };
  if (amountMinor === null || amountMinor === 0)
    return { error: "Enter an amount greater than zero." };
  if (direction !== "outflow" && direction !== "inflow" && direction !== "transfer")
    return { error: "Unknown transaction type." };
  if (!accountId || !(await ownsAccount(userId, accountId)))
    return { error: "Pick an account." };

  // A far end exists for a settlement ('transfer') and for money borrowed from
  // a person ('inflow'). Spending never has one; a stale value is dropped.
  const counterAccountId = direction === "outflow" ? null : rawCounter || null;
  if (counterAccountId && !(await ownsAccount(userId, counterAccountId)))
    return { error: "Pick a valid person or account." };
  if (counterAccountId === accountId)
    return { error: "Pick two different accounts." };

  let categoryId = rawCategory || null;
  let withPerson = false;
  if (categoryId && !(await ownsCategory(userId, categoryId)))
    return { error: "Pick a valid category." };
  if (categoryId && !counterAccountId && (await isLockedCategory(userId, categoryId)))
    return { error: "That category is filled in by You gave / You got on a person." };

  if (counterAccountId) {
    const kinds = await db
      .select({ id: accounts.id, kind: accounts.kind })
      .from(accounts)
      .where(inArray(accounts.id, [accountId, counterAccountId]));
    const kindOf = (id: string) => kinds.find((k) => k.id === id)?.kind;
    const from = kindOf(accountId);
    const to = kindOf(counterAccountId);

    if (from !== "spending") return { error: "Pick one of your own accounts." };
    if (to === "loan") {
      // You gave / You got: the category is decided from the person's balance
      // when it's written (personEntries), never taken from the form.
      withPerson = true;
      categoryId = null;
    } else if (direction === "inflow") {
      return { error: "Money can only come in from a person." };
    } else if (to === "spending") {
      categoryId = null; // your own accounts — invisible to the budget, by design
    } else if (to === "asset" && !categoryId) {
      return { error: "This transfer still needs a category." };
    }
  } else if (direction === "transfer") {
    return { error: "Pick who or where the money went." };
  } else if (!categoryId) {
    return { error: "Pick a category." };
  }

  return {
    date,
    amountMinor,
    direction,
    accountId,
    counterAccountId,
    categoryId,
    merchant: String(formData.get("merchant") ?? "").trim() || null,
    note: String(formData.get("note") ?? "").trim() || null,
    withPerson,
  };
}

export async function createTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const parsed = await readTransaction(user.id, formData);
  if ("error" in parsed) return fail(parsed.error);
  const { withPerson, ...tx } = parsed;

  // Money with a person takes its locked category from the balance before it,
  // and splits in two if it crosses zero (lib/loan-ledger.ts).
  const rows = withPerson ? await personEntries(user.id, tx) : [{ userId: user.id, ...tx }];
  await db.insert(transactions).values(rows);

  // "Repeat monthly" saves a template alongside the transaction. It's marked
  // as already run for this month, so today's entry isn't duplicated.
  if (formData.get("recurring") === "on") {
    await db.insert(recurringRules).values({
      userId: user.id,
      amountMinor: tx.amountMinor,
      direction: tx.direction,
      accountId: tx.accountId,
      counterAccountId: tx.counterAccountId,
      categoryId: rows[0].categoryId,
      merchant: tx.merchant,
      note: tx.note,
      dayOfMonth: Number(tx.date.slice(8, 10)) || 1,
      lastRunMonth: tx.date.slice(0, 7),
    });
  }

  refresh();
  return { ok: true };
}

/**
 * Edit anything, including the account and the type. That used to mean
 * deleting and re-adding; both balances now move in one step instead.
 */
export async function updateTransaction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("Missing transaction.");

  const [existing] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!existing) return fail("Transaction not found.");

  const parsed = await readTransaction(user.id, formData);
  if ("error" in parsed) return fail(parsed.error);
  const { withPerson, ...tx } = parsed;

  if (withPerson) {
    // Re-decided against the balance without this entry; a crossing splits it.
    const [first, ...rest] = await personEntries(user.id, tx, id);
    await db.transaction(async (t) => {
      await t
        .update(transactions)
        .set(first)
        .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
      if (rest.length) await t.insert(transactions).values(rest);
    });
  } else {
    await db
      .update(transactions)
      .set(tx)
      .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));
  }

  refresh();
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const user = await requireWriter();
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
  const user = await requireWriter();
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
  const user = await requireWriter();
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
  const user = await requireWriter();
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
  const user = await requireWriter();
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
  const user = await requireWriter();
  const name = String(formData.get("name") ?? "").trim();
  const groupKey = String(formData.get("groupKey") ?? "") as GroupKey;
  const rawParent = String(formData.get("parentId") ?? "");

  if (!name) return fail("Give the category a name.");
  if (!GROUP_KEYS.includes(groupKey)) return fail("Pick a group.");

  const parentId: string | null = rawParent || null;
  if (parentId) {
    const [parent] = await db
      .select({ id: categories.id, parentId: categories.parentId })
      .from(categories)
      .where(and(eq(categories.id, parentId), eq(categories.userId, user.id)))
      .limit(1);
    if (!parent) return fail("Parent category not found.");
    // Two levels max — a child can't itself become a parent.
    if (parent.parentId) return fail("Subcategories can't be nested further.");
    if (await isLockedCategory(user.id, parentId)) return fail("Locked categories can't have sub-categories.");
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

/**
 * Add a top-level category without leaving the transaction form. Returns it so
 * the form can select it straight away.
 */
export async function quickAddCategory(
  name: string,
  groupKey: GroupKey,
): Promise<
  | { ok: true; category: { id: string; name: string; groupKey: GroupKey; parentId: null } }
  | { ok: false; error: string }
> {
  const user = await requireWriter();
  const clean = String(name ?? "").trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Give the category a name." };
  if (!GROUP_KEYS.includes(groupKey)) return { ok: false, error: "Pick a group." };

  const [{ value: lastOrder }] = await db
    .select({ value: max(categories.sortOrder) })
    .from(categories)
    .where(eq(categories.userId, user.id));

  const [row] = await db
    .insert(categories)
    .values({ userId: user.id, name: clean, groupKey, parentId: null, sortOrder: (lastOrder ?? 0) + 1 })
    .returning({ id: categories.id });

  refresh();
  return { ok: true, category: { id: row.id, name: clean, groupKey, parentId: null } };
}

export async function updateCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const groupKey = String(formData.get("groupKey") ?? "") as GroupKey;

  if (!name) return fail("Give the category a name.");
  if (!GROUP_KEYS.includes(groupKey)) return fail("Pick a group.");
  if (!(await ownsCategory(user.id, id))) return fail("Category not found.");
  if (await isLockedCategory(user.id, id)) return fail(`This category is ${LOCKED_CATEGORY_NOTE.charAt(0).toLowerCase()}${LOCKED_CATEGORY_NOTE.slice(1)}`);

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
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!(await ownsCategory(user.id, id))) return;
  if (await isLockedCategory(user.id, id)) return;

  await db
    .update(categories)
    .set({ archived })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  refresh();
}

/**
 * Turn "assume this is spent" on or off for a fixed cost.
 *
 * Needs-only, and the group is re-read from the database rather than trusted
 * from the form — the client decides which toggles to *draw*, never which are
 * allowed. Nothing is written to `transactions`, so switching this off puts the
 * real ledger straight back with no cleanup.
 */
export async function setCategoryAssumeSpent(
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const assumeSpent = formData.get("assumeSpent") === "true";

  const [row] = await db
    .select({
      groupKey: categories.groupKey,
      parentId: categories.parentId,
      budgetsSeparately: categories.budgetsSeparately,
    })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
    .limit(1);

  if (!row) return fail("Category not found.");
  if (assumeSpent && row.groupKey !== "needs") {
    return fail("Only Needs categories can be assumed spent.");
  }
  // No plan of its own to assume — it would spend against a budget of zero.
  if (assumeSpent && row.parentId && !row.budgetsSeparately) {
    return fail("This category rolls up into its parent, so it has no plan of its own.");
  }

  await db
    .update(categories)
    .set({ assumeSpent })
    .where(and(eq(categories.id, id), eq(categories.userId, user.id)));

  refresh();
  return { ok: true };
}

export async function setRecurringActive(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";

  await db
    .update(recurringRules)
    .set({ active })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id)));

  refresh();
}

export async function deleteRecurringRule(formData: FormData) {
  const user = await requireWriter();
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
  const user = await requireWriter();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "") as (typeof ACCOUNT_KINDS)[number];

  if (!name) return fail("Give the account a name.");
  if (!ACCOUNT_KINDS.includes(kind)) return fail("Pick an account type.");
  // People own their loan ledgers — createPerson makes both together. A loan
  // account made here would belong to nobody: invisible on Money and People,
  // yet still counted in net worth and offered in the transfer picker.
  if (kind === "loan") return fail("Add people from Settlements on the Money page.");

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
    openingBalanceDate: kind === "spending" ? await userToday() : null,
    currentValueMinor: kind === "asset" ? value : 0,
    valueUpdatedAt: kind === "asset" ? await userToday() : null,
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
  const user = await requireWriter();
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
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const value = parseAmount(formData.get("currentValue"));

  if (value === null) return fail("Enter a valid amount.");
  if (!(await ownsAccount(user.id, id))) return fail("Account not found.");

  await db
    .update(accounts)
    .set({
      currentValueMinor: value,
      valueUpdatedAt: await userToday(),
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  refresh();
  return { ok: true };
}

export async function setAccountArchived(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!(await ownsAccount(user.id, id))) return;

  await db
    .update(accounts)
    .set({ archived })
    .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));

  refresh();
}

/* -------------------------------------------------------------------------- */
/* People                                                                      */
/* -------------------------------------------------------------------------- */

async function ownsPerson(userId: string, id: string) {
  const [row] = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .limit(1);
  return !!row;
}

/**
 * Add someone you lend to or borrow from.
 *
 * Their loan ledger is created in the same transaction — a person without one
 * can't hold a balance, and making it lazily would mean every read path has to
 * cope with a person who is half-created.
 */
export async function createPerson(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const name = String(formData.get("name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "person");
  const icon = String(formData.get("icon") ?? "").trim();

  if (!name) return fail("Give them a name.");
  const kind = (PERSON_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as PersonKind)
    : "person";

  await addPersonWithLedger(user.id, { name, handle: handle || null, kind, icon: icon || null });

  refresh();
  return { ok: true };
}

/** A person and the loan ledger that carries their balance, in one step. Returns the ledger's id. */
async function addPersonWithLedger(
  userId: string,
  p: { name: string; handle: string | null; kind: PersonKind; icon: string | null },
) {
  return db.transaction(async (tx) => {
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${people.sortOrder}), 0) + 1` })
      .from(people)
      .where(eq(people.userId, userId));

    const [person] = await tx
      .insert(people)
      .values({ userId, name: p.name, handle: p.handle, kind: p.kind, icon: p.icon, sortOrder: next })
      .returning({ id: people.id });

    const [ledger] = await tx
      .insert(accounts)
      .values({ userId, name: p.name, kind: "loan", personId: person.id, icon: p.icon, sortOrder: next })
      .returning({ id: accounts.id });
    return ledger.id;
  });
}

/**
 * Add someone without leaving the transaction form. Returns their ledger so
 * the form can select it straight away.
 */
export async function quickAddPerson(
  name: string,
): Promise<{ ok: true; account: { id: string; name: string; kind: "loan" } } | { ok: false; error: string }> {
  const user = await requireWriter();
  const clean = String(name ?? "").trim().slice(0, 80);
  if (!clean) return { ok: false, error: "Give them a name." };

  const id = await addPersonWithLedger(user.id, { name: clean, handle: null, kind: "person", icon: null });
  refresh();
  return { ok: true, account: { id, name: clean, kind: "loan" } };
}

/**
 * Everything that moved a person's balance, newest first: money you gave
 * (a transfer to their ledger), money you got (an inflow from it), and a
 * forgiven debt (spending recorded on the ledger itself).
 */
export async function personHistory(personId: string): Promise<TransactionRow[]> {
  const user = await requireUser();
  const person = (await listPeople(user.id)).find((p) => p.id === personId);
  if (!person?.accountId) return [];

  const [withThem, onLedger] = await Promise.all([
    listTransactions(user.id, { counterAccountId: person.accountId, limit: 100 }),
    listTransactions(user.id, { accountId: person.accountId, limit: 100 }),
  ]);
  return [...withThem, ...onLedger].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
}

export async function updatePerson(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const handle = String(formData.get("handle") ?? "").trim();
  const kindRaw = String(formData.get("kind") ?? "person");
  const icon = String(formData.get("icon") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!name) return fail("Give them a name.");
  if (!(await ownsPerson(user.id, id))) return fail("Person not found.");

  const kind = (PERSON_KINDS as readonly string[]).includes(kindRaw)
    ? (kindRaw as PersonKind)
    : "person";

  await db.transaction(async (tx) => {
    await tx
      .update(people)
      .set({ name, handle: handle || null, kind, icon: icon || null, note: note || null })
      .where(and(eq(people.id, id), eq(people.userId, user.id)));

    // The ledger's name is shown wherever a transaction is listed, so it has to
    // follow the person or the two views disagree.
    await tx
      .update(accounts)
      .set({ name, icon: icon || null })
      .where(and(eq(accounts.personId, id), eq(accounts.userId, user.id)));
  });

  refresh();
  return { ok: true };
}

/**
 * Delete a person and their (empty) ledger.
 *
 * The balance check here is a courtesy so the message is human. The real
 * guarantee is in the schema: `transactions.account_id` is ON DELETE RESTRICT,
 * so Postgres refuses to drop a ledger with history no matter what this says.
 */
export async function deletePerson(formData: FormData): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  if (!(await ownsPerson(user.id, id))) return fail("Person not found.");

  try {
    await db.delete(people).where(and(eq(people.id, id), eq(people.userId, user.id)));
  } catch {
    return fail(
      "They have transactions, so deleting would rewrite your history. Archive them instead.",
    );
  }

  refresh();
  return { ok: true };
}

export async function setPersonArchived(formData: FormData) {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "true";
  if (!(await ownsPerson(user.id, id))) return;

  await db.transaction(async (tx) => {
    await tx
      .update(people)
      .set({ archived })
      .where(and(eq(people.id, id), eq(people.userId, user.id)));
    await tx
      .update(accounts)
      .set({ archived })
      .where(and(eq(accounts.personId, id), eq(accounts.userId, user.id)));
  });

  refresh();
}

/* -------------------------------------------------------------------------- */
/* Deletes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Count what a category delete would touch, so the confirm can say it out loud
 * rather than making you find out afterwards.
 */
export async function categoryImpact(id: string) {
  const user = await requireUser();
  if (!(await ownsCategory(user.id, id))) return null;

  const [tx] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, user.id), eq(transactions.categoryId, id)));
  const [kids] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(categories)
    .where(and(eq(categories.userId, user.id), eq(categories.parentId, id)));

  // recurring_rules.category_id is ON DELETE CASCADE — count them so the
  // confirm can say so, instead of repeats quietly vanishing.
  const [reps] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(recurringRules)
    .where(and(eq(recurringRules.userId, user.id), eq(recurringRules.categoryId, id)));

  return {
    transactions: tx?.n ?? 0,
    children: kids?.n ?? 0,
    repeats: reps?.n ?? 0,
  };
}

/**
 * Delete a category.
 *
 * `transactions.category_id` is ON DELETE SET NULL, so the money survives and
 * only the label goes — the spend stays in your totals as uncategorised. Child
 * categories cascade, which is why the confirm counts them first. Archiving
 * remains the better move in almost every case; this is for the ones added by
 * mistake.
 */
export async function deleteCategory(formData: FormData): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  if (!(await ownsCategory(user.id, id))) return fail("Category not found.");
  if (await isLockedCategory(user.id, id)) return fail(`This category is ${LOCKED_CATEGORY_NOTE.charAt(0).toLowerCase()}${LOCKED_CATEGORY_NOTE.slice(1)}`);

  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, user.id)));
  refresh();
  return { ok: true };
}

export async function accountImpact(id: string) {
  const user = await requireUser();
  if (!(await ownsAccount(user.id, id))) return null;

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        sql`(${transactions.accountId} = ${id} or ${transactions.counterAccountId} = ${id})`,
      ),
    );
  return { transactions: row?.n ?? 0 };
}

/**
 * Delete an account. Only possible while it has no transactions — the schema
 * enforces that with ON DELETE RESTRICT, and this turns the resulting error
 * into a sentence worth reading.
 */
export async function deleteAccount(formData: FormData): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  if (!(await ownsAccount(user.id, id))) return fail("Account not found.");

  try {
    await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
  } catch {
    return fail(
      "This account has transactions. Deleting it would rewrite your history — archive it instead.",
    );
  }

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Drag reordering                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Persist a whole ordering at once, which is what a drag produces — you can't
 * express "moved from 7th to 2nd" as a swap.
 *
 * Every id is checked against the caller before anything is written, and the
 * writes go in one transaction, so a crafted list can't renumber another
 * account's rows and a failure can't leave the order half-applied.
 */
export async function reorderCategories(formData: FormData): Promise<ActionResult> {
  const user = await requireWriter();
  const ids = parseIds(formData.get("ids"));
  if (!ids) return fail("Bad ordering.");
  if (!ids.length) return { ok: true };

  const owned = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, user.id), inArray(categories.id, ids)));
  if (owned.length !== ids.length) return fail("Some of those aren't yours.");

  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx
        .update(categories)
        .set({ sortOrder: i })
        .where(and(eq(categories.id, id), eq(categories.userId, user.id)));
    }
  });

  refresh();
  return { ok: true };
}

export async function reorderPeople(formData: FormData): Promise<ActionResult> {
  const user = await requireWriter();
  const ids = parseIds(formData.get("ids"));
  if (!ids) return fail("Bad ordering.");
  if (!ids.length) return { ok: true };

  const owned = await db
    .select({ id: people.id })
    .from(people)
    .where(and(eq(people.userId, user.id), inArray(people.id, ids)));
  if (owned.length !== ids.length) return fail("Some of those aren't yours.");

  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx
        .update(people)
        .set({ sortOrder: i })
        .where(and(eq(people.id, id), eq(people.userId, user.id)));
    }
  });

  refresh();
  return { ok: true };
}

export async function reorderAccounts(formData: FormData): Promise<ActionResult> {
  const user = await requireWriter();
  const ids = parseIds(formData.get("ids"));
  if (!ids) return fail("Bad ordering.");
  if (!ids.length) return { ok: true };

  const owned = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), inArray(accounts.id, ids)));
  if (owned.length !== ids.length) return fail("Some of those aren't yours.");

  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx
        .update(accounts)
        .set({ sortOrder: i })
        .where(and(eq(accounts.id, id), eq(accounts.userId, user.id)));
    }
  });

  refresh();
  return { ok: true };
}

/** Reject anything that isn't a flat list of unique uuid-shaped strings. */
function parseIds(raw: FormDataEntryValue | null): string[] | null {
  if (typeof raw !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (parsed.length > 500) return null;
  if (!parsed.every((v) => typeof v === "string" && UUID.test(v))) return null;
  const ids = parsed as string[];
  return new Set(ids).size === ids.length ? ids : null;
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* -------------------------------------------------------------------------- */
/* Profile                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Name and currency. Changing currency relabels every amount rather than
 * converting it — the settings form says so before you save.
 */
export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const currency = String(formData.get("currency") ?? "");
  const region = String(formData.get("region") ?? "");

  if (!name) return fail("Enter your name.");
  if (!isCurrency(currency)) return fail("Pick a currency from the list.");
  if (!isRegion(region)) return fail("Pick a region from the list.");

  await db
    .insert(profiles)
    .values({ userId: user.id, displayName: name, currency, region })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { displayName: name, currency, region, updatedAt: new Date() },
    });

  refresh();
  return { ok: true };
}

/** Stores the zone the browser reports. Ignores anything Intl doesn't recognise. */
export async function saveTimezone(formData: FormData) {
  const user = await requireUser();
  const timezone = String(formData.get("timezone") ?? "");
  if (!isTimeZone(timezone)) return;

  await db
    .update(profiles)
    .set({ timezone, updatedAt: new Date() })
    .where(eq(profiles.userId, user.id));

  refresh();
}

/**
 * Change a repeat's amount, day or label. Affects repeats from here on; the
 * transactions it already made are history and stay as they were.
 */
export async function updateRecurringRule(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireWriter();
  const id = String(formData.get("id") ?? "");
  const amountMinor = parseAmount(formData.get("amount"));
  const dayOfMonth = Number(formData.get("dayOfMonth"));
  const merchant = String(formData.get("merchant") ?? "").trim() || null;

  if (amountMinor === null || amountMinor === 0)
    return fail("Enter an amount greater than zero.");
  if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31)
    return fail("Pick a day between 1 and 31.");

  const updated = await db
    .update(recurringRules)
    .set({ amountMinor, dayOfMonth, merchant })
    .where(and(eq(recurringRules.id, id), eq(recurringRules.userId, user.id)))
    .returning({ id: recurringRules.id });
  if (!updated.length) return fail("Repeat not found.");

  refresh();
  return { ok: true };
}

/* -------------------------------------------------------------------------- */
/* Delete my account                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Removes everything, then the login.
 *
 * The data goes first, explicitly and in dependency order inside one
 * transaction: `transactions.account_id` is ON DELETE RESTRICT, so leaving it
 * to the auth.users cascade could trip over the order Postgres picks. Allowed
 * even when access has run out — leaving is never paywalled.
 */
export async function deleteMyAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE")
    return fail('Type DELETE to confirm.');

  await db.transaction(async (tx) => {
    await tx.delete(transactions).where(eq(transactions.userId, user.id));
    await tx.delete(recurringRules).where(eq(recurringRules.userId, user.id));
    await tx.delete(merchantRules).where(eq(merchantRules.userId, user.id));
    await tx.delete(budgetLines).where(eq(budgetLines.userId, user.id));
    await tx.delete(netWorthSnapshots).where(eq(netWorthSnapshots.userId, user.id));
    await tx.delete(groupTargets).where(eq(groupTargets.userId, user.id));
    await tx.delete(accounts).where(eq(accounts.userId, user.id));
    await tx.delete(people).where(eq(people.userId, user.id));
    await tx.delete(categories).where(eq(categories.userId, user.id));
    await tx.delete(profiles).where(eq(profiles.userId, user.id));
    await tx.delete(subscriptions).where(eq(subscriptions.userId, user.id));
  });

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error)
    return fail("Your data is deleted, but the login couldn't be removed. Email us and we'll finish it.");

  await (await createClient()).auth.signOut();
  redirect("/");
}
