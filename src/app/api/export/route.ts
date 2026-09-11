import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgetLines,
  categories,
  groupTargets,
  netWorthSnapshots,
  people,
  profiles,
  recurringRules,
  subscriptions,
  transactions,
} from "@/db/schema";
import { getUser, getUserPrefs } from "@/lib/auth";
import { listTransactions } from "@/lib/budget";
import { todayIn } from "@/lib/dates";
import { toMajor } from "@/lib/money";

export const dynamic = "force-dynamic";

const TYPE = { outflow: "Spent", inflow: "Received", transfer: "Transfer" } as const;

/** RFC 4180: quote everything that could break a cell. */
function csvCell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Everything you've put in, as a file. Never behind the paywall: exporting is
 * how people leave, and nobody should be held in by their own data.
 *
 *   ?format=csv   transactions, one row each — opens in any spreadsheet
 *   ?format=json  every table, amounts in hundredths (paise, cents)
 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new Response("Sign in to export your data.", { status: 401 });

  const format = new URL(request.url).searchParams.get("format") === "json" ? "json" : "csv";
  const { currency, timeZone } = await getUserPrefs();
  const stamp = todayIn(timeZone);

  if (format === "csv") {
    const rows = await listTransactions(user.id, { limit: 1_000_000 });
    const head = ["Date", "Type", "Amount", "Currency", "Category", "Group", "Account", "To", "Merchant / note", "Added by"];
    const lines = [
      head.join(","),
      ...rows.map((t) =>
        [
          t.date,
          TYPE[t.direction],
          toMajor(t.amountMinor).toFixed(2),
          currency,
          t.categoryName ?? "",
          t.groupKey ?? "",
          t.accountName,
          t.counterAccountName ?? "",
          t.merchant ?? t.note ?? "",
          t.source === "recurring" ? "repeat" : "you",
        ].map(csvCell).join(","),
      ),
    ];
    return new Response(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="oykot-money-transactions-${stamp}.csv"`,
      },
    });
  }

  const [profile, subscription, acc, ppl, cats, lines, targets, txs, repeats, snapshots] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)),
    db.select({ status: subscriptions.status, plan: subscriptions.plan, trialEndsAt: subscriptions.trialEndsAt }).from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select().from(accounts).where(eq(accounts.userId, user.id)),
    db.select().from(people).where(eq(people.userId, user.id)),
    db.select().from(categories).where(eq(categories.userId, user.id)),
    db.select().from(budgetLines).where(eq(budgetLines.userId, user.id)),
    db.select().from(groupTargets).where(eq(groupTargets.userId, user.id)),
    db.select().from(transactions).where(eq(transactions.userId, user.id)),
    db.select().from(recurringRules).where(eq(recurringRules.userId, user.id)),
    db.select().from(netWorthSnapshots).where(eq(netWorthSnapshots.userId, user.id)),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    email: user.email,
    currency,
    note: "Amounts ending in 'Minor' are in hundredths of the currency (paise, cents).",
    profile: profile[0] ?? null,
    subscription: subscription[0] ?? null,
    accounts: acc,
    people: ppl,
    categories: cats,
    budgetLines: lines,
    groupTargets: targets,
    transactions: txs,
    recurringRules: repeats,
    netWorthSnapshots: snapshots,
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="oykot-money-${stamp}.json"`,
    },
  });
}
