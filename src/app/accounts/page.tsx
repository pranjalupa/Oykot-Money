import { Money } from "@/components/money";
import { CategoryIcon } from "@/components/category-icon";
import { getNetWorth, type AccountBalance } from "@/lib/budget";

export const dynamic = "force-dynamic";

const KIND_COPY: Record<
  AccountBalance["kind"],
  { title: string; blurb: string; empty: string }
> = {
  spending: {
    title: "Spending",
    blurb: "Bank, cash, wallets — money you spend from.",
    empty: "No spending accounts yet.",
  },
  asset: {
    title: "Assets",
    blurb: "What they're worth today. Update the value when you check.",
    empty: "No assets yet.",
  },
  loan: {
    title: "People",
    blurb: "Positive means they owe you. Negative means you owe them.",
    empty: "Nobody owes you anything, and you owe nobody. Tidy.",
  },
};

export default async function AccountsPage() {
  const net = await getNetWorth();
  const byKind = (kind: AccountBalance["kind"]) =>
    net.balances.filter((b) => b.kind === kind);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-2xl font-bold">Accounts</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Where the money sits, and what it adds up to.
        </p>
      </header>

      {/* Net worth ---------------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
      </section>

      {(["spending", "asset", "loan"] as const).map((kind) => {
        const list = byKind(kind);
        const copy = KIND_COPY[kind];
        return (
          <section
            key={kind}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-3">
              <h2 className="font-heading text-base font-bold">{copy.title}</h2>
              <p className="text-xs text-muted-foreground">{copy.blurb}</p>
            </div>

            {list.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {copy.empty}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {list.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <CategoryIcon
                      name={a.icon}
                      className="size-8 shrink-0 rounded-md bg-muted text-muted-foreground"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      {a.kind === "asset" && (
                        <p className="text-xs text-muted-foreground">
                          {a.valueUpdatedAt
                            ? `Updated ${a.valueUpdatedAt}`
                            : "Value not set yet"}
                        </p>
                      )}
                      {a.kind === "spending" && a.subtype && (
                        <p className="text-xs capitalize text-muted-foreground">
                          {a.subtype.replace("_", " ")}
                        </p>
                      )}
                    </div>
                    <Money
                      minor={a.balanceMinor}
                      tone={a.kind === "loan" ? "auto" : "default"}
                      className="shrink-0 text-sm font-semibold"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
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
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-base font-semibold">
        <Money minor={minor} tone={minor === 0 ? "muted" : tone} />
      </dd>
    </div>
  );
}
