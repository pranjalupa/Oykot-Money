"use client";

import { useState } from "react";
import Script from "next/script";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { startCheckout } from "@/app/checkout/actions";
import type { Plan, PriceCurrency } from "@/lib/pricing";

/**
 * One button, two checkouts.
 *
 * Rupees open Razorpay's modal over this page — their flow needs a mandate
 * (UPI autopay or a card e-mandate), so it can't be a plain redirect.
 * Everything else redirects to Polar, who take the payment as merchant of
 * record.
 *
 * The button doesn't know any prices. It asks the server for a checkout, and
 * the server asks the provider — so there's no amount in the browser for
 * anyone to edit.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const DESCRIPTION: Record<Plan, string> = {
  monthly: "Monthly plan",
  yearly: "Yearly plan",
  lifetime: "Lifetime, founding member",
};

export function CheckoutButton({
  plan,
  currency,
  label,
  disabled,
  className,
}: {
  plan: Plan;
  currency: PriceCurrency;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      const result = await startCheckout(plan, currency);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      if (result.provider === "polar") {
        window.location.href = result.url;
        return;
      }

      if (!window.Razorpay) {
        toast.error("Checkout didn't load. Check your connection and try again.");
        return;
      }

      new window.Razorpay({
        key: result.keyId,
        // A one-time lifetime payment is an order; the plans are subscriptions.
        ...(result.orderId ? { order_id: result.orderId } : { subscription_id: result.subscriptionId }),
        name: "Oykot Money",
        description: DESCRIPTION[plan],
        prefill: { name: result.name ?? "", email: result.email ?? "" },
        theme: { color: "#004437" },
        // Nothing is unlocked here. The webhook decides, because this callback
        // runs in a browser we don't control.
        handler: () => {
          toast.success("Payment received — your account updates in a moment.");
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {currency === "INR" && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}
      <Button size="lg" className={cn("w-full", className)} onClick={go} disabled={busy || disabled}>
        {busy ? "Opening checkout…" : label}
      </Button>
    </>
  );
}
