"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  LIFETIME_SEATS,
  MONTHLY_REFUND_DAYS,
  PLAN_FEATURES,
  PRICES,
  TRIAL_DAYS,
  YEARLY_OFFER,
  formatPrice,
  twelveMonths,
  yearlyMonthsFree,
  type PriceCurrency,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { CheckoutButton } from "@/components/checkout-button";

type Viewer = "guest" | "trial" | "expired" | "paid";
type Period = "monthly" | "yearly";

/**
 * Both ways to pay in one container, after the Starter/Team reference:
 * Monthly on white, Yearly on grey with the badge — the highlighted column.
 *
 * Yearly lists only what it adds ("Everything in Monthly, plus"), so the
 * app's features appear once and the offer is the whole of yearly's column:
 * the months it doesn't charge for, a window to change your mind, a price
 * that can't rise. Where the reference has illustrations, each column ends
 * with the twelve months drawn as ticks — the free ones hollow.
 *
 * Lifetime, when seats remain, is the full-width panel underneath.
 */
export function PricingTable({
  defaultCurrency,
  viewer,
  checkout,
  lifetimeSeats = 0,
  headingLevel = 3,
}: {
  defaultCurrency: PriceCurrency;
  viewer: Viewer;
  /** Which providers are configured, and whether they're in test mode. */
  checkout?: {
    razorpay: boolean;
    polar: boolean;
    test: boolean;
    lifetime?: { INR: boolean; USD: boolean };
  };
  /** Founding lifetime seats left. At 0 the tier isn't offered at all. */
  lifetimeSeats?: number;
  /**
   * The plan names' heading level: 3 under the landing's "One plan" h2, 2 on
   * /pricing where the page's h1 is the only heading above them.
   */
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const [currency, setCurrency] = useState<PriceCurrency>(defaultCurrency);
  const monthsFree = yearlyMonthsFree(currency);
  // A provider that isn't set up shouldn't show a button that can't work.
  const ready = currency === "INR" ? !!checkout?.razorpay : !!checkout?.polar;
  const testMode = !!checkout?.test;
  const perMonth = Math.round(PRICES[currency].yearly / 12);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-5 flex justify-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Pay in
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as PriceCurrency)}
            className="h-11 rounded-full border border-input bg-card px-3.5 text-sm text-foreground shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:h-9"
          >
            <option value="INR">₹ Rupees</option>
            <option value="USD">$ Dollars</option>
          </select>
        </label>
      </div>

      {viewer === "paid" && (
        <p className="mb-4 rounded-2xl bg-muted px-4 py-3 text-center text-sm font-medium">
          You&rsquo;re all set. These are the plans, for reference.
        </p>
      )}

      <div className="rounded-[2rem] border border-border bg-card p-2">
        <div className="grid md:grid-cols-2">
          <Column
            H={H}
            period="monthly"
            title="Monthly"
            tagline="Month to month. Cancel whenever."
            price={formatPrice(PRICES[currency].monthly, currency)}
            unit={["per month", "billed monthly"]}
            listLabel="What’s in it:"
            list={PLAN_FEATURES}
            months={{ paid: 12, free: 0 }}
            action={<PlanAction period="monthly" {...{ currency, viewer, ready, testMode }} />}
            note={`Full refund inside ${MONTHLY_REFUND_DAYS} days of your first charge.`}
          />
          <Column
            H={H}
            period="yearly"
            title="Yearly"
            badge={`${monthsFree} months free`}
            tagline="Best value. One charge a year."
            price={formatPrice(PRICES[currency].yearly, currency)}
            unit={["per year", `that’s ${formatPrice(perMonth, currency)} a month`]}
            struck={formatPrice(twelveMonths(currency), currency)}
            listLabel="Everything in Monthly, plus:"
            list={[
              `${monthsFree} months free, against paying monthly`,
              `Full refund inside ${YEARLY_OFFER.refundDays} days`,
              ...(YEARLY_OFFER.priceLock ? ["Your price is locked for as long as you stay"] : []),
              "One charge a year, nothing to remember",
            ]}
            months={{ paid: 12 - monthsFree, free: monthsFree }}
            action={<PlanAction period="yearly" primary {...{ currency, viewer, ready, testMode }} />}
            className="rounded-[1.6rem] bg-muted"
          />
        </div>
      </div>

      {lifetimeSeats > 0 && (
        <LifetimePanel
          H={H}
          currency={currency}
          viewer={viewer}
          seatsLeft={lifetimeSeats}
          ready={!!checkout?.lifetime?.[currency]}
          testMode={testMode}
        />
      )}
    </div>
  );
}

