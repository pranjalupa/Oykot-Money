import Link from "next/link";
import { Info } from "@phosphor-icons/react/dist/ssr";
import type { AccessState } from "@/lib/access";
import { cn } from "@/lib/utils";

/**
 * One quiet line about where the account stands. Nothing shows once someone
 * pays, and nothing ever blocks the page — it points at pricing and gets out
 * of the way.
 *
 * In India it also carries the one ask the trial makes: from day 6, set up UPI
 * Autopay so the budget carries on when the 7 days end. Nothing is charged
 * before then — the subscription it creates starts at the trial's end.
 */
export function TrialBanner({
  state,
  daysLeft,
  enforced,
  autopayDue = false,
  trialEnds,
}: {
  state: AccessState;
  daysLeft: number | null;
  enforced: boolean;
  /** India, day 6 or 7 of the trial, no Autopay yet. */
  autopayDue?: boolean;
  /** The trial's last day, formatted for the user. */
  trialEnds?: string;
}) {
  if (state === "active" || state === "complimentary") return null;

  const urgent =
    autopayDue || state === "expired" || state === "grace" || (daysLeft !== null && daysLeft <= 3);

  const message = autopayDue
    ? `Your trial ends ${trialEnds}. Set up UPI Autopay so your budget carries on. Nothing is charged before then.`
    : state === "trial"
      ? `Free trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
      : state === "pending"
        ? enforced
          ? "Start your 7-day free trial to keep adding. You can still view and export everything."
          : "Your 7-day free trial starts when you add a card. Oykot stays fully open until payments launch."
        : state === "grace"
          ? "Your last payment didn't go through. Update it to keep full access."
          : enforced
            ? "Your trial has ended. You can still view and export everything."
            : "Your trial has ended. Oykot stays fully open until payments launch.";

  const action = autopayDue
    ? "Set up Autopay"
    : state === "pending"
      ? "Start free trial"
      : state === "trial"
        ? "See plans"
        : "Choose a plan";

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-2.5 text-sm",
        urgent ? "bg-destructive/10 text-foreground" : "bg-muted text-muted-foreground",
      )}
    >
      <span className="flex items-center gap-2">
        <Info size={16} weight="duotone" className="shrink-0" />
        {message}
      </span>
      <Link href="/pricing" className="font-medium text-foreground underline underline-offset-4">
        {action}
      </Link>
    </div>
  );
}
