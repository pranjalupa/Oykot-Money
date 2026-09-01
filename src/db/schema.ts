import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgSchema,
  text,
  integer,
  bigint,
  boolean,
  uuid,
  timestamp,
  date,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

/**
 * Money is stored in MINOR UNITS (paise) as bigints — never floats.
 * ₹64,867 is 6486700. Format at the edges with lib/money.ts.
 * bigint rather than integer so a net worth past ₹2.1 crore doesn't overflow.
 *
 * Every user-owned row carries `userId`. Two layers guard isolation:
 *   1. Application code — lib/auth.ts resolves the session user and every
 *      query in lib/budget.ts filters by it. This is the real enforcement,
 *      because Drizzle connects with a role that owns the tables.
 *   2. RLS policies in drizzle/rls.sql — defence in depth, and what protects
 *      the data if anything ever queries through PostgREST.
 */

/** Supabase's auth.users, declared so we can point foreign keys at it. */
const authSchema = pgSchema("auth");
export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const GROUP_KEYS = ["needs", "wants", "investments", "income"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

export const ACCOUNT_KINDS = ["spending", "loan", "asset"] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const DIRECTIONS = ["outflow", "inflow", "transfer"] as const;
export type Direction = (typeof DIRECTIONS)[number];

const money = (name: string) => bigint(name, { mode: "number" });

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
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    kind: text("kind", { enum: ACCOUNT_KINDS }).notNull(),

    /** Only meaningful for kind='spending': bank | cash | wallet | credit_card */
    subtype: text("subtype"),

    /** kind='spending' only. Anchor for the running balance. */
    openingBalanceMinor: money("opening_balance_minor").notNull().default(0),
    openingBalanceDate: date("opening_balance_date"),

    /** kind='asset' only. Manually maintained current worth. */
    currentValueMinor: money("current_value_minor").notNull().default(0),
    valueUpdatedAt: date("value_updated_at"),

    currency: text("currency").notNull().default("INR"),

    /** A credit card's balance is a liability: spending makes it more negative. */
    isLiability: boolean("is_liability").notNull().default(false),
    includeInNetWorth: boolean("include_in_net_worth").notNull().default(true),

    icon: text("icon"),
    archived: boolean("archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("accounts_user_idx").on(t.userId),
    index("accounts_user_kind_idx").on(t.userId, t.kind),
  ],
);

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Flat by default — group -> category — because that is how the real budget
 * sheet works across all 36 lines. `parentId` allows ONE optional level below
 * that (Subscriptions -> Netflix, Spotify) for the few categories that want
 * the resolution. Two levels maximum; enforced in lib/categories.ts, not by
 * the schema, since Postgres can't express depth constraints declaratively.
 */
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    name: text("name").notNull(),
    groupKey: text("group_key", { enum: GROUP_KEYS }).notNull(),

    // Self-reference needs the explicit return type, or TS can't close the loop.
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "cascade",
    }),

    /**
     * Children only. When true the child carries its own planned amount;
     * when false it just rolls up into the parent's. Tracking a subcategory
     * shouldn't force you to budget it separately.
     */
    budgetsSeparately: boolean("budgets_separately").notNull().default(false),

    /** Phosphor icon name, e.g. "House", "ForkKnife". */
    icon: text("icon"),
    archived: boolean("archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("categories_user_idx").on(t.userId),
    index("categories_user_group_idx").on(t.userId, t.groupKey),
    index("categories_parent_idx").on(t.parentId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Group targets (the 50/30/20 dial)                                           */
/* -------------------------------------------------------------------------- */

/** The `month` value meaning "the default that prefills every month". */
export const DEFAULT_MONTH = "default";

/**
 * `month` = 'default' — the split used to prefill every new month.
 *                       Ships as 50/30/20; Pranjal's is 50/15/35.
 * `month` = 'YYYY-MM' — an override for that month only, so a heavy-expense
 *                       month can dial investments down without touching the
 *                       default.
 *
 * A sentinel rather than NULL so the unique index and ON CONFLICT actually
 * bite — in Postgres NULLs are distinct, so a nullable month would happily
 * accumulate duplicate "default" rows on every save.
 */
export const groupTargets = pgTable(
  "group_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    month: text("month").notNull().default(DEFAULT_MONTH),
    groupKey: text("group_key", { enum: GROUP_KEYS }).notNull(),
    /** Whole percent of income. Needs+Wants+Investments should total 100. */
    percent: integer("percent").notNull(),
  },
  (t) => [
    uniqueIndex("group_targets_user_month_group_idx").on(
      t.userId,
      t.month,
      t.groupKey,
    ),
  ],
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
export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    /** "YYYY-MM" */
    month: text("month").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    plannedMinor: money("planned_minor").notNull().default(0),
    note: text("note"),
  },
  (t) => [
    uniqueIndex("budget_lines_month_category_idx").on(t.month, t.categoryId),
    index("budget_lines_user_month_idx").on(t.userId, t.month),
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
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    /** "YYYY-MM-DD" */
    date: date("date").notNull(),
    amountMinor: money("amount_minor").notNull(),
    direction: text("direction", { enum: DIRECTIONS }).notNull(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    counterAccountId: uuid("counter_account_id").references(() => accounts.id, {
      onDelete: "restrict",
    }),

    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    /** Raw payee string; also the key merchant rules match on. */
    merchant: text("merchant"),
    note: text("note"),

    /** Where this came from: manual | import | rule. */
    source: text("source").notNull().default("manual"),
    /** Dedupe key for statement imports, so re-importing is safe. */
    externalId: text("external_id"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_account_idx").on(t.accountId),
    index("transactions_counter_idx").on(t.counterAccountId),
    index("transactions_category_idx").on(t.categoryId),
    uniqueIndex("transactions_user_external_id_idx").on(t.userId, t.externalId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Merchant rules (groundwork for automated entry)                             */
/* -------------------------------------------------------------------------- */

/** "anything whose merchant contains BLINKIT -> Groceries". */
export const merchantRules = pgTable(
  "merchant_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    pattern: text("pattern").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("merchant_rules_user_idx").on(t.userId)],
);

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

export { sql };
