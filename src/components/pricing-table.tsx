"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  PLAN_FEATURES,
  PRICES,
  TRIAL_DAYS,
  formatPrice,
  yearlySaving,
  type PriceCurrency,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";
import { CheckoutButton } from "@/components/checkout-button";

type Viewer = "guest" | "trial" | "expired" | "paid";

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
  const price = PRICES[currency][period];
  const perMonth = period === "yearly" ? PRICES[currency].yearly / 12 : null;
  // A provider that isn't set up shouldn't show a button that can't work.
  const checkoutReady = currency === "INR" ? !!checkout?.razorpay : !!checkout?.polar;
  const testMode = !!checkout?.test;

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
                <span className="ml-1.5 text-xs text-muted-foreground">−{yearlySaving(currency)}%</span>
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
        <p className="mt-3 flex items-baseline gap-1.5">
          <span className="font-heading text-4xl font-extrabold">{formatPrice(price, currency)}</span>
          <span className="text-sm text-muted-foreground">/ {period === "yearly" ? "year" : "month"}</span>
        </p>
        <p className="mt-1 h-5 text-xs text-muted-foreground">
          {perMonth !== null &&
            `That's ${formatPrice(Math.round(perMonth), currency)} a month, billed once a year.`}
        </p>

        <ul className="mt-5 flex flex-col gap-2.5 text-sm">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6">
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
          {(viewer === "trial" || viewer === "expired") &&
            (checkoutReady ? (
              <>
                <CheckoutButton
                  plan={period}
                  currency={currency}
                  label={`Subscribe ${period === "yearly" ? "yearly" : "monthly"}`}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  {testMode
                    ? "Test mode — no real money moves."
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
