import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle,
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
import {
  DailyScreen,
  FloatCard,
  PhoneFrame,
  SAMPLE,
  SplitCard,
  mockMoney,
} from "@/components/landing-mockups";
import { LandingMotion } from "@/components/landing-motion-gsap";
import { LogoMark, Wordmark } from "@/components/logo";
import { PaceMini } from "@/components/product-preview";
import { FaqList } from "@/components/faq-list";
import { PricingTable } from "@/components/pricing-table";
import { buttonVariants } from "@/components/ui/button";
import { CURRENCIES } from "@/lib/currency";
import { LEGAL } from "@/lib/legal";
import { PRICES, TRIAL, TRIAL_DAYS, formatPrice, type PriceCurrency } from "@/lib/pricing";
import { cn } from "@/lib/utils";

/**
 * The front door, for anyone signed out. Light and editorial: Stone pages,
 * grey panels, white cards with soft shadows, one flat Forest panel for the
 * privacy stance. No gradients, no italic — both by Pranjal's call.
 *
 * Every visual is a mockup of the app built in markup (components/
 * landing-mockups.tsx): a phone running the Daily screen, cards floating off
 * it, panels whose mockups are cropped by their edges. Every claim is one the
 * app keeps: currencies from `CURRENCIES`, prices from `PRICES`.
 *
 * Motion is wired by `data-lp-*` attributes and lives in
 * components/landing-motion-gsap.tsx.
 */

/** The trial's terms in a few words, per region — "no card" is only true in India. */
function trialTerms(currency: PriceCurrency) {
  return TRIAL[currency].card
    ? { short: `Cancel before day ${TRIAL[currency].days}, pay nothing`, sentence: `Cancel before day ${TRIAL[currency].days} and pay nothing.` }
    : { short: "No card needed", sentence: "No card needed." };
}

const cta = "h-12 rounded-full px-6 text-[15px] font-semibold sm:h-12 sm:px-6";
const ghost =
  "inline-flex h-12 items-center rounded-full border border-border bg-card px-6 text-[15px] font-semibold transition-colors hover:bg-muted active:scale-[0.98]";

export function Landing({ currency }: { currency: PriceCurrency }) {
  return (
    <LandingMotion className="relative min-h-svh bg-background">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1}>
        <Hero currency={currency} />
        <Problem />
        <HowItWorks currency={currency} />
        <Privacy />
        <Features currency={currency} />
        <Comparison currency={currency} />
        <Pricing currency={currency} />
        <Faq currency={currency} />
        <FinalCta currency={currency} />
      </main>
      <Footer />
    </LandingMotion>
  );
}

/* -------------------------------------------------------------------------- */

