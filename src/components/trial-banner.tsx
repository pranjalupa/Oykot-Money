import Link from "next/link";
import { Info } from "@phosphor-icons/react/dist/ssr";
import type { AccessState } from "@/lib/access";
import { cn } from "@/lib/utils";

/**
 * One quiet line about where the account stands. Nothing shows once someone
 * pays, and nothing ever blocks the page — it points at pricing and gets out
 * of the way.
 */
export function TrialBanner({
  state,
  daysLeft,
  enforced,
}: {
  state: AccessState;
  daysLeft: number | null;
  enforced: boolean;
}) {
  if (state === "active" || state === "complimentary") return null;

  const urgent = state === "expired" || state === "grace" || (daysLeft !== null && daysLeft <= 3);
  const message =
    state === "trial"
      ? `Free trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
      : state === "grace"
        ? "Your last payment didn't go through — update it to keep full access."
        : enforced
          ? "Your trial has ended. You can still view and export everything."
          : "Your trial has ended. Oykot stays fully open until payments launch.";

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
        {state === "trial" ? "See plans" : "Choose a plan"}
      </Link>
    </div>
  );
}
