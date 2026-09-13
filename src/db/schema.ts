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

export const PERSON_KINDS = ["person", "institution"] as const;
export type PersonKind = (typeof PERSON_KINDS)[number];

const money = (name: string) => bigint(name, { mode: "number" });

/* -------------------------------------------------------------------------- */
/* People                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Anyone on the other side of a loan — a friend you lent to, or a bank you
 * borrowed from. Split out of `accounts` because "account" was doing three
 * jobs at once (your bank account, Rahul, your login) and the word had stopped
 * meaning anything.
 *
 * A person is an identity, not a balance. The balance lives on the `loan`
 * account that points here, so all the existing balance arithmetic keeps
 * working untouched. Direction is just the sign: positive means they owe you.
 */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    /** Optional handle — "@rahul", a phone number — to tell two Rahuls apart. */
    handle: text("handle"),

    /** person: a human. institution: a bank or NBFC you borrowed from. */
    kind: text("kind", { enum: PERSON_KINDS }).notNull().default("person"),

    icon: text("icon"),
    note: text("note"),
    archived: boolean("archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("people_user_idx").on(t.userId)],
);

/* -------------------------------------------------------------------------- */
/* Profiles                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One row per user: what to call them, and what their money is counted in.
 *
 * Kept here rather than in Supabase's user_metadata because the app reads it
 * on every render and every other bit of user state lives in Postgres. Created
 * lazily on first load (`getProfile` in lib/auth.ts), seeded from whatever the
 * signup form or Google put in user_metadata.
 */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  /** A key of CURRENCIES in lib/currency.ts. Validated in app code. */
  currency: text("currency").notNull().default("INR"),
  /** A key of REGIONS in lib/region.ts — decides date format. */
  region: text("region").notNull().default("IN"),
  /** IANA zone reported by the browser. Null until first seen; see lib/dates.ts. */
  timezone: text("timezone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Subscriptions                                                               */
/* -------------------------------------------------------------------------- */

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
  "complimentary",
] as const;

/**
 * One row per user: where they stand with paying.
 *
 * Provider-neutral on purpose. Razorpay (India) and a Merchant of Record
 * (everyone else) will both write here through their webhooks, and the rest
 * of the app only ever asks `getAccess()` in lib/access.ts — never which
 * provider someone pays through.
 */
export const subscriptions = pgTable("subscriptions", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  status: text("status", { enum: SUBSCRIPTION_STATUSES }).notNull().default("trialing"),
  /** monthly | yearly. Null while trialing. */
  plan: text("plan"),
  /** razorpay | mor. Null until payments exist. */
  provider: text("provider"),
  providerCustomerId: text("provider_customer_id"),
  providerSubscriptionId: text("provider_subscription_id"),
  currency: text("currency"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }).notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/* Net worth snapshots                                                         */
/* -------------------------------------------------------------------------- */

/**
 * One row per user per month: net worth as last seen that month.
 *
 * Needed because net worth can't be rebuilt after the fact — assets have no
 * history, only the value you last typed. So the app records it as it goes:
 * the current month's row is overwritten whenever you look, and a past month
 * keeps the last value it had. History starts the day this shipped.
 */
