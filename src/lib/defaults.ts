import type { GroupKey, AccountKind } from "@/db/schema";

/**
 * The starter set a new account is seeded with. Nothing is budgeted — planned
 * amounts start empty and the user fills them in. Everything here is editable,
 * renameable and archivable in the app; this is a starting point, not a schema.
 */

export const DEFAULT_CATEGORIES: {
  name: string;
  groupKey: GroupKey;
  icon: string;
}[] = [
  // Needs
  { name: "House Rent", groupKey: "needs", icon: "House" },
  { name: "Electricity", groupKey: "needs", icon: "Lightning" },
  { name: "Groceries", groupKey: "needs", icon: "ShoppingCart" },
  { name: "Dairy", groupKey: "needs", icon: "Drop" },
  { name: "Gym", groupKey: "needs", icon: "Barbell" },
  { name: "Fruits & Vegetables", groupKey: "needs", icon: "Carrot" },
  { name: "Mobile Recharge / Internet", groupKey: "needs", icon: "WifiHigh" },
  { name: "Commute / Transport", groupKey: "needs", icon: "Bus" },
  { name: "Household Help / Cleaning", groupKey: "needs", icon: "Broom" },
  { name: "Health (Medicines / Doctor)", groupKey: "needs", icon: "FirstAid" },
  { name: "Supplements", groupKey: "needs", icon: "Pill" },
  { name: "Family Support", groupKey: "needs", icon: "Heart" },
  { name: "Rented Items", groupKey: "needs", icon: "Package" },
  { name: "Debt (Repayment Given)", groupKey: "needs", icon: "ArrowUUpLeft" },
  { name: "Misc-Needs", groupKey: "needs", icon: "DotsThree" },

  // Wants
  { name: "Eating Out / Snacks", groupKey: "wants", icon: "ForkKnife" },
  { name: "Clothing / Accessories", groupKey: "wants", icon: "TShirt" },
  { name: "Entertainment / OTT / Movies", groupKey: "wants", icon: "FilmSlate" },
  { name: "Shopping (Impulse)", groupKey: "wants", icon: "ShoppingBag" },
  { name: "Subscriptions", groupKey: "wants", icon: "Repeat" },
  { name: "Gifts / Dates / Others", groupKey: "wants", icon: "Gift" },
  { name: "Travel / Vacations", groupKey: "wants", icon: "AirplaneTilt" },
  { name: "Money Lended", groupKey: "wants", icon: "HandCoins" },
  { name: "Misc-Wants", groupKey: "wants", icon: "DotsThree" },

  // Investments
  { name: "PF", groupKey: "investments", icon: "Bank" },
  { name: "SIP / Mutual Funds", groupKey: "investments", icon: "ChartLineUp" },
  { name: "Emergency Fund Deposit", groupKey: "investments", icon: "Umbrella" },
  { name: "Business / Side Project", groupKey: "investments", icon: "Storefront" },
  { name: "Misc-Savings", groupKey: "investments", icon: "DotsThree" },

  // Income
  { name: "Salary", groupKey: "income", icon: "Money" },
  { name: "Freelance", groupKey: "income", icon: "Storefront" },
  { name: "Internship Stipend", groupKey: "income", icon: "GraduationCap" },
  { name: "Misc-Income", groupKey: "income", icon: "DotsThree" },
  { name: "Money Borrowed", groupKey: "income", icon: "ArrowUUpRight" },
  { name: "Debt (Repayment Received)", groupKey: "income", icon: "ArrowUUpLeft" },
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

/** Phosphor icon names offered in the category/account pickers. */
export const ICON_CHOICES = [
  "House", "Lightning", "ShoppingCart", "Drop", "Barbell", "Carrot",
  "WifiHigh", "Bus", "Broom", "FirstAid", "Pill", "Heart", "Package",
  "ArrowUUpLeft", "ArrowUUpRight", "DotsThree", "ForkKnife", "TShirt",
  "FilmSlate", "ShoppingBag", "Repeat", "Gift", "AirplaneTilt", "HandCoins",
  "Storefront", "Bank", "ChartLineUp", "Umbrella", "Coins", "Money",
  "GraduationCap", "Wallet", "Tag",
] as const;
