import { sql, relations } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

/**
 * Money is stored in MINOR UNITS (paise) as integers — never floats.
 * ₹64,867 is 6486700. Format at the edges with lib/money.ts.
 *
 * Dates are ISO strings: transactions use "YYYY-MM-DD", budget periods
 * use "YYYY-MM". SQLite has no date type and ISO strings sort correctly.
 */

export const GROUP_KEYS = ["needs", "wants", "investments", "income"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const ACCOUNT_KINDS = ["spending", "loan", "asset"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const DIRECTIONS = ["outflow", "inflow", "transfer"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/* -------------------------------------------------------------------------- */
/* Accounts                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Three kinds, one net-worth sum, three ways of getting a balance:
 *
 *   spending — bank / cash / wallet / credit card.
 *              balance = openingBalance + transaction effects
 *   loan     — one per person you lend to or borrow from ("Rahul").
 *              balance = transaction effects. Positive: they owe you.
 *   asset    — SIP, PF, Emergency Fund. No transaction history at all;
 *              balance = currentValue, which you punch in when you check
 *              the fund. Deliberately no returns/cost-basis tracking.
 */
export const accounts = sqliteTable(
  "accounts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    kind: text("kind", { enum: ACCOUNT_KINDS }).notNull(),

    /** Only meaningful for kind='spending': bank | cash | wallet | credit_card */
    subtype: text("subtype"),

    /** kind='spending' only. Anchor for the running balance. */
    openingBalanceMinor: integer("opening_balance_minor").notNull().default(0),
    openingBalanceDate: text("opening_balance_date"),

    /** kind='asset' only. Manually maintained current worth. */
    currentValueMinor: integer("current_value_minor").notNull().default(0),
    valueUpdatedAt: text("value_updated_at"),

    currency: text("currency").notNull().default("INR"),

    /** A credit card's balance is a liability: spending makes it more negative. */
    isLiability: integer("is_liability", { mode: "boolean" })
      .notNull()
      .default(false),

    includeInNetWorth: integer("include_in_net_worth", { mode: "boolean" })
      .notNull()
      .default(true),

    icon: text("icon"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [index("accounts_kind_idx").on(t.kind)],
);

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Flat by default — group -> category — because that is how the real budget
 * sheet works across all 36 lines. `parentId` allows ONE optional level below
 * that (Subscriptions -> Netflix, Spotify) for the few categories that want
 * the resolution. Two levels maximum; enforced in lib/categories.ts, not by
 * the schema, since SQLite can't express depth constraints.
 */
export const categories = sqliteTable(
  "categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    groupKey: text("group_key", { enum: GROUP_KEYS }).notNull(),

    // Self-reference needs the explicit return type, or TS can't close the loop.
    parentId: integer("parent_id").references((): AnySQLiteColumn => categories.id, {
      onDelete: "cascade",
    }),

    /**
     * Children only. When true the child carries its own planned amount;
     * when false it just rolls up into the parent's. Tracking a subcategory
     * shouldn't force you to budget it separately.
     */
    budgetsSeparately: integer("budgets_separately", { mode: "boolean" })
      .notNull()
      .default(false),

    /** Phosphor icon name, e.g. "House", "ForkKnife". */
    icon: text("icon"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [
    index("categories_group_idx").on(t.groupKey),
    index("categories_parent_idx").on(t.parentId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Group targets (the 50/30/20 dial)                                           */
/* -------------------------------------------------------------------------- */

/**
 * `month` NULL  = the default split, used to prefill every new month.
 *                 Ships as 50/30/20; Pranjal's is 50/15/35.
 * `month` set   = an override for that month only, so a heavy-expense month
 *                 can dial investments down without touching the default.
 */
export const groupTargets = sqliteTable(
  "group_targets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    month: text("month"),
    groupKey: text("group_key", { enum: GROUP_KEYS }).notNull(),
    /** Whole percent of income. Needs+Wants+Investments should total 100. */
    percent: integer("percent").notNull(),
  },
  (t) => [uniqueIndex("group_targets_month_group_idx").on(t.month, t.groupKey)],
);

/* -------------------------------------------------------------------------- */
/* Budget lines (the "Planned" column)                                         */
/* -------------------------------------------------------------------------- */

/**
 * Separate table from transactions on purpose: one planned row per category
 * per month, versus many actual transactions per category. Different
 * cardinalities, so keeping them apart avoids a flag column and a pile of
 * "WHERE is_planned" filters on every query.
 */
export const budgetLines = sqliteTable(
  "budget_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** "YYYY-MM" */
    month: text("month").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    plannedMinor: integer("planned_minor").notNull().default(0),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("budget_lines_month_category_idx").on(t.month, t.categoryId),
    index("budget_lines_month_idx").on(t.month),
  ],
);

/* -------------------------------------------------------------------------- */
/* Transactions (the "Actual" column)                                          */
/* -------------------------------------------------------------------------- */

/**
 * `amountMinor` is ALWAYS positive; `direction` carries the sign.
 *
 * Effect on balances:
 *   outflow   accountId −amount,  counterAccount (if loan) +amount
 *   inflow    accountId +amount,  counterAccount (if loan) −amount
 *   transfer  accountId −amount,  counterAccount           +amount
 *
 * categoryId is NULL only for spending↔spending transfers (moving your own
 * money between your own accounts is invisible to the budget). Lending to a
 * loan account still carries a category, so it counts against Wants the way
 * the sheet already does, while also moving that person's balance.
 */
export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** "YYYY-MM-DD" */
    date: text("date").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    direction: text("direction", { enum: DIRECTIONS }).notNull(),

    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    counterAccountId: integer("counter_account_id").references(
      () => accounts.id,
      { onDelete: "restrict" },
    ),

    categoryId: integer("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    /** Raw payee string; also the key merchant rules match on. */
    merchant: text("merchant"),
    note: text("note"),

    /** Where this came from: manual | import | rule. Useful once entry is automated. */
    source: text("source").notNull().default("manual"),
    /** Dedupe key for statement imports, so re-importing is safe. */
    externalId: text("external_id"),

    createdAt: text("created_at")
      .notNull()
      .default(sql`(CURRENT_TIMESTAMP)`),
  },
  (t) => [
    index("transactions_date_idx").on(t.date),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_counter_idx").on(t.counterAccountId),
    index("transactions_category_idx").on(t.categoryId),
    uniqueIndex("transactions_external_id_idx").on(t.externalId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Merchant rules (groundwork for automated entry)                             */
/* -------------------------------------------------------------------------- */

/** "anything whose merchant contains BLINKIT -> Groceries". */
export const merchantRules = sqliteTable("merchant_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  accountId: integer("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
});

/* -------------------------------------------------------------------------- */
/* Relations                                                                   */
/* -------------------------------------------------------------------------- */

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactions: many(transactions, { relationName: "account" }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "parentChild",
  }),
  children: many(categories, { relationName: "parentChild" }),
  transactions: many(transactions),
  budgetLines: many(budgetLines),
}));

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  category: one(categories, {
    fields: [budgetLines.categoryId],
    references: [categories.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
    relationName: "account",
  }),
  counterAccount: one(accounts, {
    fields: [transactions.counterAccountId],
    references: [accounts.id],
    relationName: "counterAccount",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type BudgetLine = typeof budgetLines.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type GroupTarget = typeof groupTargets.$inferSelect;
