import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { toMinor } from "../lib/money";
import type { GroupKey } from "./schema";

/**
 * Seeds the real budget from the Aug-26 sheet.
 *
 * Planned amounts are carried into the CURRENT month, which is how the sheet
 * already works — each month starts as a copy of the last one's plan, then
 * actuals fill in.
 */

const sqlite = new Database(process.env.DATABASE_URL ?? "./oykot.db");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** [name, plannedRupees, phosphorIcon] */
type Seed = [string, number, string];

const NEEDS: Seed[] = [
  ["House Rent", 10500, "House"],
  ["Electricity", 1000, "Lightning"],
  ["Groceries", 3000, "ShoppingCart"],
  ["Dairy", 1500, "Drop"],
  ["Gym", 1500, "Barbell"],
  ["Fruits & Vegetables", 1500, "Carrot"],
  ["Mobile Recharge / Internet", 400, "WifiHigh"],
  ["Commute / Transport", 5000, "Bus"],
  ["Household Help / Cleaning", 3000, "Broom"],
  ["Health (Medicines / Doctor)", 0, "FirstAid"],
  ["Supplements (Protein / Creatine)", 4000, "Pill"],
  ["To Mummy", 0, "Heart"],
  ["Rented Items", 200, "Package"],
  ["Debt (Repayment Given)", 0, "ArrowUUpLeft"],
  ["Misc-Needs", 0, "DotsThree"],
];

const WANTS: Seed[] = [
  ["Eating Out / Snacks", 2000, "ForkKnife"],
  ["Clothing / Accessories", 5000, "TShirt"],
  ["Entertainment / OTT / Movies", 2000, "FilmSlate"],
  ["Shopping (Impulse)", 0, "ShoppingBag"],
  ["Subscriptions", 2000, "Repeat"],
  ["Gifts / Dates / Others", 0, "Gift"],
  ["Travel / Vacations", 0, "AirplaneTilt"],
  ["Money Lended", 0, "HandCoins"],
  ["Misc-Wants", 0, "DotsThree"],
];

const INVESTMENTS: Seed[] = [
  ["OykotStudio", 0, "Storefront"],
  ["PF", 1800, "Bank"],
  ["SIP / Mutual Funds", 15000, "ChartLineUp"],
  ["Emergency Fund Deposit", 5000, "Umbrella"],
  ["Remaining Balance Amount", 467, "Coins"],
  ["Misc-Savings", 0, "DotsThree"],
];

const INCOME: Seed[] = [
  ["Salary", 64867, "Money"],
  ["Freelance / OykotStudio", 0, "Storefront"],
  ["Internship Stipend", 0, "GraduationCap"],
  ["Misc-Income", 0, "DotsThree"],
  ["Money Borrowed", 0, "ArrowUUpRight"],
  ["Debt (Repayment Received)", 0, "ArrowUUpLeft"],
];

const GROUPS: [GroupKey, Seed[]][] = [
  ["needs", NEEDS],
  ["wants", WANTS],
  ["investments", INVESTMENTS],
  ["income", INCOME],
];

function seed() {
  const existing = db.select().from(schema.categories).all();
  if (existing.length > 0) {
    console.log(
      `Database already has ${existing.length} categories — skipping seed.`,
    );
    console.log("To reseed from scratch: rm oykot.db && npm run db:push && npm run db:seed");
    return;
  }

  const month = currentMonth();
  console.log(`Seeding budget for ${month}…`);

  db.transaction((tx) => {
    // --- Accounts ---------------------------------------------------------
    tx.insert(schema.accounts)
      .values([
        {
          name: "Bank Account",
          kind: "spending",
          subtype: "bank",
          openingBalanceMinor: 0,
          openingBalanceDate: `${month}-01`,
          icon: "Bank",
          sortOrder: 0,
        },
        {
          name: "Cash",
          kind: "spending",
          subtype: "cash",
          openingBalanceMinor: 0,
          openingBalanceDate: `${month}-01`,
          icon: "Money",
          sortOrder: 1,
        },
        // Assets: no transaction history, you just update the value when you
        // check the fund. Mirrors the Investments categories they're fed by.
        { name: "PF", kind: "asset", icon: "Bank", sortOrder: 2 },
        { name: "SIP / Mutual Funds", kind: "asset", icon: "ChartLineUp", sortOrder: 3 },
        { name: "Emergency Fund", kind: "asset", icon: "Umbrella", sortOrder: 4 },
      ])
      .run();

    // --- Categories + planned amounts -------------------------------------
    let sortOrder = 0;
    for (const [groupKey, items] of GROUPS) {
      for (const [name, plannedRupees, icon] of items) {
        const inserted = tx
          .insert(schema.categories)
          .values({ name, groupKey, icon, sortOrder: sortOrder++ })
          .returning({ id: schema.categories.id })
          .get();

        tx.insert(schema.budgetLines)
          .values({
            month,
            categoryId: inserted.id,
            plannedMinor: toMinor(plannedRupees),
          })
          .run();
      }
    }

    // --- Target split -----------------------------------------------------
    // month=NULL is the default that prefills every new month. The app ships
    // with 50/30/20; this is Pranjal's own 50/15/35.
    tx.insert(schema.groupTargets)
      .values([
        { month: null, groupKey: "needs", percent: 50 },
        { month: null, groupKey: "wants", percent: 15 },
        { month: null, groupKey: "investments", percent: 35 },
      ])
      .run();
  });

  const counts = {
    accounts: db.select().from(schema.accounts).all().length,
    categories: db.select().from(schema.categories).all().length,
    budgetLines: db.select().from(schema.budgetLines).all().length,
  };
  console.log("Seeded:", counts);
  console.log("Target split: Needs 50% · Wants 15% · Investments 35%");
}

seed();
sqlite.close();
