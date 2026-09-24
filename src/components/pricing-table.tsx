"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
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
 * Both ways to pay in one container, after the Starter/Team reference:
 * Monthly on white, Yearly on grey with the badge — the highlighted column.
 *
 * Yearly lists only what it adds ("Everything in Monthly, plus"), so the
 * app's features appear once and the offer is the whole of yearly's column:
 * the months it doesn't charge for, a window to change your mind, a price
 * that can't rise.
 */
export function PricingTable({
  defaultCurrency,
  viewer,
  checkout,
  headingLevel = 3,
}: {
  defaultCurrency: PriceCurrency;
  viewer: Viewer;
  /** Which providers are configured, and whether they're in test mode. */
  checkout?: { razorpay: boolean; polar: boolean; test: boolean };
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
            action={<PlanAction period="yearly" primary {...{ currency, viewer, ready, testMode }} />}
            className="rounded-[1.6rem] bg-muted"
          />
        </div>
      </div>

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

      {note && <p className="mt-auto pt-8 text-xs text-muted-foreground">{note}</p>}
    </section>
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