export const netWorthSnapshots = pgTable(
  "net_worth_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    totalMinor: money("total_minor").notNull(),
    cashMinor: money("cash_minor").notNull(),
    assetsMinor: money("assets_minor").notNull(),
    owedToYouMinor: money("owed_to_you_minor").notNull(),
    youOweMinor: money("you_owe_minor").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("net_worth_snapshots_user_month_idx").on(t.userId, t.month)],
);

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

    /**
     * kind='loan' only — whose ledger this is.
     *
     * Cascade is deliberate and does the right thing on its own: deleting a
     * person tries to take their ledger with it, but `transactions.accountId`
     * is ON DELETE RESTRICT, so Postgres refuses the whole thing the moment
     * there is any history. A person you've actually transacted with cannot be
     * deleted; one added by mistake disappears cleanly.
     */
    personId: uuid("person_id").references(() => people.id, {
      onDelete: "cascade",
    }),

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

    /**
     * "Assume this is spent." For fixed costs — rent, EMI, a fixed SIP — where
     * the amount is known and logging it every month is busywork. When true the
     * budgeted amount counts as spent on its own, with no transaction.
     *
     * A real transaction REPLACES the assumption for that month rather than
     * adding to it, so rent budgeted at 15,000 that actually goes out at 15,400
     * reads 15,400 — never 30,400. Applied in `getMonthSummary` /
     * `getYearSummary`; nothing is written to `transactions`, so turning the
     * flag off restores the true ledger with no cleanup.
     *
     * Needs-group only — enforced in `app/actions.ts`, not by the schema.
     */
    assumeSpent: boolean("assume_spent").notNull().default(false),

    /** Phosphor icon name, e.g. "House", "ForkKnife". */
    icon: text("icon"),
    archived: boolean("archived").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    /**
     * Set on the four categories behind You gave / You got — lent, repaid_in,
     * borrowed, repaid_out (lib/loan-categories.ts). They're found by this key,
     * never by name, and locked in app/actions.ts. Null for everything else.
     */
    systemKey: text("system_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("categories_user_idx").on(t.userId),
    index("categories_user_group_idx").on(t.userId, t.groupKey),
    index("categories_parent_idx").on(t.parentId),
    uniqueIndex("categories_user_system_key_idx")
      .on(t.userId, t.systemKey)
      .where(sql`${t.systemKey} is not null`),
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
/* Recurring transactions                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A template that drops one transaction into each month — rent, SIP, salary.
 *
 * Materialised lazily when you open a month (see lib/month-setup.ts) rather
 * than by a cron: this app has no scheduler, and a lazy pass is idempotent.
 * `lastRunMonth` is what makes it idempotent — a month is only ever filled
 * once, so opening the page twice doesn't double-charge you.
 *
 * Only ever generates for the current month. Browsing back to March shouldn't
 * invent transactions that never happened.
 */
export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),

    amountMinor: money("amount_minor").notNull(),
    direction: text("direction", { enum: DIRECTIONS }).notNull(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    counterAccountId: uuid("counter_account_id").references(() => accounts.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "cascade",
    }),

    merchant: text("merchant"),
    note: text("note"),

    /** 1–31, clamped to the month's length so the 31st still works in February. */
    dayOfMonth: integer("day_of_month").notNull().default(1),

    active: boolean("active").notNull().default(true),
    /** "YYYY-MM" of the last month this rule was materialised into. */
    lastRunMonth: text("last_run_month"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("recurring_rules_user_idx").on(t.userId)],
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

export type RecurringRule = typeof recurringRules.$inferSelect;

/* -------------------------------------------------------------------------- */
/* Annotations                                                                 */
/* -------------------------------------------------------------------------- */

export const ANNOTATION_STATUSES = ["open", "resolved"] as const;
export type AnnotationStatus = (typeof ANNOTATION_STATUSES)[number];

/**
 * Notes pinned to a spot in the UI — a feedback channel between Pranjal and
 * the coding agent, gated by lib/annotator.ts, not a product feature.
 *
 * The target is saved three ways because the page it points at keeps
 * changing: `selector` to find it again, `elementText`/`selectedText` so the
 * note still reads when the selector stops matching, and `path` for where.
 * `reply` is written from scripts/annotations.mts and shown under the note.
 */
export const annotations = pgTable(
  "annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    /** Pathname plus query string, e.g. /needs?month=2026-09. */
    path: text("path").notNull(),
    pageTitle: text("page_title"),
    selector: text("selector").notNull(),
    tagName: text("tag_name"),
    elementText: text("element_text"),
    selectedText: text("selected_text"),
    note: text("note").notNull(),
    reply: text("reply"),
    status: text("status", { enum: ANNOTATION_STATUSES }).notNull().default("open"),
    viewportWidth: integer("viewport_width"),
    theme: text("theme"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("annotations_user_status_idx").on(t.userId, t.status)],
);
