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
  people,
  netWorthSnapshots,
  DEFAULT_MONTH,
  type GroupKey,
  type PersonKind,
} from "@/db/schema";
import { DEFAULT_TARGETS, monthBounds, shiftMonth } from "@/lib/targets";
import { currentMonthIn, dayOfMonthIn } from "@/lib/dates";

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
  /**
   * How much of `actualMinor` is assumed rather than transacted (see
   * `categories.assumeSpent`). Non-zero means "nobody logged this, we took the
   * budgeted figure" — the UI marks those so an assumption never passes for a
   * real receipt.
   */
  assumedMinor: number;
  assumeSpent: boolean;
  children: CategoryRow[];
};

export type GroupSummary = {
  groupKey: GroupKey;
  plannedMinor: number;
  actualMinor: number;
  /** Part of `actualMinor` that came from assumptions, not transactions. */
  assumedMinor: number;
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
      assumeSpent: categories.assumeSpent,
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
    const plannedMinor = Number(c.plannedMinor ?? 0);
    const transacted = actuals.get(c.id) ?? 0;
    // The assumption is a fallback, never a top-up: one real transaction this
    // month and the ledger speaks for itself. Applied against the category's
    // OWN budget line, before children roll up, so a parent can't assume an
    // amount that includes its children's plans.
    const assumedMinor =
      c.assumeSpent && transacted === 0 && plannedMinor > 0 ? plannedMinor : 0;

    byId.set(c.id, {
      id: c.id,
      name: c.name,
      groupKey: c.groupKey,
      icon: c.icon,
      parentId: c.parentId,
      budgetsSeparately: c.budgetsSeparately,
      assumeSpent: c.assumeSpent,
      plannedMinor,
      actualMinor: transacted + assumedMinor,
      assumedMinor,
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
      parent.assumedMinor += child.assumedMinor;
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
      assumedMinor: inGroup.reduce((s, r) => s + r.assumedMinor, 0),
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
export async function getDailyView(
  userId: string,
  month: string,
  timeZone?: string,
) {
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
  const isCurrentMonth = month === currentMonthIn(timeZone);
  const daysLeft = isCurrentMonth
    ? Math.max(lastDay - dayOfMonthIn(timeZone) + 1, 1)
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

/**
 * Total assumed-spent Needs per month for a year — the budgeted amount of every
 * `assumeSpent` category that saw no transaction that month.
 *
 * Two queries rather than a join: the budget lines, then the (month, category)
 * pairs that actually have transactions, subtracted in memory. A left join with
 * a date-truncated ON clause reads worse and buys nothing at twelve months.
 */
async function assumedNeedsByMonth(
  userId: string,
  year: number,
  months: string[],
) {
  const lines = await db
    .select({
      month: budgetLines.month,
      categoryId: budgetLines.categoryId,
      plannedMinor: budgetLines.plannedMinor,
    })
    .from(budgetLines)
    .innerJoin(categories, eq(categories.id, budgetLines.categoryId))
    .where(
      and(
        eq(budgetLines.userId, userId),
        eq(categories.assumeSpent, true),
        eq(categories.archived, false),
        eq(categories.groupKey, "needs"),
        inArray(budgetLines.month, months),
      ),
    );

  if (!lines.length) return new Map<string, number>();

  const transacted = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`.as("month"),
      categoryId: transactions.categoryId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, `${year}-01-01`),
        lte(transactions.date, `${year}-12-31`),
        inArray(
          transactions.categoryId,
          lines.map((l) => l.categoryId),
        ),
      ),
    )
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`, transactions.categoryId);

  const hasReal = new Set(transacted.map((t) => `${t.month}:${t.categoryId}`));

  const out = new Map<string, number>();
  for (const line of lines) {
    if (hasReal.has(`${line.month}:${line.categoryId}`)) continue;
    const planned = Number(line.plannedMinor ?? 0);
    if (planned <= 0) continue;
    out.set(line.month, (out.get(line.month) ?? 0) + planned);
  }
  return out;
}

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

  // Assumed fixed costs, month by month, so the year agrees with what the month
  // view shows. Same rule as `getMonthSummary`: a real transaction in that month
  // wins, and the assumption only fills the silence.
  const assumedByMonth = await assumedNeedsByMonth(userId, year, months);

  const byMonth = months.map((month) => {
    const pick = (g: GroupKey) =>
      Number(rows.find((r) => r.month === month && r.groupKey === g)?.total ?? 0);
    const needs = pick("needs") + (assumedByMonth.get(month) ?? 0);
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
  /** kind='loan' only — the person or institution this ledger belongs to. */
  personId: string | null;
  personKind: PersonKind | null;
  personHandle: string | null;
};

/**
 * A balance per account, computed three ways depending on kind.
 *
 * Summed in Postgres rather than by pulling every transaction into the app and
 * looping — that payload grows without bound and crosses the network. The two
 * subqueries are the two sides a transaction can touch: the account it's on,
 * and the counter-account it mirrors onto.
 */
export async function getAccountBalances(
  userId: string,
): Promise<AccountBalance[]> {
  const ownEffect = sql<string>`coalesce((
    select sum(case when t.direction = 'inflow' then t.amount_minor else -t.amount_minor end)
    from ${transactions} t where t.account_id = ${accounts.id}
  ), 0)`;

  // Mirror side: a transfer lands here, and lending raises what this person
  // owes you — so the sign is the opposite of the originating account's.
  const counterEffect = sql<string>`coalesce((
    select sum(case when t.direction = 'inflow' then -t.amount_minor else t.amount_minor end)
    from ${transactions} t where t.counter_account_id = ${accounts.id}
  ), 0)`;

  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      kind: accounts.kind,
      subtype: accounts.subtype,
      icon: accounts.icon,
      isLiability: accounts.isLiability,
      includeInNetWorth: accounts.includeInNetWorth,
      openingBalanceMinor: accounts.openingBalanceMinor,
      currentValueMinor: accounts.currentValueMinor,
      valueUpdatedAt: accounts.valueUpdatedAt,
      archived: accounts.archived,
      personId: accounts.personId,
      personKind: people.kind,
      personHandle: people.handle,
      ownEffect: ownEffect.as("own_effect"),
      counterEffect: counterEffect.as("counter_effect"),
    })
    .from(accounts)
    .leftJoin(people, eq(people.id, accounts.personId))
    .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))
    .orderBy(accounts.sortOrder);

  return rows.map((a) => {
    const opening = Number(a.openingBalanceMinor);
    const current = Number(a.currentValueMinor);
    const effects = Number(a.ownEffect) + Number(a.counterEffect);

    const balanceMinor =
      a.kind === "asset"
        ? current // no history — just what you last said it's worth
        : (a.kind === "spending" ? opening : 0) + effects;

    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      subtype: a.subtype,
      icon: a.icon,
      isLiability: a.isLiability,
      includeInNetWorth: a.includeInNetWorth,
      openingBalanceMinor: opening,
      currentValueMinor: current,
      balanceMinor,
      valueUpdatedAt: a.valueUpdatedAt,
      archived: a.archived,
      personId: a.personId,
      personKind: a.personKind,
      personHandle: a.personHandle,
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

/* -------------------------------------------------------------------------- */
/* People                                                                      */
/* -------------------------------------------------------------------------- */

export type PersonRow = {
  id: string;
  name: string;
  handle: string | null;
  kind: PersonKind;
  icon: string | null;
  note: string | null;
  archived: boolean;
  /** The loan ledger that carries their balance, if one exists yet. */
  accountId: string | null;
  balanceMinor: number;
  /** True once they have history, which is what makes deleting them refuse. */
  hasHistory: boolean;
};

/**
 * Everyone you lend to or borrow from, with the balance from their ledger.
 *
 * `hasHistory` is read here rather than discovered at delete time so the UI can
 * say *why* a person can't be removed before you click, instead of surfacing a
 * foreign-key error afterwards.
 */
export async function listPeople(userId: string): Promise<PersonRow[]> {
  const rows = await db
    .select({
      id: people.id,
      name: people.name,
      handle: people.handle,
      kind: people.kind,
      icon: people.icon,
      note: people.note,
      archived: people.archived,
      sortOrder: people.sortOrder,
      accountId: accounts.id,
    })
    .from(people)
    .leftJoin(accounts, eq(accounts.personId, people.id))
    .where(eq(people.userId, userId))
    .orderBy(people.sortOrder);

  const balances = await getAccountBalances(userId);
  const byAccount = new Map(balances.map((b) => [b.id, b.balanceMinor]));

  const accountIds = rows.map((r) => r.accountId).filter((x): x is string => !!x);
  const used = accountIds.length
    ? await db
        .selectDistinct({ accountId: transactions.counterAccountId })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            inArray(transactions.counterAccountId, accountIds),
          ),
        )
    : [];
  const withHistory = new Set(used.map((u) => u.accountId));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    kind: r.kind,
    icon: r.icon,
    note: r.note,
    archived: r.archived,
    accountId: r.accountId,
    balanceMinor: r.accountId ? (byAccount.get(r.accountId) ?? 0) : 0,
    hasHistory: !!r.accountId && withHistory.has(r.accountId),
  }));
}

