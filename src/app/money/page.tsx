import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Money } from "@/components/money";
import { AccountsManager } from "@/components/accounts-manager";
import { NewAccountDialog } from "@/components/account-dialogs";
import { getNetWorth, getNetWorthHistory, saveNetWorthSnapshot } from "@/lib/budget";
import { currentMonthIn } from "@/lib/dates";
import { NetWorthChart } from "@/components/charts/trend-charts";
import { requireUser, getUserPrefs } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * "Money" rather than "Accounts": the word *account* was doing three jobs at
 * once — your bank account, a person you'd lent to, and your login. People now
 * live at /people, and this page is only ever about your own money.
 */
export default async function MoneyPage() {
  const user = await requireUser();
  const [net, { timeZone }] = await Promise.all([getNetWorth(user.id), getUserPrefs()]);
  // Net worth can't be rebuilt later (assets keep no history), so record this
  // month's figure whenever it's looked at — the chart below reads these back.
  await saveNetWorthSnapshot(user.id, currentMonthIn(timeZone), net);
  const history = await getNetWorthHistory(user.id);

  const spending = net.balances.filter((b) => b.kind === "spending");
  const assets = net.balances.filter((b) => b.kind === "asset");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">Money</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Where it sits, and what it adds up to.
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
          <Stat
            label="You owe"
            minor={net.youOwe}
            tone={net.youOwe ? "negative" : "muted"}
          />
        </dl>

        {(net.owedToYou > 0 || net.youOwe > 0) && (
          <Link
            href="/people"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
          >
            See who
            <ArrowRight size={14} weight="bold" />
          </Link>
        )}
      </section>

      <NetWorthChart points={history} />

      <AccountsManager
        accounts={spending}
        title="Accounts"
        blurb="Bank, cash, wallets — money you spend from."
        empty="No accounts yet."
      />

      <AccountsManager
        accounts={assets}
        title="Assets"
        blurb="What they're worth today. Update the value when you check."
        empty="No assets yet. Add your SIP or PF to see net worth fill in."
      />
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
