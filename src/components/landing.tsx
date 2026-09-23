import Link from "next/link";
import {
  ArrowRight,
  Check,
  DownloadSimple,
  Globe,
  LockKey,
  Minus,
  Moon,
  ShieldCheck,
  Sun,
  Trash,
} from "@phosphor-icons/react/dist/ssr";
import { HeroDemo } from "@/components/landing-hero-demo";
import { Reveal } from "@/components/landing-motion";
import { LogoMark, Wordmark } from "@/components/logo";
import { PaceMini } from "@/components/product-preview";
import { PricingTable } from "@/components/pricing-table";
import { buttonVariants } from "@/components/ui/button";
import { CURRENCIES } from "@/lib/currency";
import { LEGAL } from "@/lib/legal";
import { PRICES, TRIAL_DAYS, formatPrice, type PriceCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * The front door, for anyone signed out.
 *
 * Built around one idea — a single number every morning — and one
 * differentiator: no bank login, ever. The page alternates Stone sections with
 * Forest bands, and the Forest bands carry the two things worth shouting
 * about: the product (the hero) and the privacy stance.
 *
 * Every visual is the app's own UI in markup. Every claim is one the app
 * keeps: the currency count comes from `CURRENCIES`, prices from `PRICES`,
 * the lifetime seats from the database.
 */

const lemonCta =
  "h-12 rounded-full bg-lemon-400 px-6 text-base font-semibold text-forest-950 hover:bg-lemon-300 sm:h-12 sm:px-6";

export function Landing({
  currency,
  lifetimeSeats,
}: {
  currency: PriceCurrency;
  lifetimeSeats: number;
}) {
  return (
    <div className="relative min-h-svh bg-background">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* The header floats over the hero rather than living inside it, so it
          stays a banner landmark and everything else can sit in <main>. */}
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero currency={currency} />
        <Problem />
        <HowItWorks currency={currency} />
        <Privacy />
        <Features currency={currency} />
        <Comparison currency={currency} />
        <Pricing currency={currency} lifetimeSeats={lifetimeSeats} />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Nav() {
  return (
    <header className="absolute inset-x-0 top-0 z-20 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5 text-white" aria-label="Oykot Money, home">
        <span className="inline-flex rounded-[3px] ring-1 ring-white/25">
          <LogoMark size={30} />
        </span>
        <Wordmark height={17} />
      </Link>
      <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-2">
        <a href="#how" className="hidden rounded-full px-3 py-2 text-white/75 hover:text-white md:inline-flex">
          How it works
        </a>
        <a href="#pricing" className="hidden rounded-full px-3 py-2 text-white/75 hover:text-white md:inline-flex">
          Pricing
        </a>
        <Link href="/login" className="rounded-full px-3 py-2 text-white/75 hover:text-white">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="ml-1 inline-flex h-10 items-center rounded-full bg-white px-4 font-semibold text-forest-950 transition-colors hover:bg-lemon-300"
        >
          Start free
        </Link>
      </nav>
    </header>
  );
}

function Hero({ currency }: { currency: PriceCurrency }) {
  return (
    <section className="lp-grain relative isolate overflow-hidden bg-forest-950 text-white">
      <div aria-hidden className="lp-grid absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute -top-40 left-1/2 -z-10 h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-forest-700/60 blur-[120px]"
      />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-4 pt-28 pb-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-36 lg:pb-32">
        <div>
          <p className="lp-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80">
            <LockKey size={15} weight="duotone" className="text-lemon-400" />
            No bank login. Ever.
          </p>
          <h1
            className="lp-rise mt-6 font-heading text-[clamp(2.75rem,7.2vw,5.4rem)] leading-[0.95] font-extrabold tracking-[-0.035em] text-balance"
            style={{ animationDelay: "80ms" }}
          >
            Know what&rsquo;s{" "}
            <span className="accent-note font-normal tracking-normal text-lemon-400">safe</span> to
            spend today.
          </h1>
          <p
            className="lp-rise mt-6 max-w-[38ch] text-lg leading-relaxed text-white/75"
            style={{ animationDelay: "160ms" }}
          >
            No bank login. No spreadsheets. Just one number every morning that tells you how much
            you can spend without wrecking the month.
          </p>
          <div
            className="lp-rise mt-9 flex flex-wrap items-center gap-x-5 gap-y-3"
            style={{ animationDelay: "240ms" }}
          >
            <Link href="/signup" className={cn(buttonVariants(), lemonCta, "group")}>
              Start free for {TRIAL_DAYS} days
              <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="text-sm text-white/65">No card needed</span>
          </div>
        </div>

        <div className="lp-rise relative pt-16 lg:pt-10" style={{ animationDelay: "320ms" }}>
          <div
            aria-hidden
            className="lp-drift absolute top-1/4 left-1/2 -z-10 size-80 -translate-x-1/2 rounded-full bg-lemon-400/25 blur-[90px]"
          />
          <HeroDemo currency={currency} />
        </div>
      </div>

      {/* Trust strip: the three promises, as the hero's bottom edge. */}
      <div className="border-t border-white/10">
        <ul className="mx-auto grid w-full max-w-6xl gap-3 px-4 py-6 text-sm text-white/70 sm:grid-cols-3 sm:px-6">
          <li className="flex items-center gap-2.5">
            <ShieldCheck size={18} weight="duotone" className="shrink-0 text-lemon-400" />
            Your bank password never touches us
          </li>
          <li className="flex items-center gap-2.5 sm:justify-center">
            <Globe size={18} weight="duotone" className="shrink-0 text-lemon-400" />
            Works in {Object.keys(CURRENCIES).length} currencies
          </li>
          <li className="flex items-center gap-2.5 sm:justify-end">
            <DownloadSimple size={18} weight="duotone" className="shrink-0 text-lemon-400" />
            Export everything, any time
          </li>
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function SectionHead({
  eyebrow,
  title,
  children,
  center,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && (
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      )}
      <h2 className="mt-3 font-heading text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance">
        {title}
      </h2>
      {children && <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}

function Problem() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
      <Reveal>
        <SectionHead
          title={
            <>
              It&rsquo;s the 20th.
              <span className="block text-muted-foreground">Where did it all go?</span>
            </>
          }
        >
          Budget apps want your bank password, then drown you in charts. Spreadsheets die by week
          two. So you guess, overspend, and promise to do better next month.
        </SectionHead>
      </Reveal>
      <Reveal delay={120}>
        <RunsOutChart />
      </Reveal>
    </section>
  );
}

/**
 * The problem as a picture: money left through the month, running out on the
 * 20th while the even pace would have lasted to the 30th. Drawn in SVG with
 * theme tokens, so it follows light and dark.
 */
function RunsOutChart() {
  const x = (day: number) => 12 + ((day - 1) * 276) / 29;
  const spent = [
    [1, 22],
    [4, 38],
    [7, 52],
    [10, 70],
    [13, 84],
    [16, 99],
    [18, 110],
    [20, 124],
  ];
  const path = spent.map(([d, y], i) => `${i ? "L" : "M"}${x(d)},${y}`).join(" ");
  return (
    <figure className="rounded-[1.75rem] border border-border bg-card p-6 shadow-sm">
      <figcaption className="flex items-baseline justify-between text-sm">
        <span className="font-medium">Money left this month</span>
        <span className="text-muted-foreground">1st → 30th</span>
      </figcaption>
      <svg viewBox="0 0 300 150" className="mt-5 w-full" role="img" aria-label="Money runs out on the 20th, ten days before the month ends, while an even pace would have lasted.">
        <line x1="12" y1="124" x2="288" y2="124" stroke="var(--border)" strokeWidth="1" />
        {/* The even pace, for comparison. */}
        <line x1={x(1)} y1="22" x2={x(30)} y2="124" stroke="var(--muted-foreground)" strokeWidth="1.25" strokeDasharray="3 4" opacity="0.6" />
        <path d={`${path} L${x(20)},124 L${x(1)},124 Z`} fill="var(--primary)" opacity="0.1" />
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Ten days with nothing left. */}
        <line x1={x(20)} y1="124" x2={x(30)} y2="124" stroke="var(--destructive)" strokeWidth="3" strokeLinecap="round" />
        <circle cx={x(20)} cy="124" r="5" fill="var(--destructive)" />
        <text x={x(20)} y="143" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--destructive)">
          20th
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-primary" /> What happened
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0 w-4 border-t border-dashed border-muted-foreground" /> An even pace
        </span>
        <span className="flex items-center gap-1.5 font-medium text-destructive">
          <span className="h-0.5 w-4 rounded-full bg-destructive" /> Nothing left, 10 days to go
        </span>
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

function HowItWorks({ currency }: { currency: PriceCurrency }) {
  const income = currency === "INR" ? 80_000 : 4_000;
  const expense = currency === "INR" ? 240 : 14;
  const daily = currency === "INR" ? 1_610 : 43;
  const f = (n: number) => formatPrice(n, currency);

  const steps = [
    {
      title: "Add your income.",
      body: "Oykot splits it into needs, wants and investments. 50/30/20, or your own split.",
      visual: (
        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">
            Income <span className="font-semibold text-foreground tabular-nums">{f(income)}</span>
          </p>
          <div className="flex h-3 gap-1 overflow-hidden rounded-full">
            <span className="w-1/2 rounded-full" style={{ background: "var(--chart-needs)" }} />
            <span className="w-[30%] rounded-full" style={{ background: "var(--chart-wants)" }} />
            <span className="w-1/5 rounded-full" style={{ background: "var(--chart-investments)" }} />
          </div>
          <div className="grid grid-cols-3 text-xs tabular-nums">
            <span>Needs<br /><b className="font-semibold">{f(income * 0.5)}</b></span>
            <span>Wants<br /><b className="font-semibold">{f(income * 0.3)}</b></span>
            <span>Invest<br /><b className="font-semibold">{f(income * 0.2)}</b></span>
          </div>
        </div>
      ),
    },
    {
      title: "Log what you spend.",
      body: "One tap, amount, done. Takes about 3 seconds.",
      visual: (
        <div>
          <p className="font-heading text-4xl font-bold tracking-tight tabular-nums">{f(expense)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">Food</span>
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">Today</span>
            <span className="ml-auto rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
              Save
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Check your number.",
      body: "Safe-to-spend updates every day, so you always know what's left.",
      visual: (
        <div>
          <p className="text-sm text-muted-foreground">Safe to spend today</p>
          <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums">
            {f(daily)}
            <span className="ml-1 font-sans text-sm font-medium text-muted-foreground">/ day</span>
          </p>
        </div>
      ),
    },
  ];

  return (
    <section id="how" className="scroll-mt-8 border-y border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal>
          <SectionHead eyebrow="How it works" title="Three steps. Ten seconds a day." center />
        </Reveal>
        <ol className="mt-16 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 110} className="h-full">
              <div className="flex h-full flex-col rounded-[1.75rem] border border-border bg-card p-6 transition-transform duration-300 hover:-translate-y-1">
                <span className="font-heading text-sm font-bold text-primary tabular-nums">
                  0{i + 1}
                </span>
                <h3 className="mt-3 font-heading text-2xl font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.body}</p>
                <div aria-hidden className="mt-8 rounded-2xl border border-border bg-background/60 p-4">
                  {s.visual}
                </div>
              </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Privacy() {
  const points = [
    { icon: LockKey, text: "No bank linking, ever" },
    { icon: ShieldCheck, text: "No selling or sharing your data" },
    { icon: Trash, text: "Delete your account and everything goes with it" },
  ];
  return (
    <section className="lp-grain relative isolate overflow-hidden bg-forest-950 text-white">
      <div aria-hidden className="lp-grid absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-32">
        <Reveal>
          <p className="text-sm font-semibold tracking-wide text-lemon-400 uppercase">Privacy</p>
          <h2 className="mt-3 font-heading text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance">
            Private by design.
            <span className="block text-white/55">Not by promise.</span>
          </h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-white/75">
            Most budget apps link to your bank and read every transaction. Oykot never asks. You
            decide what goes in, and none of it is ever sold or shared.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-2 backdrop-blur-sm">
            <div className="flex items-baseline gap-4 rounded-[1.4rem] bg-white/[0.05] px-6 py-6">
              <span className="font-heading text-7xl leading-none font-extrabold text-lemon-400">0</span>
              <span className="text-white/75">bank logins we&rsquo;ll ever ask you for</span>
            </div>
            <ul className="divide-y divide-white/10 px-6">
              {points.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-4 py-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lemon-400/15 text-lemon-400">
                    <Icon size={20} weight="duotone" />
                  </span>
                  <span className="font-medium">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Features({ currency }: { currency: PriceCurrency }) {
  const f = (n: number) => formatPrice(n, currency);
  const budget = currency === "INR" ? 61_500 : 1_900;
  const spent = currency === "INR" ? 38_640 : 1_194;
  const card = "h-full rounded-[1.75rem] border border-border bg-card p-6 transition-transform duration-300 hover:-translate-y-1";

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
      <Reveal>
        <SectionHead eyebrow="Features" title="Everything you need. Nothing you'll ignore." />
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        <Reveal className="md:col-span-4">
          <article className={cn(card, "grid gap-8 sm:grid-cols-2 sm:items-center")}>
            <div>
              <h3 className="font-heading text-2xl font-bold tracking-tight">Daily safe-to-spend.</h3>
              <p className="mt-2 text-muted-foreground">One number, recalculated as you go.</p>
            </div>
            <div aria-hidden className="rounded-2xl border border-border bg-background/60 p-5">
              <p className="text-sm text-muted-foreground">Safe to spend today</p>
              <p className="mt-1 font-heading text-4xl font-bold tracking-tight tabular-nums">
                {f(currency === "INR" ? 1_610 : 43)}
                <span className="ml-1 font-sans text-sm font-medium text-muted-foreground">/ day</span>
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(spent / budget) * 100}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                {f(budget - spent)} left for the month
              </p>
            </div>
          </article>
        </Reveal>

        <Reveal className="md:col-span-2" delay={80}>
          <article className={card}>
            <h3 className="font-heading text-xl font-bold tracking-tight">Spending pace.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              See if you&rsquo;re ahead or behind before it&rsquo;s too late.
            </p>
            <div className="mt-6">
              <PaceMini />
            </div>
          </article>
        </Reveal>

        <Reveal className="md:col-span-2" delay={0}>
          <article className={card}>
            <h3 className="font-heading text-xl font-bold tracking-tight">Needs, wants, investments.</h3>
            <p className="mt-2 text-sm text-muted-foreground">Budget each group against your target.</p>
            <div aria-hidden className="mt-6 space-y-3">
              {[
                { name: "Needs", used: 82, color: "var(--chart-needs)" },
                { name: "Wants", used: 64, color: "var(--chart-wants)" },
                { name: "Investments", used: 100, color: "var(--chart-investments)" },
              ].map((g) => (
                <div key={g.name}>
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground tabular-nums">{g.used}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${g.used}%`, background: g.color }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </Reveal>

        <Reveal className="md:col-span-2" delay={80}>
          <article className={card}>
            <h3 className="font-heading text-xl font-bold tracking-tight">Your currency, your dates.</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {Object.keys(CURRENCIES).length} currencies and the date format you actually write.
            </p>
            <ul aria-label="Supported currencies" className="mt-6 flex flex-wrap gap-2">
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <li
                  key={code}
                  className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-sm font-medium"
                >
                  <span aria-hidden className="text-muted-foreground">{c.symbol} </span>
                  {code}
                </li>
              ))}
            </ul>
          </article>
        </Reveal>

        <Reveal className="md:col-span-2" delay={160}>
          <article className={card}>
            <h3 className="font-heading text-xl font-bold tracking-tight">Dark mode and light mode.</h3>
            <p className="mt-2 text-sm text-muted-foreground">Obviously.</p>
            {/* Both themes side by side, drawn with fixed values: this card has
                to show the *other* theme, whichever one you're in. */}
            <div aria-hidden className="mt-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-border">
              <div className="bg-[#f7f7f5] p-4 text-[#1d1d1b]">
                <Sun size={16} weight="duotone" />
                <p className="mt-3 font-heading text-xl font-bold tabular-nums">{f(currency === "INR" ? 1_610 : 43)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#e7e6e2]">
                  <div className="h-full w-3/5 rounded-full bg-forest-900" />
                </div>
              </div>
              <div className="bg-[#171716] p-4 text-[#f2f2f0]">
                <Moon size={16} weight="duotone" />
                <p className="mt-3 font-heading text-xl font-bold tabular-nums">{f(currency === "INR" ? 1_610 : 43)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#2c2c2a]">
                  <div className="h-full w-3/5 rounded-full bg-lemon-400" />
                </div>
              </div>
            </div>
          </article>
        </Reveal>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Comparison({ currency }: { currency: PriceCurrency }) {
  const rows: { label: string; us: React.ReactNode; them: React.ReactNode }[] = [
    { label: "Bank login required", us: <Never />, them: "Yes" },
    { label: "Daily safe-to-spend", us: <Yes />, them: <Sometimes /> },
    { label: "Setup time", us: "2 minutes", them: "30+ minutes" },
    {
      label: "Price",
      us: `${formatPrice(PRICES[currency].monthly, currency)}/mo`,
      them: "$8 to $15/mo",
    },
  ];
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6 lg:py-32">
        <Reveal>
          <SectionHead title="How it compares." center />
        </Reveal>
        <Reveal delay={100}>
          <div className="mt-12 overflow-hidden rounded-[1.75rem] border border-border bg-card">
            <table className="w-full text-left text-sm sm:text-base">
              <caption className="sr-only">Oykot Money compared with a typical budget app</caption>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-4 font-medium text-muted-foreground sm:px-6">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col" className="bg-primary/[0.06] px-4 py-4 sm:px-6">
                    <span className="flex items-center gap-2 font-heading font-bold">
                      <LogoMark size={20} /> Oykot
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-4 font-medium text-muted-foreground sm:px-6">
                    Typical budget app
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className="px-4 py-4 font-medium sm:px-6">
                      {r.label}
                    </th>
                    <td className="bg-primary/[0.06] px-4 py-4 font-semibold sm:px-6">{r.us}</td>
                    <td className="px-4 py-4 text-muted-foreground sm:px-6">{r.them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* Icons carry the judgement, so only our column gets the positive ones — a
   tick beside a competitor's "Yes, we need your bank password" reads as praise. */
function Yes() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Check size={16} weight="bold" className="text-primary" /> Yes
    </span>
  );
}
function Never() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ShieldCheck size={16} weight="fill" className="text-primary" /> Never
    </span>
  );
}
function Sometimes() {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Minus size={16} weight="bold" /> Sometimes
    </span>
  );
}

/* -------------------------------------------------------------------------- */

function Pricing({ currency, lifetimeSeats }: { currency: PriceCurrency; lifetimeSeats: number }) {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-24 sm:px-6 lg:py-32">
      <Reveal>
        <SectionHead eyebrow="Pricing" title="One plan. Everything in it." center>
          Free for {TRIAL_DAYS} days, no card needed.
        </SectionHead>
      </Reveal>
      <Reveal delay={100} className="mt-12">
        {/* The same component as /pricing, so the two can never disagree. */}
        <PricingTable defaultCurrency={currency} viewer="guest" lifetimeSeats={lifetimeSeats} />
      </Reveal>
    </section>
  );
}

const FAQ = [
  {
    q: "Why no bank sync?",
    a: "Because your money data is yours. Manual logging also makes you notice every spend, and that's half the point.",
  },
  {
    q: "Isn't manual logging a pain?",
    a: "It's one tap and an amount. Faster than unlocking your banking app.",
  },
  {
    q: "Can I export my data?",
    a: "Any time, from Settings. Your transactions as a CSV for a spreadsheet, or everything as JSON.",
  },
  {
    q: "What happens after the trial?",
    a: "Pick a plan or walk away. We never charge without asking, and there's no card on file to charge.",
  },
];

function Faq() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:py-32">
        <Reveal>
          <SectionHead title="Questions, answered." />
        </Reveal>
        <Reveal delay={100}>
          <div className="divide-y divide-border rounded-[1.75rem] border border-border bg-card">
            {FAQ.map((f) => (
              // `name` makes the set exclusive: opening one closes the others.
              <details key={f.q} name="faq" className="group px-6">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 font-heading text-lg font-bold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-lg transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-5 text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <div className="lp-grain relative isolate mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-forest-950 px-6 py-20 text-center text-white sm:py-28">
        <div aria-hidden className="lp-grid absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="absolute -bottom-32 left-1/2 -z-10 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-lemon-400/20 blur-[100px]"
        />
        <Reveal>
          <h2 className="mx-auto max-w-3xl font-heading text-[clamp(2.4rem,6vw,4.6rem)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">
            Stop guessing.{" "}
            <span className="accent-note font-normal tracking-normal text-lemon-400">Start knowing.</span>
          </h2>
          <div className="mt-10 flex justify-center">
            <Link href="/signup" className={cn(buttonVariants(), lemonCta, "group")}>
              Start free for {TRIAL_DAYS} days
              <ArrowRight size={18} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-white/65">No card. No bank login. Cancel from Settings, any time.</p>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Made by Oykot Studio</p>
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/refunds" className="hover:text-foreground">Refunds</Link>
          <a href={`mailto:${LEGAL.email}`} className="hover:text-foreground">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
