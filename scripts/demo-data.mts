/**
 * A year of demo content for one account, so every screen and chart has
 * something to show.
 *
 *   npx tsx scripts/demo-data.mts seed   [email]
 *   npx tsx scripts/demo-data.mts remove [email]
 *
 * Covers the last 12 months up to today: this month's budget and income,
 * everyday spending in the starter categories, two people (a loan you made and
 * one you took, both through the locked categories), two assets and net worth
 * history. Everything is tagged so `remove` takes out exactly that:
 * transactions source='demo', budget lines / people note='demo', assets named
 * "(demo)", and snapshots only for months that had none.
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

const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const thisMonth = today.slice(0, 7);
const todayDay = Number(today.slice(8, 10));
const addMonths = (m: string, n: number) => {
  const d = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
const MONTHS = Array.from({ length: 12 }, (_, i) => addMonths(thisMonth, i - 11));
const HISTORY = MONTHS.slice(0, -1);
const lastDay = (m: string) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate();
const date = (m: string, d: number) => `${m}-${String(Math.min(d, lastDay(m))).padStart(2, "0")}`;

try {
  const [user] = await sql`select id from auth.users where lower(email) = ${email.toLowerCase()}`;
  if (!user) throw new Error(`No account for ${email}`);
  const uid = user.id as string;

  if (mode === "remove") {
    const out = await sql.begin(async (tx) => {
      const t = await tx`delete from transactions where user_id = ${uid} and source = ${TAG} returning id`;
      const b = await tx`delete from budget_lines where user_id = ${uid} and note = ${TAG} returning id`;
      const s = await tx`delete from net_worth_snapshots where user_id = ${uid} and month = any(${HISTORY}) returning id`;
      const l = await tx`delete from accounts where user_id = ${uid} and person_id in (select id from people where user_id = ${uid} and note = ${TAG}) returning id`;
      const p = await tx`delete from people where user_id = ${uid} and note = ${TAG} returning id`;
      const a = await tx`delete from accounts where user_id = ${uid} and kind = 'asset' and name like ${"%(" + TAG + ")"} returning id`;
      return { transactions: t.length, budgetLines: b.length, snapshots: s.length, people: p.length, ledgers: l.length, assets: a.length };
    });
    console.log({ removed: out });
  } else if (mode === "seed") {
    const [{ n: already }] = await sql`select count(*)::int n from transactions where user_id = ${uid} and source = ${TAG}`;
    if (already) throw new Error(`Demo data is already there (${already} transactions). Run remove first.`);

    // Deterministic randomness, so a re-seed looks the same.
    let seed = 20260914;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const between = (a: number, b: number) => a + rand() * (b - a);
    const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
    const r100 = (n: number) => Math.round(n / 100) * 100;

    const accounts = await sql`select id, subtype from accounts where user_id = ${uid} and kind = 'spending' and not archived order by sort_order`;
    const bank = accounts.find((a) => a.subtype === "bank") ?? accounts[0];
    const cash = accounts.find((a) => a.subtype === "cash") ?? bank;
    if (!bank) throw new Error("Needs at least one spending account.");

    const cats = await sql`select id, name, group_key, system_key from categories where user_id = ${uid} and not archived and parent_id is null`;
    const byName = (re: RegExp, group: string) => cats.find((c) => !c.system_key && c.group_key === group && re.test(c.name));
    const locked = Object.fromEntries(cats.filter((c) => c.system_key).map((c) => [c.system_key, c.id]));
    for (const k of ["lent", "repaid_in", "borrowed", "repaid_out"]) if (!locked[k]) throw new Error(`Missing locked category ${k} — open the app once first.`);

    // A monthly plan (in paise) for ₹80,000 take-home, close to 50/30/20.
    // kind: fixed = one payment on a set day; daily = many small ones.
    const PLAN: { re: RegExp; group: string; planned: number; kind: "income" | "fixed" | "daily"; day?: number; merchants?: string[] }[] = [
      { re: /^salary$/i, group: "income", planned: 8000000, kind: "income", day: 1 },
      { re: /^rent$/i, group: "needs", planned: 2200000, kind: "fixed", day: 1, merchants: ["Landlord"] },
      { re: /grocer/i, group: "needs", planned: 900000, kind: "daily", merchants: ["Blinkit", "Zepto", "BigBasket", "DMart", "Local sabziwala"] },
      { re: /bills|utilit/i, group: "needs", planned: 450000, kind: "fixed", day: 8, merchants: ["Electricity + Wi-Fi"] },
      { re: /transport/i, group: "needs", planned: 350000, kind: "daily", merchants: ["Uber", "Rapido", "Delhi Metro", "Indian Oil"] },
      { re: /health/i, group: "needs", planned: 150000, kind: "daily", merchants: ["Apollo Pharmacy", "1mg", "Practo"] },
      { re: /eating/i, group: "wants", planned: 700000, kind: "daily", merchants: ["Swiggy", "Zomato", "Third Wave Coffee", "Starbucks"] },
      { re: /shopping/i, group: "wants", planned: 800000, kind: "daily", merchants: ["Amazon", "Myntra", "Flipkart", "Zara"] },
      { re: /subscri/i, group: "wants", planned: 150000, kind: "fixed", day: 12, merchants: ["Netflix + Spotify"] },
      { re: /entertain/i, group: "wants", planned: 450000, kind: "daily", merchants: ["BookMyShow", "PVR", "Social"] },
      { re: /^savings$/i, group: "investments", planned: 600000, kind: "fixed", day: 5, merchants: ["Emergency fund"] },
      { re: /^investments$/i, group: "investments", planned: 1000000, kind: "fixed", day: 5, merchants: ["SIP — Nifty 50 index"] },
    ];
    const plan = PLAN.map((p) => ({ ...p, cat: byName(p.re, p.group) })).filter((p) => p.cat);
    if (!plan.length) throw new Error("None of the starter categories were found.");

    // Budget: every demo month that has no plan yet. The current month too, so the app has a plan to show.
    let budgetLines = 0;
    for (const m of MONTHS) {
      const [{ n }] = await sql`select count(*)::int n from budget_lines where user_id = ${uid} and month = ${m}`;
      if (n) continue;
      for (const p of plan) {
        await sql`insert into budget_lines (user_id, month, category_id, planned_minor, note) values (${uid}, ${m}, ${p.cat!.id}, ${p.planned}, ${TAG})`;
        budgetLines++;
      }
    }

    type Tx = { date: string; amount: number; direction: string; account: string; counter?: string | null; category: string | null; merchant: string };
    const txs: Tx[] = [];
    for (const m of MONTHS) {
      const current = m === thisMonth;
      const days = current ? todayDay : lastDay(m);
      const share = current ? todayDay / lastDay(m) : 1;
      // Festive months (Oct–Nov) and year-end spend more; a couple of lean months come in under.
      const mon = +m.slice(5, 7);
      const mood = mon === 10 || mon === 11 ? between(1.08, 1.22) : mon === 12 ? between(1.0, 1.12) : between(0.8, 1.02);
      for (const p of plan) {
        const id = p.cat!.id;
        if (p.kind === "income") {
          if (p.day! <= days) txs.push({ date: date(m, p.day!), amount: p.planned, direction: "inflow", account: bank.id, category: id, merchant: "Employer" });
          continue;
        }
        if (p.kind === "fixed") {
          if (p.day! > days) continue;
          const exact = /rent|savings|investments/i.test(p.cat!.name);
          txs.push({ date: date(m, p.day!), amount: exact ? p.planned : r100(p.planned * between(0.85, 1.15)), direction: "outflow", account: bank.id, category: id, merchant: p.merchants![0] });
          continue;
        }
        const total = (p.planned * share * mood * between(0.75, 1.1)) / 1;
        const count = Math.max(1, Math.round(between(4, 10) * share));
        const weights = Array.from({ length: count }, () => between(0.4, 1.6));
        const sum = weights.reduce((s, w) => s + w, 0);
        for (const w of weights) {
          const amount = Math.max(5000, r100((total * w) / sum));
          txs.push({ date: date(m, Math.ceil(between(0.001, days))), amount, direction: "outflow", account: amount < 50000 && rand() < 0.3 ? cash.id : bank.id, category: id, merchant: pick(p.merchants!) });
        }
      }
      // Cash has to come from somewhere: a monthly ATM withdrawal (a move, no category).
      if (days >= 2 && cash.id !== bank.id) {
        txs.push({ date: date(m, 2), amount: 250000, direction: "transfer", account: bank.id, counter: cash.id, category: null, merchant: "ATM withdrawal" });
      }
      // Other income now and then: a freelance payment.
      const other = byName(/other income/i, "income");
      if (other && rand() < 0.3 && days >= 20) {
        txs.push({ date: date(m, 20), amount: r100(between(800000, 2500000)), direction: "inflow", account: bank.id, category: other.id, merchant: "Freelance project" });
      }
    }

    // People, through the locked categories exactly as You gave / You got would record them.
    const person = async (name: string, kind: "person" | "institution", icon: string) => {
      const [p] = await sql`insert into people (user_id, name, kind, icon, note) values (${uid}, ${name}, ${kind}, ${icon}, ${TAG}) returning id`;
      const [a] = await sql`insert into accounts (user_id, name, kind, person_id, icon) values (${uid}, ${name}, 'loan', ${p.id}, ${icon}) returning id`;
      return a.id as string;
    };
    const rahul = await person("Rahul", "person", "User");
    const aman = await person("Aman", "person", "User");
    const m = (back: number, day: number) => date(addMonths(thisMonth, -back), day);
    // Rahul borrows ₹5,000, pays back ₹3,000 → still owes ₹2,000.
    txs.push({ date: m(4, 14), amount: 500000, direction: "transfer", account: bank.id, counter: rahul, category: locked.lent, merchant: "Trip deposit" });
    txs.push({ date: m(2, 3), amount: 300000, direction: "inflow", account: bank.id, counter: rahul, category: locked.repaid_in, merchant: "Part payment" });
    // You borrow ₹10,000 from Aman and pay it back two months later → settled.
    txs.push({ date: m(7, 22), amount: 1000000, direction: "inflow", account: bank.id, counter: aman, category: locked.borrowed, merchant: "Laptop repair" });
    txs.push({ date: m(5, 2), amount: 1000000, direction: "transfer", account: bank.id, counter: aman, category: locked.repaid_out, merchant: "Paid back" });

    for (const t of txs.filter((t) => t.date <= today)) {
      await sql`
        insert into transactions (user_id, date, amount_minor, direction, account_id, counter_account_id, category_id, merchant, source)
        values (${uid}, ${t.date}, ${t.amount}, ${t.direction}, ${t.account}, ${t.counter ?? null}, ${t.category}, ${t.merchant}, ${TAG})`;
    }

    // Two assets — tagged by name.
    for (const [name, value, icon] of [["Mutual funds (demo)", 16500000, "ChartLineUp"], ["PF (demo)", 21000000, "Vault"]] as const) {
      await sql`insert into accounts (user_id, name, kind, current_value_minor, value_updated_at, icon, sort_order)
                values (${uid}, ${name}, 'asset', ${value}, ${today}, ${icon}, 99)`;
    }

    // Net worth at the end of each past month. Assets grow toward today's value.
    let snapshots = 0;
    const [{ opening }] = await sql`select coalesce(sum(opening_balance_minor), 0)::bigint opening from accounts where user_id = ${uid} and kind = 'spending' and not archived and include_in_net_worth`;
    const assetsNow = 16500000 + 21000000;
    for (const [i, hm] of HISTORY.entries()) {
      const end = date(hm, lastDay(hm));
      const [{ cashEffect }] = await sql`
        select coalesce(sum(case when t.direction = 'inflow' then t.amount_minor else -t.amount_minor end), 0)::bigint "cashEffect"
        from transactions t join accounts a on a.id = t.account_id
        where t.user_id = ${uid} and a.kind = 'spending' and t.date <= ${end}`;
      const [{ ledger }] = await sql`
        select coalesce(sum(case when t.direction = 'inflow' then -t.amount_minor else t.amount_minor end), 0)::bigint ledger
        from transactions t join accounts a on a.id = t.counter_account_id
        where t.user_id = ${uid} and a.kind = 'loan' and t.date <= ${end}`;
      const cashMinor = Number(opening) + Number(cashEffect);
      const assets = Math.round(assetsNow * (0.7 + (0.3 * (i + 1)) / HISTORY.length));
      const owed = Math.max(0, Number(ledger));
      const youOwe = Math.max(0, -Number(ledger));
      const r = await sql`
        insert into net_worth_snapshots (user_id, month, total_minor, cash_minor, assets_minor, owed_to_you_minor, you_owe_minor)
        values (${uid}, ${hm}, ${cashMinor + assets + owed - youOwe}, ${cashMinor}, ${assets}, ${owed}, ${youOwe})
        on conflict do nothing returning id`;
      snapshots += r.length;
    }

    console.log({
      added: { transactions: txs.filter((t) => t.date <= today).length, budgetLines, people: 2, assets: 2, snapshots },
      months: `${MONTHS[0]} → ${today}`,
      remove: "npx tsx scripts/demo-data.mts remove",
    });
  } else {
    throw new Error("Use: seed | remove");
  }
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