function Nav() {
  return (
    <header data-lp-nav className="lp-nav fixed inset-x-0 top-0 z-30">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Oykot Money, home">
          <LogoMark size={30} />
          <Wordmark height={17} />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-1.5">
          <a href="#how" className="lp-nav-link hidden rounded-full px-3 py-2 md:inline-flex">
            How it works
          </a>
          <a href="#pricing" className="lp-nav-link hidden rounded-full px-3 py-2 md:inline-flex">
            Pricing
          </a>
          <Link href="/login" className="lp-nav-link rounded-full px-3 py-2">
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants(), "ml-1 h-10 rounded-full px-4 font-semibold sm:h-10 sm:px-4")}
          >
            Start free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero({ currency }: { currency: PriceCurrency }) {
  return (
    <section data-lp-hero className="relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-16 px-4 pt-28 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-36 lg:pb-28">
        <div>
          <p className="lp-rise inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium">
            <LockKey size={15} weight="bold" className="text-primary" />
            No bank login. Ever.
          </p>
          <h1
            className="lp-rise mt-6 font-heading text-[clamp(2.75rem,6.6vw,5.1rem)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance"
            style={{ animationDelay: "80ms" }}
          >
            Know what&rsquo;s <span className="text-primary">safe</span> to spend today.
          </h1>
          <p
            className="lp-rise mt-6 max-w-[40ch] text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "160ms" }}
          >
            No bank login. No spreadsheets. Just one number every morning that tells you how much
            you can spend without wrecking the month.
          </p>
          <div className="lp-rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/signup" data-lp-magnetic className={cn(buttonVariants(), cta, "group")}>
              Start free for {TRIAL_DAYS} days
              <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href="#how" className={ghost}>
              See how it works
            </a>
          </div>
          <ul
            className="lp-rise mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"
            style={{ animationDelay: "300ms" }}
          >
            <li className="flex items-center gap-1.5">
              <Check size={14} weight="bold" className="text-primary" /> {trialTerms(currency).short}
            </li>
            <li className="flex items-center gap-1.5">
              <Check size={14} weight="bold" className="text-primary" /> Cancel from Settings
            </li>
          </ul>
        </div>

        <div className="lp-rise" style={{ animationDelay: "320ms" }}>
          <div data-lp-hero-card>
            <HeroDemo currency={currency} />
          </div>
        </div>
      </div>

      {/* The three promises, as a ruled strip under the hero. */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <ul className="grid gap-4 border-y border-border py-6 text-sm sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
          {[
            { icon: ShieldCheck, text: "Your bank password never touches us" },
            { icon: Globe, text: `Works in ${Object.keys(CURRENCIES).length} currencies` },
            { icon: DownloadSimple, text: "Export everything, any time" },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 sm:justify-center sm:px-4">
              <Icon size={18} weight="duotone" className="shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Eyebrow({ children, onDark }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p
      data-lp-reveal
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        onDark ? "border-white/20 text-white/80" : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

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
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2
        data-lp-words
        className="mt-4 font-heading text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance"
      >
        {title}
      </h2>
      {children && (
        <p data-lp-reveal className="mt-5 text-lg leading-relaxed text-muted-foreground">
          {children}
        </p>
      )}
    </div>
  );
}

/** A grey panel whose mockup sits above its words, like a product shot on a card. */
function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div data-lp-reveal data-lp-panel className={cn("overflow-hidden rounded-[1.75rem] bg-muted", className)}>
      {children}
    </div>
  );
}

function Problem() {
  return (
    <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:py-32">
      <SectionHead
        eyebrow="The problem"
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
      <div data-lp-reveal>
        <RunsOutChart />
      </div>
    </section>
  );
}

/**
 * The problem as a picture: money left through the month, running out on the
 * 20th while an even pace would have lasted to the 30th. SVG in theme tokens.
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
    <figure data-lp-chart className="rounded-[1.75rem] bg-muted p-2">
      <div className="lp-float-shadow rounded-[1.4rem] border border-border bg-card p-6">
        <figcaption className="flex items-baseline justify-between text-sm">
          <span className="font-semibold">Money left this month</span>
          <span className="text-muted-foreground">1st → 30th</span>
        </figcaption>
        <svg
          viewBox="0 0 300 150"
          className="mt-5 w-full"
          role="img"
          aria-label="Money runs out on the 20th, ten days before the month ends, while an even pace would have lasted."
        >
          <line x1="12" y1="124" x2="288" y2="124" stroke="var(--border)" strokeWidth="1" />
          <line data-lp-fade x1={x(1)} y1="22" x2={x(30)} y2="124" stroke="var(--muted-foreground)" strokeWidth="1.25" strokeDasharray="3 4" opacity="0.6" />
          <path data-lp-fade d={`${path} L${x(20)},124 L${x(1)},124 Z`} fill="var(--primary)" opacity="0.1" />
          <path data-lp-draw pathLength={1} d={path} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line data-lp-draw pathLength={1} x1={x(20)} y1="124" x2={x(30)} y2="124" stroke="var(--destructive)" strokeWidth="3" strokeLinecap="round" />
          <circle data-lp-pop cx={x(20)} cy="124" r="5" fill="var(--destructive)" />
          <text data-lp-late x={x(20)} y="143" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--destructive)">
            20th
          </text>
        </svg>
        <div data-lp-late className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
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
      </div>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

function HowItWorks({ currency }: { currency: PriceCurrency }) {
  const s = SAMPLE[currency];
  const f = (n: number) => mockMoney(n, currency);
  const after = s.daily - s.logged.amount;

  const steps = [
    {
      title: "Add your income.",
      body: "Oykot splits it into needs, wants and investments. 50/30/20, or your own split.",
      visual: (
        <div className="relative w-[230px]">
          <FloatCard>
            <p className="text-[11px] text-muted-foreground">Monthly income</p>
            <p className="mt-0.5 font-heading text-2xl font-bold tracking-tight tabular-nums">{f(s.income)}</p>
          </FloatCard>
          <FloatCard className="relative -mt-3 ml-8">
            <div className="flex h-2 gap-1 overflow-hidden rounded-full">
              <span className="w-1/2 rounded-full" style={{ background: "var(--chart-needs)" }} />
              <span className="w-[30%] rounded-full" style={{ background: "var(--chart-wants)" }} />
              <span className="w-1/5 rounded-full" style={{ background: "var(--chart-investments)" }} />
            </div>
            <div className="mt-2 grid grid-cols-3 text-[10px] tabular-nums">
              <span>Needs<br /><b className="font-semibold">{f(s.income * 0.5)}</b></span>
              <span>Wants<br /><b className="font-semibold">{f(s.income * 0.3)}</b></span>
              <span>Invest<br /><b className="font-semibold">{f(s.income * 0.2)}</b></span>
            </div>
          </FloatCard>
        </div>
      ),
    },
    {
      title: "Log what you spend.",
      body: "One tap, amount, done. Takes about 3 seconds.",
      visual: (
        <div className="relative w-[230px]">
          <FloatCard>
            <div className="flex rounded-full bg-muted p-0.5 text-[10.5px] font-medium">
              <span className="flex-1 rounded-full bg-card py-1 text-center shadow-sm">Spent</span>
              <span className="flex-1 py-1 text-center text-muted-foreground">Received</span>
              <span className="flex-1 py-1 text-center text-muted-foreground">Person</span>
            </div>
            <p className="mt-3 font-heading text-3xl font-bold tracking-tight tabular-nums">{f(s.logged.amount)}</p>
            <div className="mt-2.5 flex gap-1.5">
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-medium">Food</span>
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10.5px] font-medium">Today</span>
            </div>
            <span className="mt-3 block rounded-lg bg-primary py-1.5 text-center text-[11px] font-semibold text-primary-foreground">
              Save
            </span>
          </FloatCard>
          <FloatCard className="absolute -top-3 -right-5 flex items-center gap-1.5 px-2.5 py-1.5">
            <CheckCircle size={14} weight="fill" className="text-positive" />
            <span className="text-[10.5px] font-semibold">Saved</span>
          </FloatCard>
        </div>
      ),
    },
    {
      title: "Check your number.",
      body: "Safe-to-spend updates every day, so you always know what's left.",
      visual: (
        <div className="relative w-[230px]">
          <FloatCard>
            <p className="text-[11px] text-muted-foreground">Safe to spend today</p>
            <p className="mt-0.5 font-heading text-3xl font-bold tracking-tight tabular-nums">
              {f(after)}
              <span className="ml-1 font-sans text-[11px] font-medium text-muted-foreground">/ day</span>
            </p>
            <div data-lp-bars className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div data-lp-bar className="h-full w-[62%] rounded-full bg-primary" />
            </div>
          </FloatCard>
          <FloatCard className="absolute -bottom-4 -left-5 px-2.5 py-1.5 text-[10.5px] font-semibold">
            Updates as you go
          </FloatCard>
        </div>
      ),
    },
  ];

  return (
    <section id="how" className="scroll-mt-20">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
        <SectionHead eyebrow="How it works" title="Three steps. Ten seconds a day." center />
        <ol className="mt-16 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex">
              <Panel className="flex w-full flex-col p-2">
                <div aria-hidden className="grid h-60 place-items-center">
                  <div data-lp-rise>{s.visual}</div>
                </div>
                <div className="px-4 pt-2 pb-5">
                  <span className="text-sm font-bold text-primary tabular-nums">0{i + 1}</span>
                  <h3 className="mt-1 font-heading text-xl font-bold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-muted-foreground">{s.body}</p>
                </div>
              </Panel>
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
    <section className="px-4 sm:px-6">
      {/* The one dark panel on the page, flat Forest: the privacy stance is the
          thing that sets this apart, so it gets the contrast. */}
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 overflow-hidden rounded-[2rem] bg-forest-900 px-6 py-16 text-white sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div>
          <Eyebrow onDark>Privacy</Eyebrow>
          <h2
            data-lp-words
            className="mt-4 font-heading text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.02] font-extrabold tracking-[-0.035em] text-balance"
          >
            Private by design.
            <span className="block text-white/55">Not by promise.</span>
          </h2>
          <p data-lp-reveal className="mt-5 max-w-[46ch] text-lg leading-relaxed text-white/75">
            Most budget apps link to your bank and read every transaction. Oykot never asks. You
            decide what goes in, and none of it is ever sold or shared.
          </p>
        </div>

        <div data-lp-reveal className="rounded-[1.5rem] bg-white/[0.07] p-2">
          <div className="flex items-baseline gap-4 rounded-[1.15rem] bg-white/[0.07] px-6 py-6">
            <span data-lp-zero className="inline-block font-heading text-7xl leading-none font-extrabold text-lemon-400">
              0
            </span>
            <span className="text-white/80">bank logins we&rsquo;ll ever ask you for</span>
          </div>
          <ul className="divide-y divide-white/10 px-6">
            {points.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 py-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lemon-400 text-forest-950">
                  <Icon size={19} weight="bold" />
                </span>
                <span className="font-medium">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function Features({ currency }: { currency: PriceCurrency }) {
  const s = SAMPLE[currency];
  const f = (n: number) => mockMoney(n, currency);
  const head = (title: string, body: string) => (
    <div className="px-6 pt-6">
      <h3 className="font-heading text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
    </div>
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:py-32">
      <SectionHead eyebrow="Features" title="Everything you need. Nothing you'll ignore." />

      <div className="mt-14 grid gap-4 md:grid-cols-6">
        {/* The main one gets the phone, cropped by the panel's edge. */}
        <Panel className="relative md:col-span-4 md:h-[27rem]">
          <div className="grid h-full md:grid-cols-[1fr_300px]">
            <div className="px-6 pt-6 md:pt-8">
              <h3 className="font-heading text-2xl font-bold tracking-tight">Daily safe-to-spend.</h3>
              <p className="mt-2 max-w-xs text-muted-foreground">
                One number, recalculated as you go. Spend less today and tomorrow&rsquo;s gets bigger.
              </p>
            </div>
            <div aria-hidden className="relative mt-8 flex h-72 justify-center overflow-hidden md:mt-0 md:h-auto">
              <div data-lp-rise className="absolute top-2 md:top-10">
                <PhoneFrame>
                  <DailyScreen currency={currency} logged />
                </PhoneFrame>
              </div>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col md:col-span-2">
          {head("Spending pace.", "See if you're ahead or behind before it's too late.")}
          <div aria-hidden className="mt-auto px-6 pt-8 pb-6">
            <div data-lp-rise data-lp-pace className="lp-float-shadow rounded-2xl bg-card p-1">
              <PaceMini />
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col md:col-span-2">
          {head("Needs, wants, investments.", "Budget each group against your target.")}
          <div aria-hidden className="relative mt-auto grid place-items-center px-6 pt-8 pb-8">
            <div data-lp-rise data-lp-bars className="relative">
              <SplitCard className="w-[230px]" />
              <FloatCard className="absolute -right-4 -bottom-4 px-2.5 py-1.5 text-[10.5px] font-semibold tabular-nums">
                Wants: {f(currency === "INR" ? 4_320 : 140)} left
              </FloatCard>
            </div>
          </div>
        </Panel>

        <Panel className="flex flex-col md:col-span-2">
          {head("Your currency, your dates.", `${Object.keys(CURRENCIES).length} currencies and the date format you actually write.`)}
          <div className="mt-auto px-6 pt-8 pb-6">
            <ul aria-label="Supported currencies" className="flex flex-wrap gap-2">
              {Object.entries(CURRENCIES).map(([code, c]) => (
                <li key={code} className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium">
                  <span aria-hidden className="text-muted-foreground">{c.symbol} </span>
                  {code}
                </li>
              ))}
            </ul>
          </div>
        </Panel>

        <Panel className="flex flex-col md:col-span-2">
          {head("Dark mode and light mode.", "Obviously.")}
          {/* Fixed colours, not tokens: this card has to show the *other*
              theme, whichever one you're in. */}
          <div aria-hidden className="relative mt-auto h-40 px-6 pt-6">
            <div data-lp-rise className="relative mx-auto h-full w-[230px]">
              <div className="lp-float-shadow absolute top-0 left-0 w-[150px] -rotate-6 rounded-2xl border border-[#e7e6e2] bg-white p-3.5 text-[#1d1d1b]">
                <Sun size={15} weight="duotone" />
                <p className="mt-2 font-heading text-lg font-bold tabular-nums">{f(s.daily - s.logged.amount)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#ecebe7]">
                  <div className="h-full w-3/5 rounded-full bg-forest-900" />
                </div>
              </div>
              <div className="lp-float-shadow absolute top-5 right-0 w-[150px] rotate-6 rounded-2xl border border-[#2c2c2a] bg-[#171716] p-3.5 text-[#f2f2f0]">
                <Moon size={15} weight="duotone" />
                <p className="mt-2 font-heading text-lg font-bold tabular-nums">{f(s.daily - s.logged.amount)}</p>
                <div className="mt-2 h-1.5 rounded-full bg-[#2c2c2a]">
                  <div className="h-full w-3/5 rounded-full bg-lemon-400" />
                </div>
              </div>
            </div>
          </div>
        </Panel>
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
    { label: "Price", us: `${formatPrice(PRICES[currency].monthly, currency)}/mo`, them: "$8 to $15/mo" },
  ];
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6 lg:py-32">
      <SectionHead eyebrow="Compared" title="How it compares." center />
      <div data-lp-reveal className="mt-12 rounded-[1.75rem] bg-muted p-2">
        <div className="overflow-hidden rounded-[1.4rem] border border-border bg-card">
          <table className="w-full text-left text-sm sm:text-base">
            <caption className="sr-only">Oykot Money compared with a typical budget app</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-4 sm:px-6">
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
            <tbody data-lp-rows className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.label} className="transition-colors hover:bg-muted/50">
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

function Pricing({ currency }: { currency: PriceCurrency }) {
  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6 lg:py-32">
      <SectionHead eyebrow="Pricing" title="One plan. Everything in it." center>
        Free for {TRIAL_DAYS} days. {trialTerms(currency).sentence}
      </SectionHead>
      <div data-lp-reveal className="mt-12">
        {/* The same component as /pricing, so the two can never disagree. */}
        <PricingTable defaultCurrency={currency} viewer="guest" />
      </div>
    </section>
  );
}

const faqFor = (currency: PriceCurrency) => [
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
    a: TRIAL[currency].card
      ? `Your card is charged when the ${TRIAL[currency].days} days are up. Cancel from Settings before then and you pay nothing.`
      : `On day ${TRIAL.INR.autopayFromDay} we'll ask you to set up UPI Autopay. Set it up and your plan starts when the trial ends; skip it and nothing is ever charged.`,
  },
];


