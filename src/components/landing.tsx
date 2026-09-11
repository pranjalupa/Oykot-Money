import Link from "next/link";
import {
  CalendarCheck,
  ChartPieSlice,
  Repeat,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { TRIAL_DAYS } from "@/lib/pricing";

const FEATURES = [
  {
    icon: ChartPieSlice,
    title: "Plan the month in minutes",
    body: "Budget each category against your Needs, Wants and Investments split. Next month carries the plan over.",
  },
  {
    icon: CalendarCheck,
    title: "Know what's safe to spend today",
    body: "A daily figure and a pace chart tell you whether you're on track — before the month is over, not after.",
  },
  {
    icon: UsersThree,
    title: "Lend and borrow without awkward maths",
    body: "Track what friends owe you and what you owe the bank, right alongside your budget.",
  },
  {
    icon: Repeat,
    title: "Fixed bills handle themselves",
    body: "Rent, SIPs and subscriptions repeat on their own — or count as spent without logging them at all.",
  },
];

/** The signed-out front door at "/". */
export function Landing() {
  return (
    <div className="min-h-svh">
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <section className="py-14 text-center sm:py-20">
          <h1 className="mx-auto max-w-2xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            A budget you&rsquo;ll actually keep.
          </h1>
          <p className="accent-note mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Plan the month, log what happens, and always know what&rsquo;s left.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ size: "lg" })}>
              Start your {TRIAL_DAYS}-day free trial
            </Link>
            <Link href="/pricing" className={buttonVariants({ size: "lg", variant: "outline" })}>
              See pricing
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">No card needed to start.</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
                <f.icon size={20} weight="duotone" />
              </span>
              <h2 className="mt-4 font-heading text-lg font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 rounded-xl border border-border bg-card p-8 text-center">
          <h2 className="font-heading text-2xl font-bold">Your money, in your currency.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Rupees, dollars, euros and more, with dates the way you read them. Export
            everything whenever you like — it&rsquo;s yours.
          </p>
          <Link href="/signup" className={`${buttonVariants()} mt-6`}>
            Try it free for {TRIAL_DAYS} days
          </Link>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
