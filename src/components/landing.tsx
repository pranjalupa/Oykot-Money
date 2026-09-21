import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { buttonVariants } from "@/components/ui/button";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { Reveal } from "@/components/landing-motion";
import {
  BudgetMini,
  DailyPreviewCard,
  PaceMini,
  PeopleMini,
  RecurringMini,
  SplitPreviewCard,
} from "@/components/product-preview";
import { TRIAL_DAYS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * Each card carries a slice of the screen it describes, on a panel tinted with
 * that part of the app's own chart colour — Needs green, Wants lemon,
 * Investments teal. `wide` gives a card both columns, so the grid has a shape
 * rather than being four equal boxes.
 */
const FEATURES = [
  {
    title: "Know what's safe to spend today",
    body: "One figure every morning: what's left in Needs and Wants, divided by the days still to come. No spreadsheet, no arithmetic.",
    visual: PaceMini,
    tint: "var(--primary)",
    wide: true,
  },
  {
    title: "Plan the month in minutes",
    body: "Budget each category against your 50/30/20 split. Next month carries the plan over.",
    visual: BudgetMini,
    tint: "var(--chart-needs)",
  },
  {
    title: "Lend and borrow without awkward maths",
    body: "What friends owe you and what you owe the bank, in words, beside the budget it affects.",
    visual: PeopleMini,
    tint: "var(--chart-investments)",
  },
  {
    title: "Fixed bills handle themselves",
    body: "Rent, SIPs and subscriptions repeat on their own — or count as spent without you logging them at all.",
    visual: RecurringMini,
    tint: "var(--chart-wants)",
    wide: true,
  },
];

/** The signed-out front door at "/". */
export function Landing() {
  return (
    <div className="min-h-svh">
      <PublicHeader />

      <main>
        {/* The wash and the grain sit behind the hero and are the only place in
            the whole product where colour is used as scenery. */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden className="mesh" />
          <div aria-hidden className="grain absolute inset-0" />

          <div className="relative mx-auto w-full max-w-5xl px-4 pt-12 pb-24 text-center sm:px-6 sm:pt-20 sm:pb-32">
            <p className="rise mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="size-1.5 rounded-full bg-primary" />
              {TRIAL_DAYS} days free · no card needed
            </p>

            <h1
              className="rise mx-auto mt-6 max-w-3xl font-heading text-[2.75rem] leading-[1.05] font-extrabold tracking-tight sm:text-6xl"
              style={{ animationDelay: "60ms" }}
            >
              A budget you&rsquo;ll actually keep.
            </h1>
            <p
              className="accent-note rise mx-auto mt-5 max-w-xl text-lg text-muted-foreground sm:text-xl"
              style={{ animationDelay: "120ms" }}
            >
              Plan the month, log what happens, and always know what&rsquo;s left.
            </p>

            <div
              className="rise mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={{ animationDelay: "180ms" }}
            >
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "press group w-full gap-2 shadow-lg shadow-primary/20 sm:w-auto",
                )}
              >
                Start free for {TRIAL_DAYS} days
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
                  "press w-full bg-card/60 backdrop-blur sm:w-auto",
                )}
              >
                See pricing
              </Link>
            </div>

            <HeroStack />
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
          <section className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 70} className={cn(f.wide && "sm:col-span-2")}>
                <div
                  style={{ "--tint": f.tint } as React.CSSProperties}
                  className={cn(
                    "tinted press flex h-full flex-col rounded-3xl border border-border bg-card p-6 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-xl",
                    f.wide && "sm:flex-row-reverse sm:items-center sm:gap-8",
                  )}
                >
                  <div className={cn(f.wide && "sm:w-1/2")}>
                    <f.visual />
                  </div>
                  <div className={cn("mt-5", f.wide && "sm:mt-0 sm:w-1/2")}>
                    <h2 className="font-heading text-xl font-bold">{f.title}</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </section>

          <Reveal>
            <section
              style={{ "--tint": "var(--accent)" } as React.CSSProperties}
              className="tinted relative mt-4 overflow-hidden rounded-3xl border border-border bg-card px-6 py-14 text-center"
            >
              <div aria-hidden className="grain absolute inset-0" />
              <div className="relative">
                <h2 className="mx-auto max-w-xl font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Your money, in your currency.
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
                  Rupees, dollars, euros and more, with dates the way you read them. Export
                  everything whenever you like — it&rsquo;s yours.
                </p>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "press group mt-8 gap-2 shadow-lg shadow-primary/20",
                  )}
                >
                  Try it free for {TRIAL_DAYS} days
                  <ArrowRight
                    size={16}
                    weight="bold"
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </section>
          </Reveal>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Three pieces of the app stacked, leaning back like a card on a desk and
 * straightening when you point at it. Only the Daily card shows on a phone —
 * the rest would be a pile.
 */
function HeroStack() {
  return (
    <Reveal className="mt-16 sm:mt-20">
      <div className="tilt relative mx-auto max-w-md text-left">
        <DailyPreviewCard />

        <div className="absolute -right-44 -bottom-10 hidden w-64 lg:block">
          <SplitPreviewCard />
        </div>

        <div className="drift absolute -top-6 -right-12 hidden items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs shadow-lg backdrop-blur sm:flex">
          <span className="font-medium">Groceries</span>
          <span className="tabular font-semibold">−₹1,464</span>
        </div>
        <div className="drift-slow absolute -bottom-6 -left-12 hidden items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-xs shadow-lg backdrop-blur sm:flex">
          <span className="font-medium">Freelance project</span>
          <span className="tabular font-semibold text-positive">+₹11,219</span>
        </div>
      </div>
    </Reveal>
  );
}