function Faq({ currency }: { currency: PriceCurrency }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 lg:py-32">
      <SectionHead eyebrow="FAQ" title="Questions, answered." center>
        Everything worth knowing before you start.
      </SectionHead>
      <div data-lp-reveal className="mt-12">
        <FaqList items={faqFor(currency)} />
      </div>
    </section>
  );
}

function FinalCta({ currency }: { currency: PriceCurrency }) {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] bg-muted px-6 pt-20 text-center sm:pt-24">
        <h2
          data-lp-words
          className="mx-auto max-w-3xl font-heading text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance"
        >
          Stop guessing. <span className="text-muted-foreground">Start knowing.</span>
        </h2>
        <div data-lp-reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/signup" data-lp-magnetic className={cn(buttonVariants(), cta, "group")}>
            Start free for {TRIAL_DAYS} days
            <ArrowRight size={17} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <p data-lp-reveal className="mt-5 text-sm text-muted-foreground">
          No bank login. {trialTerms(currency).sentence}
        </p>
        {/* The phone rises out of the panel's bottom edge and is cut off by it. */}
        <div aria-hidden className="mt-14 flex h-72 justify-center overflow-hidden sm:h-80">
          <div data-lp-rise>
            <PhoneFrame>
              <DailyScreen currency={currency} logged />
            </PhoneFrame>
          </div>
        </div>
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
