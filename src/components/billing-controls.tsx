"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { cancelRupeeSubscription } from "@/app/settings/billing-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Cancelling, for whoever bills the account.
 *
 * Polar has a hosted portal that handles cards and cancellation, so dollar
 * customers get a link to it. Razorpay has no such page, so rupee customers
 * get a button here. Either way it's reachable from Settings in two taps —
 * cancelling has to be as easy as subscribing was.
 */
export function BillingControls({
  provider,
  periodEnd,
}: {
  provider: "razorpay" | "mor";
  /** Preformatted — the server knows the user's locale, this doesn't. */
  periodEnd: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (provider === "mor") {
    return (
      // A route handler that redirects to Polar, not a page: <Link> would try
      // to prefetch and client-navigate it. A full navigation is the point.
      // eslint-disable-next-line @next/next/no-html-link-for-pages
      <a href="/api/portal" className="mt-3 inline-flex text-sm font-medium underline underline-offset-4">
        Manage or cancel your plan
      </a>
    );
  }

  function confirm() {
    start(async () => {
      const result = await cancelRupeeSubscription();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Cancelled. You keep everything until the end of this period.");
      setOpen(false);
    });
  }

  return (
    <>
      <Button variant="outline" className="mt-3" onClick={() => setOpen(true)}>
        Cancel plan
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel your plan?</DialogTitle>
            <DialogDescription>
              You won&rsquo;t be charged again.
              {periodEnd ? ` Everything stays as it is until ${periodEnd}` : " Everything stays as it is to the end of this period"}
              , and your data is always yours to export.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Keep my plan
            </Button>
            <Button variant="destructive" onClick={confirm} disabled={pending}>
              {pending ? "Cancelling…" : "Cancel plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
