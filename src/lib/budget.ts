import "server-only";

import { and, eq, gte, lte, sql, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgetLines,
  categories,
  groupTargets,
  transactions,
  type GroupKey,
} from "@/db/schema";

/** What a brand-new install starts with, before anyone tunes it. */
export const DEFAULT_TARGETS: Record<Exclude<GroupKey, "income">, number> = {
  needs: 50,
  wants: 30,
  investments: 20,
};

export const GROUP_META: Record<
  GroupKey,
  { label: string; blurb: string; slug: string }
> = {
  needs: {
    label: "Needs",
    blurb: "Rent, food, transport — the non-negotiables.",
    slug: "needs",
  },
  wants: {
    label: "Wants",
    blurb: "Eating out, clothes, subscriptions.",
    slug: "wants",
  },
  investments: {
    label: "Investments",
    blurb: "SIP, PF, emergency fund — money you keep.",
    slug: "investments",
  },
  income: {
    label: "Income",
    blurb: "Salary, freelance, everything coming in.",
    slug: "income",
  },
};

export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export type CategoryRow = {
  id: number;
  name: string;
  groupKey: GroupKey;
  icon: string | null;
  parentId: number | null;
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
  /** Planned share of planned income — the sheet's "Planned %" column. */
  plannedPercent: number;
  actualPercent: number;
  categories: CategoryRow[];
};

/**
 * One month's plan vs. actuals, assembled into the same shape the sheet has:
 * four groups, each with its categories, each with planned / actual / diff.
 */
export async function getMonthSummary(month: string) {
  // Actuals per category for this month. Transfers between spending accounts
  // carry no category, so they fall out of this join naturally.
  const actualsRows = await db
    .select({
      categoryId: transactions.categoryId,
      total: sql<number>`sum(${transactions.amountMinor})`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        gte(transactions.date, `${month}-01`),
        lte(transactions.date, `${month}-31`),
        sql`${transactions.categoryId} is not null`,
      ),
    )
    .groupBy(transactions.categoryId);

  const actuals = new Map(actualsRows.map((r) => [r.categoryId, r.total ?? 0]));

  const cats = await db
    .select({
      id: categories.id,
      name: categories.name,
      groupKey: categories.groupKey,
      icon: categories.icon,
      parentId: categories.parentId,
      budgetsSeparately: categories.budgetsSeparately,
      sortOrder: categories.sortOrder,
      plannedMinor: budgetLines.plannedMinor,
    })
    .from(categories)
    .leftJoin(
      budgetLines,
      and(eq(budgetLines.categoryId, categories.id), eq(budgetLines.month, month)),
    )
    .where(eq(categories.archived, false))
    .orderBy(categories.sortOrder);

  // Build the one-level tree. Children roll their actuals up into the parent
  // always; they roll planned up only when they don't budget separately.
  const byId = new Map<number, CategoryRow>();
  for (const c of cats) {
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      groupKey: c.groupKey,
      icon: c.icon,
      parentId: c.parentId,
      budgetsSeparately: c.budgetsSeparately,
      plannedMinor: c.plannedMinor ?? 0,
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
    if (!parent.children.length) continue;
    for (const child of parent.children) {
      parent.actualMinor += child.actualMinor;
      if (!child.budgetsSeparately) parent.plannedMinor += child.plannedMinor;
    }
  }

  const targets = await getTargets(month);

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

  // Percentages are shares of income, which is how the sheet's Goals block reads.
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
export async function getTargets(month: string) {
  const rows = await db
    .select()
    .from(groupTargets)
    .where(or(eq(groupTargets.month, month), isNull(groupTargets.month)));

  const result: Partial<Record<GroupKey, number>> = { ...DEFAULT_TARGETS };
  for (const r of rows.filter((r) => r.month === null)) {
    result[r.groupKey] = r.percent;
  }
  // Month-specific rows win over the default.
  for (const r of rows.filter((r) => r.month === month)) {
    result[r.groupKey] = r.percent;
  }
  return result as Record<GroupKey, number>;
}

/** True when this month has its own override rather than inheriting the default. */
export async function hasMonthOverride(month: string): Promise<boolean> {
  const rows = await db
    .select({ id: groupTargets.id })
    .from(groupTargets)
    .where(eq(groupTargets.month, month))
    .limit(1);
  return rows.length > 0;
}

/* -------------------------------------------------------------------------- */
/* Balances & net worth                                                        */
/* -------------------------------------------------------------------------- */

export type AccountBalance = {
  id: number;
  name: string;
  kind: "spending" | "loan" | "asset";
  subtype: string | null;
  icon: string | null;
  isLiability: boolean;
  includeInNetWorth: boolean;
  balanceMinor: number;
  valueUpdatedAt: string | null;
};

/**
 * A balance per account, computed three different ways depending on kind —
 * see the note on the accounts table.
 */
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const accs = await db
    .select()
    .from(accounts)
    .where(eq(accounts.archived, false))
    .orderBy(accounts.sortOrder);

  const txs = await db
    .select({
      accountId: transactions.accountId,
      counterAccountId: transactions.counterAccountId,
      direction: transactions.direction,
      amountMinor: transactions.amountMinor,
    })
    .from(transactions);

  return accs.map((a) => {
    let balance = 0;

    if (a.kind === "asset") {
      // No history — just what you last said it's worth.
      balance = a.currentValueMinor;
    } else {
      if (a.kind === "spending") balance = a.openingBalanceMinor;

      for (const t of txs) {
        if (t.accountId === a.id) {
          balance += t.direction === "inflow" ? t.amountMinor : -t.amountMinor;
        }
        if (t.counterAccountId === a.id) {
          // Mirror side: a transfer lands here, and lending raises what
          // this person owes you.
          balance += t.direction === "inflow" ? -t.amountMinor : t.amountMinor;
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
      balanceMinor: balance,
      valueUpdatedAt: a.valueUpdatedAt,
    };
  });
}

/**
 * Deliberately simple: what you hold, plus what you're owed, minus what you
 * owe. No returns, no gains, no cost basis.
 */
export async function getNetWorth() {
  const balances = await getAccountBalances();
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
