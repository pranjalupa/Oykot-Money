import { Money } from "@/components/money";
import { PeopleManager, PersonDialog } from "@/components/people-manager";
import { listPeople } from "@/lib/budget";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const user = await requireUser();
  const people = await listPeople(user.id);

  const active = people.filter((p) => !p.archived);
  const owedToYou = active
    .filter((p) => p.balanceMinor > 0)
    .reduce((s, p) => s + p.balanceMinor, 0);
  const youOwe = active
    .filter((p) => p.balanceMinor < 0)
    .reduce((s, p) => s - p.balanceMinor, 0);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold">People</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Who owes you, and who you owe.
          </p>
        </div>
        {people.length > 0 && <PersonDialog />}
      </header>

      {active.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
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
        </section>
      )}

      <PeopleManager people={people} />
    </div>
  );
}
