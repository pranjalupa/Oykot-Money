import "server-only";

import { and, desc, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgetLines, recurringRules, transactions } from "@/db/schema";
import { currentMonth, daysInMonth, isValidMonth } from "@/lib/targets";

/**
 * Carries last month's plan into a month that has none.
 *
 * A budget is mostly the same every month — rent doesn't change because the
 * calendar did. So opening a fresh month inherits the most recent month you
 * actually planned, and you adjust from there instead of starting at zero.
 *
 * Only fires when the month has NO budget lines at all. Once any line exists —
 * even one you deliberately set to zero — this never touches the month again,
 * so it can't overwrite your edits or resurrect amounts you cleared.
 */
export async function ensureMonthPlan(userId: string, month: string) {
  if (!isValidMonth(month)) return false;

  const [existing] = await db
    .select({ id: budgetLines.id })
    .from(budgetLines)
    .where(and(eq(budgetLines.userId, userId), eq(budgetLines.month, month)))
    .limit(1);

  if (existing) return false;

  // The most recent *earlier* month with a plan — not simply month-1, so a
  // gap month doesn't permanently break the chain.
  const [source] = await db
    .select({ month: budgetLines.month })
    .from(budgetLines)
    .where(and(eq(budgetLines.userId, userId), lt(budgetLines.month, month)))
    .orderBy(desc(budgetLines.month))
    .limit(1);

  if (!source) return false;

  const lines = await db
    .select()
    .from(budgetLines)
    .where(
      and(eq(budgetLines.userId, userId), eq(budgetLines.month, source.month)),
    );

  if (!lines.length) return false;

  await db
    .insert(budgetLines)
    .values(
      lines.map((l) => ({
        userId,
        month,
        categoryId: l.categoryId,
        plannedMinor: Number(l.plannedMinor),
      })),
    )
    // Another request may have carried the same month a moment ago.
    .onConflictDoNothing();

  return true;
}

/**
 * Drops one transaction per active recurring rule into the current month.
 *
 * Lazy rather than scheduled — there's no cron here, and doing it on read
 * keeps it simple. `lastRunMonth` makes it idempotent, so loading the page
 * twice can't post rent twice.
 *
 * Deliberately only fills the CURRENT month: browsing back to March shouldn't
 * invent transactions that never happened, and browsing forward shouldn't
 * pre-spend money you haven't spent.
 */
export async function ensureRecurringForMonth(userId: string, month: string) {
  if (month !== currentMonth()) return 0;

  const due = await db
    .select()
    .from(recurringRules)
    .where(
      and(
        eq(recurringRules.userId, userId),
        eq(recurringRules.active, true),
        // NULL lastRunMonth means it has never run.
        sql`(${recurringRules.lastRunMonth} is null or ${recurringRules.lastRunMonth} <> ${month})`,
      ),
    );

  if (!due.length) return 0;

  const lastDay = daysInMonth(month);
  let created = 0;

  for (const rule of due) {
    // The 31st still lands in February — clamp rather than skip the month.
    const day = Math.min(Math.max(rule.dayOfMonth, 1), lastDay);
    const date = `${month}-${String(day).padStart(2, "0")}`;

    // Claim the month first. If another concurrent request already moved it,
    // this updates zero rows and we skip — no double post.
    const claimed = await db
      .update(recurringRules)
      .set({ lastRunMonth: month })
      .where(
        and(
          eq(recurringRules.id, rule.id),
          sql`(${recurringRules.lastRunMonth} is null or ${recurringRules.lastRunMonth} <> ${month})`,
        ),
      )
      .returning({ id: recurringRules.id });

    if (!claimed.length) continue;

    await db.insert(transactions).values({
      userId,
      date,
      amountMinor: Number(rule.amountMinor),
      direction: rule.direction,
      accountId: rule.accountId,
      counterAccountId: rule.counterAccountId,
      categoryId: rule.categoryId,
      merchant: rule.merchant,
      note: rule.note,
      source: "recurring",
    });
    created++;
  }

  return created;
}

/** Both passes, for a page that's about to render a month. */
export async function prepareMonth(userId: string, month: string) {
  await ensureMonthPlan(userId, month);
  await ensureRecurringForMonth(userId, month);
}

export { ne };
