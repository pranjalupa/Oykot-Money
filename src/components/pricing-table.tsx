"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
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
 * Both ways to pay, side by side, rather than one price behind a toggle.
 *
 * A toggle hides the comparison at the moment someone is making it. Two cards
 * put twelve charges next to one, and let the yearly card carry the offer —
 * the months it doesn't charge for, a window to change your mind, and a price
 * that can't rise — in the same glance as its number.
 */
export function PricingTable({
  defaultCurrency,
  viewer,
  checkout,
}: {
  defaultCurrency: PriceCurrency;
  viewer: Viewer;
  /** Which providers are configured, and whether they're in test mode. */
  checkout?: { razorpay: boolean; polar: boolean; test: boolean };
}) {
  const [currency, setCurrency] = useState<PriceCurrency>(defaultCurrency);
  const monthsFree = yearlyMonthsFree(currency);
  const monthsPaid = 12 - monthsFree;
  // A provider that isn't set up shouldn't show a button that can't work.
  const ready = currency === "INR" ? !!checkout?.razorpay : !!checkout?.polar;
  const testMode = !!checkout?.test;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-4 flex justify-center">
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

      {/* The two cards sit in one tray, so they read as a pair of answers to
          the same question rather than two unrelated offers. Yearly is first
          in the markup, not just on screen, so tab order matches the page. */}
      <div className="grid gap-2 rounded-3xl bg-muted p-2 sm:p-3 md:grid-cols-2 md:gap-3">
        <PlanCard
          period="yearly"
          currency={currency}
          viewer={viewer}
          ready={ready}
          testMode={testMode}
          qualifier="per year"
          badge={`${monthsFree} months free`}
          months={{ paid: monthsPaid, free: monthsFree }}
        />
        <PlanCard
          period="monthly"
          currency={currency}
          viewer={viewer}
          ready={ready}
          testMode={testMode}
          qualifier="per month"
          months={{ paid: 12, free: 0 }}
          note={`Month to month, cancel whenever. Full refund inside ${MONTHLY_REFUND_DAYS} days of your first charge.`}
        />
      </div>

      <div className="mt-3 rounded-3xl border border-border px-6 py-5">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          In both plans
        </h3>
        <ul className="mt-3 grid gap-2.5 text-sm sm:grid-cols-2">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Sparkle
                size={14}
                weight="fill"
                aria-hidden
                className="mt-1 shrink-0 text-muted-foreground"
              />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function PlanCard({
  period,
  currency,
  viewer,
  ready,
  testMode,
  qualifier,
  badge,
  months,
  note,
}: {
  period: Period;
  currency: PriceCurrency;
  viewer: Viewer;
  ready: boolean;
  testMode: boolean;
  qualifier: string;
  badge?: string;
  months: { paid: number; free: number };
  note?: string;
}) {
  const yearly = period === "yearly";
  const price = PRICES[currency][period];
  const perMonth = Math.round(PRICES[currency].yearly / 12);

  return (
    <div className="relative flex h-full flex-col rounded-2xl border border-border bg-card p-6">
      <CornerMarks />

      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-xl font-bold capitalize">{period}</h2>
        {badge && (
          <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
            {badge}
          </span>
        )}
      </div>

      <p className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-4xl font-extrabold">{formatPrice(price, currency)}</span>
        <span className="text-sm text-muted-foreground">{qualifier}</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {yearly ? (
          <>
            <span className="line-through">{formatPrice(twelveMonths(currency), currency)}</span> if
            you paid monthly — that&rsquo;s {formatPrice(perMonth, currency)} a month, billed once.
          </>
        ) : (
          <>{formatPrice(twelveMonths(currency), currency)} over a year, in twelve charges.</>
        )}
      </p>

      <MonthsStrip paid={months.paid} free={months.free} />

      <hr className="my-5 border-border" />

      {/* Only what differs between the two. The eight things both plans include
          are listed once, under the pair — printing them twice made the cards
          twice as long and said nothing. */}
      {yearly ? (
        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex items-start gap-2.5">
            <ShieldCheck size={16} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-primary" />
            <span>
              <strong className="font-medium">{YEARLY_OFFER.refundDays} days to change your mind.</strong>{" "}
              Ask inside {YEARLY_OFFER.refundDays} days and the whole year goes back.
            </span>
          </li>
          {YEARLY_OFFER.priceLock && (
            <li className="flex items-start gap-2.5">
              <Lock size={16} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-primary" />
              <span>
                <strong className="font-medium">Your price is locked.</strong> It stays{" "}
                {formatPrice(price, currency)} for as long as you keep the plan.
              </span>
            </li>
          )}
        </ul>
      ) : (
        <p className="max-w-[34ch] text-sm text-muted-foreground">{note}</p>
      )}

      <div className="mt-6 flex-1 pt-1 content-end">
        <PlanAction
          period={period}
          currency={currency}
          viewer={viewer}
          ready={ready}
          testMode={testMode}
        />
      </div>
    </div>
  );
}

/**
 * Twelve ticks, one per month, with the free ones hollow — the offer as a
 * shape rather than a percentage. Decorative: the caption underneath is what
 * carries the meaning, so the ticks stay out of the accessibility tree.
 */
function MonthsStrip({ paid, free }: { paid: number; free: number }) {
  return (
    <div className="mt-4">
      <div aria-hidden className="flex gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-6 flex-1 rounded-sm",
              i < paid ? "bg-primary/70" : "border border-dashed border-primary/50",
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

/** The corner ticks that give each card its drawn, plotted look. */
function CornerMarks() {
  return (
    <span aria-hidden>
      {["left-2.5 top-2.5", "right-2.5 top-2.5", "left-2.5 bottom-2.5", "right-2.5 bottom-2.5"].map(
        (pos) => (
          <span key={pos} className={cn("absolute size-1 rounded-full bg-foreground/15", pos)} />
        ),
      )}
    </span>
  );
}

function PlanAction({
  period,
  currency,
  viewer,
  ready,
  testMode,
}: {
  period: Period;
  currency: PriceCurrency;
  viewer: Viewer;
  ready: boolean;
  testMode: boolean;
}) {
  if (viewer === "paid") {
    return (
      <p className="rounded-full bg-muted px-3 py-2.5 text-center text-sm">You&rsquo;re all set.</p>
    );
  }

  if (viewer === "guest") {
    return (
      <>
        <Link
          href="/signup"
          className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full sm:h-11")}
        >
          Start {TRIAL_DAYS}-day free trial
        </Link>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          No card needed. Pick a plan before the trial ends.
        </p>
      </>
    );
  }

  if (!ready) {
    // Honest about it: the flow is built, but there's nothing to pay with yet.
    return (
      <>
        <Button className="w-full rounded-full sm:h-11" size="lg" disabled>
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
        className="rounded-full sm:h-11"
      />
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {testMode ? "Test mode — no real money moves." : "Cancel any time from Settings."}
      </p>
    </>
  );
}
