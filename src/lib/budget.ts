import "server-only";

import { and, eq, gte, lte, sql, or, desc, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgetLines,
  categories,
  groupTargets,
  transactions,
  recurringRules,
  DEFAULT_MONTH,
  type GroupKey,
} from "@/db/schema";
import { DEFAULT_TARGETS, monthBounds } from "@/lib/targets";

export { DEFAULT_TARGETS, GROUP_META, SPEND_GROUPS } from "@/lib/targets";
export {
  currentMonth,
  monthLabel,
  shiftMonth,
  today,
  daysInMonth,
  isValidMonth,
  isValidDate,
} from "@/lib/targets";

export type CategoryRow = {
  id: string;
  name: string;
  groupKey: GroupKey;
  icon: string | null;
  parentId: string | null;
  budgetsSeparately: boolean;
  plannedMinor: number;
  actualMinor: number;
  children: CategoryRow[];
};

export type GroupSummary = {
  groupKey: GroupKey;
  plannedMinor: number;
  actualMinor: number;
  targetPercent: number;
  plannedPercent: number;
  actualPercent: number;
  categories: CategoryRow[];
};

/**
 * One month's plan vs. actuals, in the same shape the sheet has:
 * four groups, each with its categories, each with planned / actual / diff.
 */
export async function getMonthSummary(userId: string, month: string) {
  const { start, end } = monthBounds(month);

  // Actuals per category. Transfers between spending accounts carry no
  // category, so they drop out of this grouping naturally.
  const actualsRows = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<string>`sum(${transactions.amountMinor})`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lte(transactions.date, end),
        sql`${transactions.categoryId} is not null`,
      ),
    )
    .groupBy(transactions.categoryId);

  const actuals = new Map(
    actualsRows.map((r) => [r.categoryId, Number(r.total ?? 0)]),
  );

  const cats = await db
    .select({
      id: categories.id,
      name: categories.name,
      groupKey: categories.groupKey,
      icon: categories.icon,
      parentId: categories.parentId,
      budgetsSeparately: categories.budgetsSeparately,
      plannedMinor: budgetLines.plannedMinor,
    })
    .from(categories)
    .leftJoin(
      budgetLines,
      and(
        eq(budgetLines.categoryId, categories.id),
        eq(budgetLines.month, month),
      ),
    )
    .where(and(eq(categories.userId, userId), eq(categories.archived, false)))
    .orderBy(categories.sortOrder);

  // One-level tree. Children always roll actuals up into the parent; they roll
  // planned up only when they don't budget separately.
  const byId = new Map<string, CategoryRow>();
  for (const c of cats) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      groupKey: c.groupKey,
      icon: c.icon,
      parentId: c.parentId,
      budgetsSeparately: c.budgetsSeparately,
      plannedMinor: Number(c.plannedMinor ?? 0),
      actualMinor: actuals.get(c.id) ?? 0,
      children: [],
    });
  }

  const roots: CategoryRow[] = [];
  for (const row of byId.values()) {
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.children.push(row);
    } else {
      roots.push(row);
    }
  }

  for (const parent of roots) {
    for (const child of parent.children) {
      parent.actualMinor += child.actualMinor;
      if (!child.budgetsSeparately) parent.plannedMinor += child.plannedMinor;
    }
  }

  const targets = await getTargets(userId, month);

  const groups = {} as Record<GroupKey, GroupSummary>;
  for (const key of ["needs", "wants", "investments", "income"] as GroupKey[]) {
    const inGroup = roots.filter((r) => r.groupKey === key);
    groups[key] = {
      groupKey: key,
      plannedMinor: inGroup.reduce((s, r) => s + r.plannedMinor, 0),
      actualMinor: inGroup.reduce((s, r) => s + r.actualMinor, 0),
      targetPercent: targets[key] ?? 0,
      plannedPercent: 0,
      actualPercent: 0,
      categories: inGroup,
    };
  }

  // Percentages are shares of income — how the sheet's Goals block reads.
  const plannedIncome = groups.income.plannedMinor;
  const actualIncome = groups.income.actualMinor;
  for (const key of ["needs", "wants", "investments"] as const) {
    groups[key].plannedPercent = plannedIncome
      ? Math.round((groups[key].plannedMinor / plannedIncome) * 100)
      : 0;
    groups[key].actualPercent = actualIncome
      ? Math.round((groups[key].actualMinor / actualIncome) * 100)
      : 0;
  }

  const plannedExpense =
    groups.needs.plannedMinor +
    groups.wants.plannedMinor +
    groups.investments.plannedMinor;
  const actualExpense =
    groups.needs.actualMinor +
    groups.wants.actualMinor +
    groups.investments.actualMinor;

  return {
    month,
    groups,
    plannedIncome,
    actualIncome,
    plannedExpense,
    actualExpense,
    /** What the sheet calls "Saved this month". */
    plannedSaved: plannedIncome - plannedExpense,
    actualSaved: actualIncome - actualExpense,
  };
}

/**
 * Targets for a month: the month's own override if it has one, otherwise the
 * saved default (month IS NULL), otherwise the shipped 50/30/20.
 */
