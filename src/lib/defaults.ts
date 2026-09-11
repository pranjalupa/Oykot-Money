import type { GroupKey, AccountKind } from "@/db/schema";

/**
 * The starter set a NEW account is seeded with.
 *
 * Deliberately small and generic — thirteen lines someone can read in one go,
 * not a copy of anyone's personal budget. A new user should recognise every
 * line and then add their own; a 36-row taxonomy inherited from a stranger is
 * something you delete, not something you use.
 *
 * Nothing is budgeted: planned amounts start empty. Everything here is
 * renameable, re-groupable and retirable in the app — a starting point, not a
 * schema.
 */
export const DEFAULT_CATEGORIES: {
  name: string;
  groupKey: GroupKey;
  icon: string;
}[] = [
  // Needs — the non-negotiables most people have
  { name: "Rent", groupKey: "needs", icon: "House" },
  { name: "Groceries", groupKey: "needs", icon: "ShoppingCart" },
  { name: "Bills & Utilities", groupKey: "needs", icon: "Lightning" },
  { name: "Transport", groupKey: "needs", icon: "Bus" },
  { name: "Health", groupKey: "needs", icon: "FirstAid" },

  // Wants
  { name: "Eating Out", groupKey: "wants", icon: "ForkKnife" },
  { name: "Shopping", groupKey: "wants", icon: "ShoppingBag" },
  { name: "Subscriptions", groupKey: "wants", icon: "Repeat" },
  { name: "Entertainment", groupKey: "wants", icon: "FilmSlate" },

  // Investments
  { name: "Savings", groupKey: "investments", icon: "Umbrella" },
  { name: "Investments", groupKey: "investments", icon: "ChartLineUp" },

  // Income
  { name: "Salary", groupKey: "income", icon: "Money" },
  { name: "Other Income", groupKey: "income", icon: "DotsThree" },
];

export const DEFAULT_ACCOUNTS: {
  name: string;
  kind: AccountKind;
  subtype?: string;
  icon: string;
}[] = [
  { name: "Bank Account", kind: "spending", subtype: "bank", icon: "Bank" },
  { name: "Cash", kind: "spending", subtype: "cash", icon: "Money" },
];
