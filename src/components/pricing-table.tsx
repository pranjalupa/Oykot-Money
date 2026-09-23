"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Lock, ShieldCheck } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
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
import { LogoMark, Wordmark } from "@/components/logo";
import { CheckoutButton } from "@/components/checkout-button";

type Viewer = "guest" | "trial" | "expired" | "paid";

/**
 * One plan, two billing periods, and an offer that points at the yearly one.
 *
 * The offer is a saving said in **months** rather than a percentage, plus the
 * two things that actually answer "what if I stop using it": a month to change
 * your mind, and a price that can't rise under you. Percentages argue; those
 * remove the risk of committing to a year.
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
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [currency, setCurrency] = useState<PriceCurrency>(defaultCurrency);
  const yearly = period === "yearly";
  const price = PRICES[currency][period];
  const perMonth = yearly ? Math.round(PRICES[currency].yearly / 12) : null;
  const monthsFree = yearlyMonthsFree(currency);
  // A provider that isn't set up shouldn't show a button that can't work.
  const checkoutReady = currency === "INR" ? !!checkout?.razorpay : !!checkout?.polar;
  const testMode = !!checkout?.test;
  const canBuy = viewer === "trial" || viewer === "expired";

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Billing period">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                period === p
                  ? "bg-card text-foreground ring-1 ring-foreground/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
              {p === "yearly" && (
                <span className="ml-1.5 text-xs text-muted-foreground">Best value</span>
              )}
            </button>
          ))}
        </div>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as PriceCurrency)}
          aria-label="Currency"
          className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <option value="INR">₹ INR</option>
          <option value="USD">$ USD</option>
        </select>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <Wordmark height={14} />
        </div>

        {/* The headline of the offer sits above the figure it explains. */}
        <p className="mt-3 h-6">
          {yearly && (
            <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              {monthsFree} months free
            </span>
          )}
        </p>

        <p className="mt-2 flex items-baseline gap-1.5">
          <span className="font-heading text-4xl font-extrabold">{formatPrice(price, currency)}</span>
          <span className="text-sm text-muted-foreground">/ {yearly ? "year" : "month"}</span>
          {yearly && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(twelveMonths(currency), currency)}
            </span>
          )}
        </p>
        <p className="mt-1 h-5 text-xs text-muted-foreground">
          {perMonth !== null &&
            `That's ${formatPrice(perMonth, currency)} a month, billed once a year.`}
        </p>

        {/* What you get for committing, beyond the smaller number. */}
        {yearly && (
          <ul className="mt-4 flex flex-col gap-2 rounded-lg bg-muted/60 p-3 text-sm">
            <li className="flex items-start gap-2.5">
              <ShieldCheck size={16} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
              <span>
                <strong className="font-medium">{YEARLY_OFFER.refundDays} days to change your mind.</strong>{" "}
                Ask inside a month and you get the whole year back.
              </span>
            </li>
            {YEARLY_OFFER.priceLock && (
              <li className="flex items-start gap-2.5">
                <Lock size={16} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
                <span>
                  <strong className="font-medium">Your price is locked.</strong> It stays{" "}
                  {formatPrice(price, currency)} for as long as you keep the plan, whatever we
                  charge later.
                </span>
              </li>
            )}
          </ul>
        )}

        <ul className="mt-5 flex flex-col gap-2.5 text-sm">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          {/* The one place the choice is still open: offer the swap rather than
              hiding monthly, so it's a nudge and not a dark pattern. */}
          {!yearly && canBuy && (
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              /* The visible text is split across spans for emphasis, which left
                 the button with no computed name. Say it once, plainly. */
              aria-label={`Switch to yearly and get ${monthsFree} months free`}
              className="mb-3 flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span>
                <strong className="font-medium text-primary">Get {monthsFree} months free</strong>{" "}
                <span className="text-muted-foreground">
                  — pay yearly for {formatPrice(PRICES[currency].yearly, currency)}
                </span>
              </span>
              <ArrowRight size={16} weight="bold" className="shrink-0 text-primary" />
            </button>
          )}

          {viewer === "guest" && (
            <>
              <Link href="/signup" className={cn(buttonVariants(), "w-full")}>
                Start {TRIAL_DAYS}-day free trial
              </Link>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                No card needed. Choose a plan before the trial ends.
              </p>
            </>
          )}
          {canBuy &&
            (checkoutReady ? (
              <>
                <CheckoutButton
                  plan={period}
                  currency={currency}
                  label={yearly ? "Subscribe yearly" : "Subscribe monthly"}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {testMode
                    ? "Test mode — no real money moves."
                    : yearly
                      ? `Cancel any time. Full refund inside ${YEARLY_OFFER.refundDays} days.`
                      : "Cancel any time from Settings."}
                </p>
              </>
            ) : (
              <>
                {/* Honest about it: the button exists so the flow is ready, but
                    there's nothing to pay with yet. */}
                <Button className="w-full" disabled>
                  Upgrade — checkout opens soon
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Payments aren&rsquo;t live yet. You keep full access until they are.
                </p>
              </>
            ))}
          {viewer === "paid" && (
            <p className="rounded-md bg-muted px-3 py-2 text-center text-sm">You&rsquo;re all set.</p>
          )}
        </div>
      </div>
    </div>
  );
}
