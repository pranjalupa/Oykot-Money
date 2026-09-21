import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  ChartPieSlice,
  Repeat,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { CountUp, Reveal } from "@/components/landing-motion";
import { TRIAL_DAYS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Know what's safe to spend today",
    body: "One figure, every morning: what's left in Needs and Wants, divided by the days still to come.",
  },
  {
    icon: ChartPieSlice,
    title: "Plan the month in minutes",
    body: "Budget each category against your Needs, Wants and Investments split. Next month carries the plan over.",
  },
  {
    icon: UsersThree,
    title: "Lend and borrow without awkward maths",
    body: "Track what friends owe you and what you owe the bank, right beside the budget it affects.",
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
        <section className="pt-10 pb-14 text-center sm:pt-16 sm:pb-20">
          <p className="rise mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {TRIAL_DAYS} days free · no card needed
          </p>

          <h1
            className="rise mx-auto mt-5 max-w-2xl font-heading text-4xl font-extrabold tracking-tight sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            A budget you&rsquo;ll actually keep.
          </h1>
          <p
            className="accent-note rise mx-auto mt-4 max-w-xl text-lg text-muted-foreground"
            style={{ animationDelay: "120ms" }}
          >
            Plan the month, log what happens, and always know what&rsquo;s left.
          </p>

          <div
            className="rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "press group w-full gap-2 sm:w-auto",
              )}
            >
              Start free for {TRIAL_DAYS} days
              {/* The arrow steps forward on hover — the whole micro-interaction
                  budget for a primary button. */}
              <ArrowRight
                size={16}
                weight="bold"
                className="transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "press w-full sm:w-auto",
              )}
            >
              See pricing
            </Link>
          </div>
        </section>

        <AppPreview />

        <section className="mt-16 grid gap-4 sm:mt-24 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="press h-full rounded-2xl border border-border bg-card p-5 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-lg">
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-foreground">
                  <f.icon size={20} weight="duotone" />
                </span>
                <h2 className="mt-4 font-heading text-lg font-bold">{f.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </section>

        <Reveal>
          <section className="mt-16 rounded-2xl border border-border bg-card p-8 text-center sm:mt-24">
            <h2 className="font-heading text-2xl font-bold">Your money, in your currency.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Rupees, dollars, euros and more, with dates the way you read them. Export
              everything whenever you like — it&rsquo;s yours.
            </p>
            <Link href="/signup" className={cn(buttonVariants(), "press mt-6")}>
              Try it free for {TRIAL_DAYS} days
            </Link>
          </section>
        </Reveal>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * The product, not a picture of it: the real Daily card, built from the same
 * tokens the app uses, with two transactions drifting beside it.
 *
 * Deliberately not a screenshot — a screenshot goes stale the day the app
 * changes, and can't answer to the theme.
 */
function AppPreview() {
  const spent = 44_388;
  const budget = 61_500;

  return (
    <Reveal className="mx-auto max-w-md">
      <div className="relative">
        <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-xl">
          <p className="text-sm font-medium text-muted-foreground">Safe to spend today</p>
          <p className="mt-1.5 font-heading text-[2.75rem] leading-none font-bold tracking-tight">
            ₹<CountUp value={1711} />
            <span className="ml-1.5 font-sans text-base font-medium tracking-normal text-muted-foreground">
              / day
            </span>
          </p>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="fill-bar h-full rounded-full bg-primary"
              style={{ width: `${Math.round((spent / budget) * 100)}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">₹44,388</span> of ₹61,500 spent
            <span aria-hidden className="mx-1.5">·</span>
            <span className="font-semibold text-foreground">₹17,112</span> left
          </p>
        </div>

        {/* Two rows from the transaction list, floated off the card's corners.
            Hidden on phones, where there's no room to float anything. */}
        <div className="drift absolute -top-5 -right-4 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg sm:flex">
          <span className="font-medium">Groceries</span>
          <span className="tabular font-semibold">−₹1,464</span>
        </div>
        <div className="drift-slow absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-lg sm:flex">
          <span className="font-medium">Freelance project</span>
          <span className="tabular font-semibold text-positive">+₹11,219</span>
        </div>
      </div>
    </Reveal>
  );
}
