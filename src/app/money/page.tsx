import { ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { AccountsManager } from "@/components/accounts-manager";
import { NewAccountDialog } from "@/components/account-dialogs";
import { PeopleManager, PersonDialog } from "@/components/people-manager";
import {
  getNetWorth,
  getNetWorthHistory,
  listAccounts,
  listCategories,
  listPeople,
  saveNetWorthSnapshot,
} from "@/lib/budget";
import { currentMonthIn, todayIn } from "@/lib/dates";
import { NetWorthTrend } from "@/components/charts/detail-insights";
import { requireUser, getUserPrefs } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Everything about your own money in one place, top to bottom: what it adds
 * up to, the accounts you spend from, who owes whom (Settlements — this used
 * to be a separate People page), and assets.
 *
 * "Money" rather than "Accounts": the word *account* was doing three jobs at
 * once — your bank account, a person you'd lent to, and your login.
 */
export default async function MoneyPage() {
  const user = await requireUser();
  const [net, { timeZone }, people, accounts, categories] = await Promise.all([
    getNetWorth(user.id),
    getUserPrefs(),
    listPeople(user.id),
    listAccounts(user.id),
    listCategories(user.id),
  ]);
  // Net worth can't be rebuilt later (assets keep no history), so record this
  // month's figure whenever it's looked at — the chart below reads these back.
  await saveNetWorthSnapshot(user.id, currentMonthIn(timeZone), net);
  const history = await getNetWorthHistory(user.id);

  const spending = net.balances.filter((b) => b.kind === "spending");
  const assets = net.balances.filter((b) => b.kind === "asset");

  const active = people.filter((p) => !p.archived);
  const owedToYou = active.filter((p) => p.balanceMinor > 0).reduce((s, p) => s + p.balanceMinor, 0);
  const youOwe = active.filter((p) => p.balanceMinor < 0).reduce((s, p) => s - p.balanceMinor, 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Money</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Where it sits, who owes whom, and what it adds up to.
          </p>
        </div>
        <NewAccountDialog />
      </header>

      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Net worth
        </p>
        <p className="mt-1 font-heading text-4xl font-bold">
          <Money minor={net.total} />
        </p>
        <p className="accent-note mt-1.5 text-sm text-muted-foreground">
          What you hold, plus what you&rsquo;re owed, minus what you owe.
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <Stat label="Cash" minor={net.cash} />
          <Stat label="Assets" minor={net.assets} />
          <Stat label="Owed to you" minor={net.owedToYou} />
          <Stat label="You owe" minor={net.youOwe} tone={net.youOwe ? "negative" : "muted"} />
        </dl>

        {(net.owedToYou > 0 || net.youOwe > 0) && (
          <a
            href="#settlements"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          >
            See who
            <ArrowDown size={14} weight="bold" />
          </a>
        )}
      </section>

      <AccountsManager
        accounts={spending}
        title="Accounts"
        blurb="Bank, cash, wallets — money you spend from."
        empty="No accounts yet."
      />

      <section id="settlements" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Settlements</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Who owes you, and who you owe. Use + on a person to record money either way.
            </p>
          </div>
          {people.length > 0 && <PersonDialog />}
        </div>

        {active.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                Owed to you
              </p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <Money minor={owedToYou} tone={owedToYou ? "default" : "muted"} />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                You owe
              </p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <Money minor={youOwe} tone={youOwe ? "negative" : "muted"} />
              </p>
            </div>
          </div>
        )}

        <PeopleManager
          people={people}
          accounts={accounts}
          categories={categories}
          defaultDate={todayIn(timeZone)}
        />
      </section>

      <AccountsManager
        accounts={assets}
        title="Assets"
        blurb="What they're worth today. Update the value when you check."
        empty="No assets yet. Add your SIP or PF to see net worth fill in."
      />

      <NetWorthTrend points={history} />
    </div>
  );
}

function Stat({
  label,
  minor,
  tone = "default",
}: {
  label: string;
  minor: number;
  tone?: "default" | "muted" | "negative";
}) {
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold">
        <Money minor={minor} tone={minor === 0 ? "muted" : tone} />
      </dd>
    </div>
  );
}
