/**
 * Demo content for one account, so every chart has something to show.
 *
 *   npx tsx scripts/demo-data.mts seed   [email]
 *   npx tsx scripts/demo-data.mts remove [email]
 *
 * Everything it writes is tagged so `remove` takes out exactly that and nothing
 * else: transactions have source = 'demo', people and budget lines have
 * note = 'demo', and snapshots are only written for months that had none.
 * The account's real categories, accounts and budgets are never changed.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const sql = postgres(process.env.POSTGRES_URL_NON_POOLING!, { max: 1, onnotice: () => {} });
const [mode, email = "pranjalupa@gmail.com"] = process.argv.slice(2);
const TAG = "demo";
const HISTORY = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"];

const [user] = await sql`select id from auth.users where lower(email) = ${email.toLowerCase()}`;
if (!user) throw new Error(`No account for ${email}`);
const uid = user.id as string;

if (mode === "remove") {
  const t = await sql`delete from transactions where user_id = ${uid} and source = ${TAG} returning id`;
  const p = await sql`delete from people where user_id = ${uid} and note = ${TAG} returning id`;
  const b = await sql`delete from budget_lines where user_id = ${uid} and note = ${TAG} returning id`;
  const s = await sql`delete from net_worth_snapshots where user_id = ${uid} and month = any(${HISTORY}) returning id`;
  const a = await sql`delete from accounts where user_id = ${uid} and kind = 'asset' and name = ${"Mutual funds (" + TAG + ")"} returning id`;
  console.log({ removed: { transactions: t.length, people: p.length, budgetLines: b.length, snapshots: s.length, assets: a.length } });
  await sql.end();
  process.exit(0);
}
if (mode !== "seed") throw new Error("Use: seed | remove");

const [{ n: already }] = await sql`select count(*)::int n from transactions where user_id = ${uid} and source = ${TAG}`;
if (already) throw new Error(`Demo data is already there (${already} transactions). Run remove first.`);

// Deterministic randomness, so a re-seed looks the same.
let seed = 20260911;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const between = (a: number, b: number) => a + rand() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const thisMonth = today.slice(0, 7);
const todayDay = Number(today.slice(8, 10));
const months = [...HISTORY, thisMonth];
const lastDay = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const date = (m: string, d: number) => `${m}-${String(d).padStart(2, "0")}`;

const accounts = await sql`select id, name, subtype from accounts where user_id = ${uid} and kind = 'spending' and not archived order by sort_order`;
const bank = accounts.find((a) => a.subtype === "bank") ?? accounts[0];
const cash = accounts.find((a) => a.subtype === "cash") ?? bank;
if (!bank) throw new Error("Needs at least one spending account.");

const plan = await sql`
  select c.id, c.name, c.group_key, b.planned_minor::bigint as planned
  from categories c join budget_lines b on b.category_id = c.id and b.month = ${thisMonth}
  where c.user_id = ${uid} and not c.archived and b.planned_minor > 0`;
if (!plan.length) throw new Error(`No budget for ${thisMonth} to base the demo on.`);

// Budget history for the trend charts — only months that have none, tagged.
let budgetLines = 0;
for (const m of HISTORY) {
  const [{ n }] = await sql`select count(*)::int n from budget_lines where user_id = ${uid} and month = ${m}`;
  if (n) continue;
  for (const c of plan) {
    await sql`insert into budget_lines (user_id, month, category_id, planned_minor, note) values (${uid}, ${m}, ${c.id}, ${c.planned}, ${TAG})`;
    budgetLines++;
  }
}

const FIXED = /rent|sip|ppf|\bpf\b|insurance|emi|gym|internet|wifi|mobile|recharge|subscription|netflix|spotify|electric|help|clean|maid|rented|fund|invest|mutual|stock|salary/i;
const MERCHANTS: [RegExp, string[]][] = [
  [/grocer|vegetable|fruit|dairy|milk/i, ["Blinkit", "Zepto", "BigBasket", "DMart", "Local sabziwala"]],
  [/eat|food|dining|restaurant|coffee|swiggy|zomato/i, ["Swiggy", "Zomato", "Third Wave Coffee", "Starbucks"]],
  [/commute|transport|travel|cab|fuel|petrol/i, ["Uber", "Ola", "Rapido", "Delhi Metro", "Indian Oil"]],
  [/shop|cloth|apparel|fashion/i, ["Amazon", "Myntra", "Flipkart", "Zara"]],
  [/entertain|movie|outing|fun/i, ["BookMyShow", "PVR", "Social"]],
  [/health|medic|pharma|doctor|supplement|protein/i, ["Apollo Pharmacy", "1mg", "HealthKart"]],
];
const merchantFor = (name: string) => (MERCHANTS.find(([re]) => re.test(name))?.[1] ?? [name]);

type Tx = { date: string; amount: number; direction: string; account: string; counter?: string | null; category: string | null; merchant: string };
const txs: Tx[] = [];
for (const m of months) {
  const current = m === thisMonth;
  const days = current ? todayDay : lastDay(m);
  const share = current ? todayDay / lastDay(m) : 1;
  const mood = between(0.78, 1.04); // some months cost more; most come in a little under
  for (const c of plan) {
    const planned = Number(c.planned);
    if (c.group_key === "income") {
      txs.push({ date: date(m, 1), amount: planned, direction: "inflow", account: bank.id, category: c.id, merchant: /salary/i.test(c.name) ? "Employer" : c.name });
      continue;
    }
    if (FIXED.test(c.name)) {
      const day = /rent/i.test(c.name) ? 1 : /sip|invest|fund|mutual|ppf|pf/i.test(c.name) ? 5 : Math.ceil(between(2, 12));
      if (day > days) continue;
      const amount = /rent|sip|invest|fund|mutual|ppf|pf|emi/i.test(c.name) ? planned : Math.round(planned * between(0.9, 1.15) / 100) * 100;
      txs.push({ date: date(m, day), amount, direction: "outflow", account: bank.id, category: c.id, merchant: c.name });
      continue;
    }
    const total = planned * share * mood * between(0.72, 1.1);
    const count = Math.max(1, Math.round(between(3, 9) * share));
    const weights = Array.from({ length: count }, () => between(0.4, 1.6));
    const sum = weights.reduce((s, w) => s + w, 0);
    for (const w of weights) {
      const amount = Math.max(1000, Math.round((total * w) / sum / 100) * 100);
      txs.push({
        date: date(m, Math.ceil(between(0.001, days))),
        amount,
        direction: "outflow",
        account: amount < 50000 && rand() < 0.25 ? cash.id : bank.id,
        category: c.id,
        merchant: pick(merchantFor(c.name)),
      });
    }
  }
}

// Two friends who owe you, for the balances chart.
const lendCategory = plan.find((c) => c.group_key === "wants")?.id ?? null;
let peopleAdded = 0;
for (const [name, amount, m] of [["Rahul", 200000, "2026-07"], ["Aman", 120000, "2026-08"]] as const) {
  const [p] = await sql`insert into people (user_id, name, kind, icon, note) values (${uid}, ${name}, 'person', 'User', ${TAG}) returning id`;
  const [a] = await sql`insert into accounts (user_id, name, kind, person_id, icon) values (${uid}, ${name}, 'loan', ${p.id}, 'User') returning id`;
  txs.push({ date: date(m, 14), amount, direction: "transfer", account: bank.id, counter: a.id, category: lendCategory, merchant: `Lent to ${name}` });
  peopleAdded++;
}

for (const t of txs) {
  await sql`
    insert into transactions (user_id, date, amount_minor, direction, account_id, counter_account_id, category_id, merchant, source)
    values (${uid}, ${t.date}, ${t.amount}, ${t.direction}, ${t.account}, ${t.counter ?? null}, ${t.category}, ${t.merchant}, ${TAG})`;
}

// One demo asset — tagged by name — so net worth and its breakdown aren't empty.
await sql`insert into accounts (user_id, name, kind, current_value_minor, value_updated_at, icon, sort_order)
          values (${uid}, ${"Mutual funds (" + TAG + ")"}, 'asset', 18000000, ${today}, 'ChartLineUp', 99)`;

// Net worth history: what it would have been at the end of each past month.
const snapCols = (await sql`select column_name from information_schema.columns where table_name = 'net_worth_snapshots'`).map((r) => r.column_name);
let snapshots = 0;
if (["total_minor", "cash_minor", "assets_minor", "owed_to_you_minor", "you_owe_minor"].every((c) => snapCols.includes(c))) {
  const [{ assets }] = await sql`select coalesce(sum(current_value_minor), 0)::bigint assets from accounts where user_id = ${uid} and kind = 'asset' and not archived and include_in_net_worth`;
  const [{ opening }] = await sql`select coalesce(sum(opening_balance_minor), 0)::bigint opening from accounts where user_id = ${uid} and kind = 'spending' and not archived and include_in_net_worth`;
  for (const m of HISTORY) {
    const end = date(m, lastDay(m));
    const [{ cashEffect }] = await sql`
      select coalesce(sum(case when t.direction = 'inflow' then t.amount_minor else -t.amount_minor end), 0)::bigint "cashEffect"
      from transactions t join accounts a on a.id = t.account_id
      where t.user_id = ${uid} and a.kind = 'spending' and t.date <= ${end}`;
    const [{ owed }] = await sql`
      select coalesce(sum(t.amount_minor), 0)::bigint owed
      from transactions t join accounts a on a.id = t.counter_account_id
      where t.user_id = ${uid} and a.kind = 'loan' and t.date <= ${end}`;
    const cashMinor = Number(opening) + Number(cashEffect);
    const total = cashMinor + Number(assets) + Number(owed);
    const r = await sql`
      insert into net_worth_snapshots (user_id, month, total_minor, cash_minor, assets_minor, owed_to_you_minor, you_owe_minor)
      values (${uid}, ${m}, ${total}, ${cashMinor}, ${assets}, ${owed}, 0)
      on conflict do nothing returning id`;
    snapshots += r.length;
  }
}

console.log({
  added: { transactions: txs.length, budgetLines, people: peopleAdded, snapshots },
  months: `${months[0]} → ${today}`,
  remove: "npx tsx scripts/demo-data.mts remove",
});
await sql.end();