export async function getTargets(userId: string, month: string) {
  const rows = await db
    .select()
    .from(groupTargets)
    .where(
      and(
        eq(groupTargets.userId, userId),
        or(
          eq(groupTargets.month, month),
          eq(groupTargets.month, DEFAULT_MONTH),
        ),
      ),
    );

  const result: Partial<Record<GroupKey, number>> = { ...DEFAULT_TARGETS };
  for (const r of rows.filter((r) => r.month === DEFAULT_MONTH)) {
    result[r.groupKey] = r.percent;
  }
  // Month-specific rows win over the default.
  for (const r of rows.filter((r) => r.month === month)) {
    result[r.groupKey] = r.percent;
  }
  return result as Record<GroupKey, number>;
}

export async function hasMonthOverride(userId: string, month: string) {
  const rows = await db
    .select({ id: groupTargets.id })
    .from(groupTargets)
    .where(and(eq(groupTargets.userId, userId), eq(groupTargets.month, month)))
    .limit(1);
  return rows.length > 0;
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

export type TransactionRow = {
  id: string;
  date: string;
  amountMinor: number;
  direction: "outflow" | "inflow" | "transfer";
  note: string | null;
  merchant: string | null;
  /** manual | recurring | import — lets the UI mark rows it created itself. */
  source: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  groupKey: GroupKey | null;
  accountId: string;
  accountName: string;
  counterAccountId: string | null;
  counterAccountName: string | null;
};

export async function listTransactions(
  userId: string,
  opts: {
    from?: string;
    to?: string;
    categoryId?: string;
    accountId?: string;
    limit?: number;
  } = {},
): Promise<TransactionRow[]> {
  const counter = db.$with("counter").as(
    db
      .select({ id: accounts.id, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
  );

  const conds = [eq(transactions.userId, userId)];
  if (opts.from) conds.push(gte(transactions.date, opts.from));
  if (opts.to) conds.push(lte(transactions.date, opts.to));
  if (opts.categoryId) conds.push(eq(transactions.categoryId, opts.categoryId));
  if (opts.accountId) conds.push(eq(transactions.accountId, opts.accountId));

  const rows = await db
    .with(counter)
    .select({
      id: transactions.id,
      date: transactions.date,
      amountMinor: transactions.amountMinor,
      direction: transactions.direction,
      note: transactions.note,
      merchant: transactions.merchant,
      source: transactions.source,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      groupKey: categories.groupKey,
      accountId: transactions.accountId,
      accountName: accounts.name,
      counterAccountId: transactions.counterAccountId,
      counterAccountName: counter.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(counter, eq(counter.id, transactions.counterAccountId))
    .where(and(...conds))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(opts.limit ?? 200);

  return rows.map((r) => ({
    ...r,
    amountMinor: Number(r.amountMinor),
  })) as TransactionRow[];
}

/* -------------------------------------------------------------------------- */
/* Daily view                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Spending per day for a month, plus a "safe to spend" figure: what's left of
 * the Needs+Wants plan divided by the days remaining. Investments are excluded
 * — that money is meant to leave.
 */
export async function getDailyView(userId: string, month: string) {
  const { start, end } = monthBounds(month);

  const perDay = await db
    .select({
      date: transactions.date,
      total: sql<string>`sum(${transactions.amountMinor})`.as("total"),
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, start),
        lte(transactions.date, end),
        inArray(categories.groupKey, ["needs", "wants"]),
      ),
    )
    .groupBy(transactions.date)
    .orderBy(desc(transactions.date));

  const summary = await getMonthSummary(userId, month);
  const dailyBudget =
    summary.groups.needs.plannedMinor + summary.groups.wants.plannedMinor;
  const dailySpent =
    summary.groups.needs.actualMinor + summary.groups.wants.actualMinor;

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === y && now.getMonth() + 1 === m;
  const daysLeft = isCurrentMonth
    ? Math.max(lastDay - now.getDate() + 1, 1)
    : lastDay;

  const remaining = dailyBudget - dailySpent;

  return {
    days: perDay.map((d) => ({ date: d.date, totalMinor: Number(d.total ?? 0) })),
    dailyBudget,
    dailySpent,
    remaining,
    daysLeft,
    safePerDay: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
    isCurrentMonth,
  };
}

/* -------------------------------------------------------------------------- */
/* Yearly view                                                                 */
/* -------------------------------------------------------------------------- */

export async function getYearSummary(userId: string, year: number) {
  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`.as("month"),
      groupKey: categories.groupKey,
      total: sql<string>`sum(${transactions.amountMinor})`.as("total"),
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, `${year}-01-01`),
        lte(transactions.date, `${year}-12-31`),
      ),
    )
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`, categories.groupKey);

  const months = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
  );

  const byMonth = months.map((month) => {
    const pick = (g: GroupKey) =>
      Number(rows.find((r) => r.month === month && r.groupKey === g)?.total ?? 0);
    const needs = pick("needs");
    const wants = pick("wants");
    const investments = pick("investments");
    const income = pick("income");
    return {
      month,
      needs,
      wants,
      investments,
      income,
      expense: needs + wants + investments,
      saved: income - (needs + wants + investments),
    };
  });

  const totals = byMonth.reduce(
    (acc, m) => ({
      needs: acc.needs + m.needs,
      wants: acc.wants + m.wants,
      investments: acc.investments + m.investments,
      income: acc.income + m.income,
      expense: acc.expense + m.expense,
      saved: acc.saved + m.saved,
    }),
    { needs: 0, wants: 0, investments: 0, income: 0, expense: 0, saved: 0 },
  );

  const activeMonths = byMonth.filter((m) => m.income || m.expense).length;

  return { year, byMonth, totals, activeMonths };
}

/* -------------------------------------------------------------------------- */
/* Balances & net worth                                                        */
/* -------------------------------------------------------------------------- */

export type AccountBalance = {
  id: string;
  name: string;
  kind: "spending" | "loan" | "asset";
  subtype: string | null;
  icon: string | null;
  isLiability: boolean;
  includeInNetWorth: boolean;
  openingBalanceMinor: number;
  currentValueMinor: number;
  balanceMinor: number;
  valueUpdatedAt: string | null;
  archived: boolean;
};

/** A balance per account, computed three ways depending on kind. */
export async function getAccountBalances(
  userId: string,
): Promise<AccountBalance[]> {
  const accs = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))
    .orderBy(accounts.sortOrder);

  const txs = await db
    .select({
      accountId: transactions.accountId,
      counterAccountId: transactions.counterAccountId,
      direction: transactions.direction,
      amountMinor: transactions.amountMinor,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  return accs.map((a) => {
    let balance = 0;

    if (a.kind === "asset") {
      // No history — just what you last said it's worth.
      balance = Number(a.currentValueMinor);
    } else {
      if (a.kind === "spending") balance = Number(a.openingBalanceMinor);

      for (const t of txs) {
        const amt = Number(t.amountMinor);
        if (t.accountId === a.id) {
          balance += t.direction === "inflow" ? amt : -amt;
        }
        if (t.counterAccountId === a.id) {
          // Mirror side: a transfer lands here, and lending raises what this
          // person owes you.
          balance += t.direction === "inflow" ? -amt : amt;
        }
      }
    }

    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      subtype: a.subtype,
      icon: a.icon,
      isLiability: a.isLiability,
      includeInNetWorth: a.includeInNetWorth,
      openingBalanceMinor: Number(a.openingBalanceMinor),
      currentValueMinor: Number(a.currentValueMinor),
      balanceMinor: balance,
      valueUpdatedAt: a.valueUpdatedAt,
      archived: a.archived,
    };
  });
}

/**
 * Deliberately simple: what you hold, plus what you're owed, minus what you
 * owe. No returns, no gains, no cost basis.
 */
export async function getNetWorth(userId: string) {
  const balances = await getAccountBalances(userId);
  const counted = balances.filter((b) => b.includeInNetWorth);

  const cash = counted
    .filter((b) => b.kind === "spending" && !b.isLiability)
    .reduce((s, b) => s + b.balanceMinor, 0);
  const assets = counted
    .filter((b) => b.kind === "asset")
    .reduce((s, b) => s + b.balanceMinor, 0);
  const owedToYou = counted
    .filter((b) => b.kind === "loan" && b.balanceMinor > 0)
    .reduce((s, b) => s + b.balanceMinor, 0);
  const youOwe = counted
    .filter(
      (b) =>
        (b.kind === "loan" && b.balanceMinor < 0) ||
        (b.isLiability && b.balanceMinor < 0),
    )
    .reduce((s, b) => s + Math.abs(b.balanceMinor), 0);

  return {
    cash,
    assets,
    owedToYou,
    youOwe,
    total: cash + assets + owedToYou - youOwe,
    balances,
  };
}

/** Recurring templates, joined for display. */
export async function listRecurring(userId: string) {
  const rows = await db
    .select({
      id: recurringRules.id,
      amountMinor: recurringRules.amountMinor,
      direction: recurringRules.direction,
      dayOfMonth: recurringRules.dayOfMonth,
      active: recurringRules.active,
      merchant: recurringRules.merchant,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      accountName: accounts.name,
    })
    .from(recurringRules)
    .innerJoin(accounts, eq(accounts.id, recurringRules.accountId))
    .leftJoin(categories, eq(categories.id, recurringRules.categoryId))
    .where(eq(recurringRules.userId, userId))
    .orderBy(recurringRules.dayOfMonth);

  return rows.map((r) => ({ ...r, amountMinor: Number(r.amountMinor) }));
}

/** Flat category list for pickers. */
export async function listCategories(userId: string) {
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(categories.sortOrder);
  return rows;
}

export async function listAccounts(userId: string) {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.sortOrder);
  return rows.map((r) => ({
    ...r,
    openingBalanceMinor: Number(r.openingBalanceMinor),
    currentValueMinor: Number(r.currentValueMinor),
  }));
}