function Column({
  H,
  period,
  title,
  badge,
  tagline,
  price,
  unit,
  struck,
  listLabel,
  list,
  months,
  action,
  note,
  className,
}: {
  H: "h2" | "h3";
  period: Period;
  title: string;
  badge?: string;
  tagline: string;
  price: string;
  unit: [string, string];
  struck?: string;
  listLabel: string;
  list: readonly string[];
  months: { paid: number; free: number };
  action: React.ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <section aria-label={`${title} plan`} className={cn("flex flex-col p-6 sm:p-8", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <H className="font-heading text-xl font-bold">{title}</H>
        {badge && (
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>

      <div className="mt-6 flex items-end gap-2.5">
        <span className="font-heading text-5xl leading-none font-extrabold tracking-[-0.03em] tabular-nums">
          {price}
        </span>
        <span className="pb-0.5 text-xs leading-tight text-muted-foreground">
          {unit[0]}
          <br />
          {unit[1]}
        </span>
      </div>
      <p className="mt-2 h-4 text-xs text-muted-foreground">
        {struck && (
          <>
            <span className="line-through">{struck}</span> if you paid monthly
          </>
        )}
      </p>

      <div className="mt-6">{action}</div>

      <p className="mt-7 text-sm font-semibold">{listLabel}</p>
      <ul className="mt-3 flex flex-col gap-2.5 text-sm">
        {list.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <span
              className={cn(
                "mt-0.5 grid size-4 shrink-0 place-items-center rounded-[5px]",
                period === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
              )}
            >
              <Check size={10} weight="bold" />
            </span>
            {item}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        <MonthsStrip paid={months.paid} free={months.free} />
        {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
      </div>
    </section>
  );
}

/**
 * Twelve ticks, one per month, with the free ones hollow — the offer as a
 * shape rather than a percentage. Decorative; the caption carries the meaning.
 */
function MonthsStrip({ paid, free }: { paid: number; free: number }) {
  return (
    <div>
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-7 flex-1 rounded-[5px]",
              i < paid ? "bg-primary/75" : "border-[1.5px] border-dashed border-primary/55",
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {free > 0 ? `${paid} months paid, ${free} free` : "Twelve months, twelve charges"}
      </p>
    </div>
  );
}

const fullButton = "h-12 w-full rounded-xl text-[15px] font-semibold sm:h-12";
const quietButton = "border-border bg-card text-foreground hover:bg-muted";

function PlanAction({
  period,
  primary = false,
  currency,
  viewer,
  ready,
  testMode,
}: {
  period: Period;
  /** The recommended column gets the filled button; the other is quieter. */
  primary?: boolean;
  currency: PriceCurrency;
  viewer: Viewer;
  ready: boolean;
  testMode: boolean;
}) {
  const tone = primary ? "" : quietButton;

  if (viewer === "paid") return null;

  if (viewer === "guest") {
    return (
      <>
        <Link href="/signup" className={cn(buttonVariants(), fullButton, tone)}>
          Start {TRIAL_DAYS}-day free trial
        </Link>
        <p className="mt-2 text-center text-xs text-muted-foreground">No card needed.</p>
      </>
    );
  }

  if (!ready) {
    // Honest about it: the flow is built, but there's nothing to pay with yet.
    return (
      <>
        <Button className={cn(fullButton, tone)} disabled>
          Checkout opens soon
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Payments aren&rsquo;t live yet. You keep full access until they are.
        </p>
      </>
    );
  }

  return (
    <>
      <CheckoutButton
        plan={period}
        currency={currency}
        label={period === "yearly" ? "Pay for a year" : "Pay monthly"}
        className={cn(fullButton, tone)}
      />
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {testMode ? "Test mode. No real money moves." : "Cancel any time from Settings."}
      </p>
    </>
  );
}

/**
 * Lifetime, as the full-width panel under the pair — the slot the reference
 * gives its "something else" offer. Flat Forest: it's the one tier worth a
 * different surface, because it's scarce and the seat count says so honestly.
 *
 * The count is live (`lifetimeSeatsLeft()`), and the panel isn't rendered at
 * all once it reaches zero, so "first 100" is enforced rather than claimed.
 */
function LifetimePanel({
  H,
  currency,
  viewer,
  seatsLeft,
  ready,
  testMode,
}: {
  H: "h2" | "h3";
  currency: PriceCurrency;
  viewer: Viewer;
  seatsLeft: number;
  ready: boolean;
  testMode: boolean;
}) {
  const taken = LIFETIME_SEATS - seatsLeft;
  const yearsToPayOff = PRICES[currency].lifetime / PRICES[currency].yearly;

  return (
    <section
      aria-label="Lifetime plan"
      className="mt-3 grid gap-6 rounded-[2rem] bg-forest-900 px-6 py-7 text-white sm:px-10 md:grid-cols-[1fr_auto] md:items-end"
    >
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <H className="font-heading text-xl font-bold">Lifetime</H>
          <span className="rounded-full bg-lemon-400 px-2.5 py-0.5 text-xs font-semibold text-forest-950">
            Founding members
          </span>
        </div>
        <p className="mt-4 flex items-end gap-2.5">
          <span className="font-heading text-5xl leading-none font-extrabold tracking-[-0.03em] tabular-nums">
            {formatPrice(PRICES[currency].lifetime, currency)}
          </span>
          <span className="pb-0.5 text-xs leading-tight text-white/70">
            once
            <br />
            yours for good
          </span>
        </p>
        <p className="mt-3 max-w-md text-sm text-white/75">
          It costs about {Math.round(yearsToPayOff)} years of the yearly plan, and every update after
          is included. Full refund inside {YEARLY_OFFER.refundDays} days.
        </p>

        <div className="mt-5 max-w-sm">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/15"
            role="img"
            aria-label={`${taken} of ${LIFETIME_SEATS} founding seats taken`}
          >
            <div
              className="h-full rounded-full bg-lemon-400"
              style={{ width: `${Math.max(2, (taken / LIFETIME_SEATS) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/70">
            {seatsLeft} of {LIFETIME_SEATS} founding seats left. When they&rsquo;re gone, this goes.
          </p>
        </div>
      </div>

      <div className="md:w-64">
        <LifetimeAction viewer={viewer} ready={ready} currency={currency} testMode={testMode} />
      </div>
    </section>
  );
}

function LifetimeAction({
  viewer,
  ready,
  currency,
  testMode,
}: {
  viewer: Viewer;
  ready: boolean;
  currency: PriceCurrency;
  testMode: boolean;
}) {
  const lemon = "h-12 w-full rounded-xl bg-lemon-400 text-[15px] font-semibold text-forest-950 hover:bg-lemon-300 sm:h-12";
  if (viewer === "paid") {
    return <p className="text-sm text-white/75">Lifetime is for accounts without a running plan.</p>;
  }
  if (viewer === "guest") {
    return (
      <Link href="/signup" className={cn(buttonVariants(), lemon)}>
        Start free, decide later
      </Link>
    );
  }
  if (!ready) {
    return (
      <Button className={lemon} disabled>
        Checkout opens soon
      </Button>
    );
  }
  return (
    <>
      <CheckoutButton plan="lifetime" currency={currency} label="Pay once" className={lemon} />
      {testMode && <p className="mt-2 text-center text-xs text-white/70">Test mode. No real money moves.</p>}
    </>
  );
}
