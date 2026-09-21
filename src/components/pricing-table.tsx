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

type Viewer = "guest" | "trial" | "expired" | "paid";

/**
 * One plan, so the page can't be a comparison table — which is why it's two
 * panels instead: the plan and its price on one side, everything that's in it
 * on the other. A single narrow card floating in a wide page looked like the
 * cheap tier of something, with the rest missing.
 *
 * The billing toggle lives *inside* the card, next to the figure it changes.
 */
export function PricingTable({
  defaultCurrency,
  viewer,
}: {
  defaultCurrency: PriceCurrency;
  viewer: Viewer;
}) {
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [currency, setCurrency] = useState<PriceCurrency>(defaultCurrency);
  const price = PRICES[currency][period];
  const perMonth = period === "yearly" ? PRICES[currency].yearly / 12 : null;

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={22} />
            <Wordmark height={14} />
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

        <div className="mt-5 flex gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Billing period">
          {(["monthly", "yearly"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={cn(
                "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md text-sm font-medium capitalize transition-colors sm:h-9",
                period === p
                  ? "bg-card text-foreground ring-1 ring-foreground/15"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
              {p === "yearly" && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    period === "yearly" ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                >
                  −{yearlySaving(currency)}%
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mt-6 flex items-baseline gap-1.5">
          <span className="font-heading text-5xl font-extrabold tracking-tight">
            {formatPrice(price, currency)}
          </span>
          <span className="text-sm text-muted-foreground">
            / {period === "yearly" ? "year" : "month"}
          </span>
        </p>
        {/* Fixed height, so switching period doesn't shift the button under it. */}
        <p className="mt-1.5 h-5 text-sm text-muted-foreground">
          {perMonth !== null &&
            `That's ${formatPrice(Math.round(perMonth), currency)} a month, billed once a year.`}
        </p>

        <div className="mt-6">
          {viewer === "guest" && (
            <>
              <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "press w-full")}>
                Start {TRIAL_DAYS}-day free trial
              </Link>
              <p className="mt-2.5 text-center text-xs text-muted-foreground">
                No card needed. Choose a plan before the trial ends.
              </p>
            </>
          )}
          {(viewer === "trial" || viewer === "expired") && (
            <>
              {/* Honest about it: the button exists so the flow is ready, but
                  there's nothing to pay with yet. */}
              <Button size="lg" className="w-full" disabled>
                Upgrade — checkout opens soon
              </Button>
              <p className="mt-2.5 text-center text-xs text-muted-foreground">
                Payments aren&rsquo;t live yet. You keep full access until they are.
              </p>
            </>
          )}
          {viewer === "paid" && (
            <p className="rounded-md bg-muted px-3 py-2.5 text-center text-sm">
              You&rsquo;re all set.
            </p>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent"
        />
        <div className="relative">
          <h2 className="font-heading text-lg font-bold">Everything, in every month</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            There&rsquo;s one plan, so there&rsquo;s nothing held back for a higher tier.
          </p>

          <ul className="mt-5 grid gap-2.5 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {PLAN_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <Check size={16} weight="bold" className="mt-0.5 shrink-0 text-primary" />
                {f}
              </li>
            ))}
          </ul>

          <p className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
            Your budget stays in your own currency whatever you pay in, and you can export all
            of it, any time — including after you stop paying.
          </p>
        </div>
      </div>
    </div>
  );
}
