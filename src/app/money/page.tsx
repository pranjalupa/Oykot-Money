import { ArrowDown, ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { DialogTrigger } from "@/components/ui/dialog";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Money } from "@/components/money";
import { FlowGuide } from "@/components/flow-guide";
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
          <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
            Where it sits, who owes whom, and what it adds up to.
          </p>
        </div>
        <NewAccountDialog />
      </header>

      <FlowGuide id="money" />

      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Net worth
        </p>
        <p className="mt-1 font-heading text-4xl font-bold">
          <Money minor={net.total} />
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
          <Stat label="Cash" minor={net.cash} />
          <Stat label="Assets" minor={net.assets} />
          <Stat label="You'll get" minor={net.owedToYou} />
          <Stat label="You'll give" minor={net.youOwe} tone={net.youOwe ? "negative" : "muted"} />
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
        blurb="Bank, cash and wallets: the money you spend from."
        empty="No accounts yet."
        action={
          // Moving your own money lives here rather than in the Add form:
          // it's rare, and it's about accounts, not spending.
          spending.length > 1 ? (
            <TransactionDialog
              accounts={accounts}
              categories={categories}
              defaultDate={todayIn(timeZone)}
              tabs={["move"]}
              title="Move money"
              initial={{ direction: "transfer" }}
              trigger={
                <DialogTrigger render={<Button size="sm" variant="outline" className="shrink-0" />}>
                  <ArrowsLeftRight size={14} weight="bold" />
                  Move money
                </DialogTrigger>
              }
            />
          ) : undefined
        }
      />

      <section id="settlements" className="flex scroll-mt-20 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold">Settlements</h2>
            <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
              Tap a person to record money you gave or got, settle up, or see the history.
            </p>
          </div>
          {people.length > 0 && <PersonDialog />}
        </div>

        <FlowGuide id="settlements" />

        {active.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                You&rsquo;ll get
              </p>
              <p className="mt-1 font-heading text-2xl font-bold">
                <Money minor={owedToYou} tone={owedToYou ? "default" : "muted"} />
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                You&rsquo;ll give
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
      <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold">
        <Money minor={minor} tone={minor === 0 ? "muted" : tone} />
      </dd>
    </div>
  );
}
