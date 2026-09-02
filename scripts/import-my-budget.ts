/**
 * One-time import of Pranjal's real budget from the Aug-26 sheet.
 *
 * Targets a single account by email — new signups get the small generic
 * starter set in lib/defaults.ts, not this. Run with:
 *
 *   npx tsx scripts/import-my-budget.ts pranjalupa@gmail.com
 *
 * Idempotent: re-running updates planned amounts and adds any missing
 * categories rather than duplicating them.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { toMinor } from "../src/lib/money";
import type { GroupKey } from "../src/db/schema";

const email = process.argv[2];
if (!email) {
  console.error("Usage: tsx scripts/import-my-budget.ts <email>");
  process.exit(1);
}

const connection = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!connection) {
  console.error("Set POSTGRES_URL_NON_POOLING (source .env.local first).");
  process.exit(1);
}

const client = postgres(connection, { max: 1 });
const db = drizzle(client, { schema });

/** [name, plannedRupees, icon] — straight from the Aug-26 sheet. */
type Line = [string, number, string];

const NEEDS: Line[] = [
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

const WANTS: Line[] = [
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

const INVESTMENTS: Line[] = [
  ["OykotStudio", 0, "Storefront"],
  ["PF", 1800, "Bank"],
  ["SIP / Mutual Funds", 15000, "ChartLineUp"],
  ["Emergency Fund Deposit", 5000, "Umbrella"],
  ["Remaining Balance Amount", 467, "Coins"],
  ["Misc-Savings", 0, "DotsThree"],
];

const INCOME: Line[] = [
  ["Salary", 64867, "Money"],
  ["Freelance / OykotStudio", 0, "Storefront"],
  ["Internship Stipend", 0, "GraduationCap"],
  ["Misc-Income", 0, "DotsThree"],
  ["Money Borrowed", 0, "ArrowUUpRight"],
  ["Debt (Repayment Received)", 0, "ArrowUUpLeft"],
];

const GROUPS: [GroupKey, Line[]][] = [
  ["needs", NEEDS],
  ["wants", WANTS],
  ["investments", INVESTMENTS],
  ["income", INCOME],
];

/** Pranjal's split, not the shipped 50/30/20. */
const TARGETS: [Exclude<GroupKey, "income">, number][] = [
  ["needs", 50],
  ["wants", 15],
  ["investments", 35],
];

const ASSETS = [
  { name: "PF", icon: "Bank" },
  { name: "SIP / Mutual Funds", icon: "ChartLineUp" },
  { name: "Emergency Fund", icon: "Umbrella" },
];

/**
 * Generic starter categories that mean the same thing as a sheet line, left
 * behind when the account was first seeded. Archived rather than deleted —
 * they carry no plan and no transactions, but archiving is reversible and
 * deleting isn't.
 *   Supplements            -> Supplements (Protein / Creatine)
 *   Family Support         -> To Mummy
 *   Business / Side Project-> OykotStudio
 *   Freelance              -> Freelance / OykotStudio
 */
const SUPERSEDED = [
  "Supplements",
  "Family Support",
  "Business / Side Project",
  "Freelance",
];

function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const [user] = await client<{ id: string }[]>`
    select id from auth.users where email = ${email} limit 1`;
  if (!user) {
    console.error(`No account for ${email}. Sign in once first.`);
    process.exit(1);
  }

  const userId = user.id;
  const month = thisMonth();
  console.log(`Importing into ${email} for ${month}…`);

  const existing = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, userId));
  const byName = new Map(existing.map((c) => [c.name, c]));

  let sortOrder = 0;
  let created = 0;
  let updated = 0;

  for (const [groupKey, lines] of GROUPS) {
    for (const [name, rupees, icon] of lines) {
      let categoryId = byName.get(name)?.id;

      if (!categoryId) {
        const [row] = await db
          .insert(schema.categories)
          .values({ userId, name, groupKey, icon, sortOrder: sortOrder })
          .returning({ id: schema.categories.id });
        categoryId = row.id;
        created++;
      } else {
        // Keep the sheet's ordering even for categories already present.
        await db
          .update(schema.categories)
          .set({ groupKey, icon, sortOrder })
          .where(eq(schema.categories.id, categoryId));
        updated++;
      }
      sortOrder++;

      await db
        .insert(schema.budgetLines)
        .values({ userId, month, categoryId, plannedMinor: toMinor(rupees) })
        .onConflictDoUpdate({
          target: [schema.budgetLines.month, schema.budgetLines.categoryId],
          set: { plannedMinor: toMinor(rupees) },
        });
    }
  }

  for (const [groupKey, percent] of TARGETS) {
    await db
      .insert(schema.groupTargets)
      .values({ userId, month: schema.DEFAULT_MONTH, groupKey, percent })
      .onConflictDoUpdate({
        target: [
          schema.groupTargets.userId,
          schema.groupTargets.month,
          schema.groupTargets.groupKey,
        ],
        set: { percent },
      });
  }

  // Asset accounts to hold what the investment categories feed. Values start
  // at zero — only Pranjal knows what they're actually worth today.
  const accounts = await db
    .select()
    .from(schema.accounts)
    .where(eq(schema.accounts.userId, userId));
  const accountNames = new Set(accounts.map((a) => a.name));
  let order = accounts.length;

  for (const a of ASSETS) {
    if (accountNames.has(a.name)) continue;
    await db.insert(schema.accounts).values({
      userId,
      name: a.name,
      kind: "asset",
      icon: a.icon,
      sortOrder: order++,
    });
  }

  // Retire the generic duplicates — but only if nothing is riding on them.
  let archived = 0;
  for (const name of SUPERSEDED) {
    const cat = byName.get(name);
    if (!cat || cat.archived) continue;

    const [{ count }] = await client<{ count: number }[]>`
      select count(*)::int from transactions where category_id = ${cat.id}`;
    const [{ planned }] = await client<{ planned: number }[]>`
      select coalesce(sum(planned_minor), 0)::int planned
      from budget_lines where category_id = ${cat.id}`;
    if (count > 0 || planned > 0) {
      console.log(`  keeping "${name}" — it has data`);
      continue;
    }

    await db
      .update(schema.categories)
      .set({ archived: true })
      .where(
        and(eq(schema.categories.id, cat.id), eq(schema.categories.userId, userId)),
      );
    archived++;
  }

  // Reconcile against the sheet so a silent mismatch can't slip through.
  const totals = await client<{ group_key: GroupKey; total: string }[]>`
    select c.group_key, sum(b.planned_minor)::text as total
    from budget_lines b join categories c on c.id = b.category_id
    where b.user_id = ${userId} and b.month = ${month}
    group by c.group_key`;

  console.log(`categories: +${created} new, ${updated} updated, ${archived} retired`);
  console.log("Planned totals:");
  for (const t of totals) {
    console.log(`  ${t.group_key.padEnd(12)} ₹${(Number(t.total) / 100).toLocaleString("en-IN")}`);
  }
  console.log("Target split: Needs 50% · Wants 15% · Investments 35%");
}

main()
  .then(() => client.end())
  .catch(async (e) => {
    console.error(e);
    await client.end();
    process.exit(1);
  });