/* -------------------------------------------------------------------------- */
/* Trends                                                                      */
/* -------------------------------------------------------------------------- */

export type TrendPoint = {
  month: string;
  budgetedMinor: number;
  spentMinor: number;
  /** Spent came from assume-spent, not transactions. */
  assumed: boolean;
};

/**
 * Budgeted against spent for one category over the last `count` months,
 * ending at `endMonth`. Follows the same rules as the month view: children's
 * spending rolls up, only children that don't budget separately roll their
 * budget up, and assume-spent fills a month with no transactions.
 *
 * Two grouped queries rather than `getMonthSummary` six times over.
 */
export async function getCategoryTrend(
  userId: string,
  categoryId: string,
  endMonth: string,
  count = 6,
): Promise<TrendPoint[]> {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));

  const [self] = await db
    .select({ assumeSpent: categories.assumeSpent })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)))
    .limit(1);
  if (!self) return [];

  const kids = await db
    .select({ id: categories.id, budgetsSeparately: categories.budgetsSeparately })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.parentId, categoryId)));
  const spendIds = [categoryId, ...kids.map((k) => k.id)];
  const budgetIds = [categoryId, ...kids.filter((k) => !k.budgetsSeparately).map((k) => k.id)];

  const spent = await db
    .select({
      month: sql<string>`to_char(${transactions.date}, 'YYYY-MM')`.as("month"),
      total: sql<string>`sum(${transactions.amountMinor})`.as("total"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.categoryId, spendIds),
        gte(transactions.date, `${months[0]}-01`),
        lte(transactions.date, monthBounds(endMonth).end),
      ),
    )
    .groupBy(sql`to_char(${transactions.date}, 'YYYY-MM')`);

  const budgeted = await db
    .select({
      month: budgetLines.month,
      total: sql<string>`sum(${budgetLines.plannedMinor})`.as("total"),
    })
    .from(budgetLines)
    .where(
      and(
        eq(budgetLines.userId, userId),
        inArray(budgetLines.categoryId, budgetIds),
        inArray(budgetLines.month, months),
      ),
    )
    .groupBy(budgetLines.month);

  const spentBy = new Map(spent.map((r) => [r.month, Number(r.total ?? 0)]));
  const budgetBy = new Map(budgeted.map((r) => [r.month, Number(r.total ?? 0)]));

  return months.map((month) => {
    const budgetedMinor = budgetBy.get(month) ?? 0;
    const transacted = spentBy.get(month) ?? 0;
    const assumed = self.assumeSpent && transacted === 0 && budgetedMinor > 0;
    return {
      month,
      budgetedMinor,
      spentMinor: assumed ? budgetedMinor : transacted,
      assumed,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* Net worth history                                                           */
/* -------------------------------------------------------------------------- */

type NetWorth = Awaited<ReturnType<typeof getNetWorth>>;

/** Overwrite this month's snapshot with the latest figures. */
export async function saveNetWorthSnapshot(userId: string, month: string, net: NetWorth) {
  const values = {
    totalMinor: net.total,
    cashMinor: net.cash,
    assetsMinor: net.assets,
    owedToYouMinor: net.owedToYou,
    youOweMinor: net.youOwe,
    updatedAt: new Date(),
  };
  await db
    .insert(netWorthSnapshots)
    .values({ userId, month, ...values })
    .onConflictDoUpdate({
      target: [netWorthSnapshots.userId, netWorthSnapshots.month],
      set: values,
    });
}

/** Compute and record. For callers that don't already have the figures. */
export async function recordNetWorth(userId: string, month: string) {
  await saveNetWorthSnapshot(userId, month, await getNetWorth(userId));
}

export async function getNetWorthHistory(userId: string, count = 12) {
  const rows = await db
    .select()
    .from(netWorthSnapshots)
    .where(eq(netWorthSnapshots.userId, userId))
    .orderBy(desc(netWorthSnapshots.month))
    .limit(count);
  return rows.reverse().map((r) => ({
    month: r.month,
    totalMinor: Number(r.totalMinor),
    cashMinor: Number(r.cashMinor),
    assetsMinor: Number(r.assetsMinor),
    owedToYouMinor: Number(r.owedToYouMinor),
    youOweMinor: Number(r.youOweMinor),
  }));
}

/**
 * Budgeted against spent for a whole group, month by month — the group page's
 * trend. Uses the month summary for each month so roll-ups and assume-spent
 * behave exactly as they do everywhere else; six months is six light queries.
 */
export async function getGroupTrend(
  userId: string,
  groupKey: GroupKey,
  endMonth: string,
  count = 6,
): Promise<{ month: string; budgetedMinor: number; spentMinor: number }[]> {
  const months = Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));
  const summaries = await Promise.all(months.map((m) => getMonthSummary(userId, m)));
  return summaries.map((s, i) => ({
    month: months[i],
    budgetedMinor: s.groups[groupKey].plannedMinor,
    spentMinor: s.groups[groupKey].actualMinor,
  }));
}

/**
 * Where a category's money went this month, by merchant. Sub-categories are
 * included, so "Subscriptions" shows Netflix and Spotify together. Entries
 * with no merchant are grouped as one line rather than dropped — dropping them
 * would make the shares add up to less than the category.
 */
export async function getMerchantBreakdown(
  userId: string,
  categoryId: string,
  month: string,
  top = 6,
): Promise<{ label: string; totalMinor: number; count: number }[]> {
  const { start, end } = monthBounds(month);
  const kids = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.parentId, categoryId)));
  const ids = [categoryId, ...kids.map((k) => k.id)];

  const rows = await db
    .select({
      label: sql<string>`coalesce(nullif(trim(${transactions.merchant}), ''), '')`.as("label"),
      total: sql<string>`sum(${transactions.amountMinor})`.as("total"),
      count: sql<number>`count(*)::int`.as("count"),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.categoryId, ids),
        gte(transactions.date, start),
        lte(transactions.date, end),
      ),
    )
    .groupBy(sql`coalesce(nullif(trim(${transactions.merchant}), ''), '')`)
    .orderBy(desc(sql`sum(${transactions.amountMinor})`));

  const items = rows.map((r) => ({
    label: r.label || "No merchant noted",
    totalMinor: Number(r.total ?? 0),
    count: r.count,
  }));
  if (items.length <= top) return items;
  const rest = items.slice(top - 1);
  return [
    ...items.slice(0, top - 1),
    {
      label: `${rest.length} others`,
      totalMinor: rest.reduce((s, r) => s + r.totalMinor, 0),
      count: rest.reduce((s, r) => s + r.count, 0),
    },
  ];
}
