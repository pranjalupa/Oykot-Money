import Link from "next/link";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { LogoMark, Wordmark } from "@/components/logo";
import { DailyPreviewCard } from "@/components/product-preview";
import { TRIAL_DAYS } from "@/lib/pricing";

/**
 * Sign in and sign up: the form on one side, the product on the other.
 *
 * The panel only appears from `lg` up, where the width is going spare anyway —
 * on a phone the form is the whole screen, which is what you want when you're
 * typing a password with one thumb.
 */
export function AuthSplit({ children }: { children: React.ReactNode }) {
  const points = [
    `Free for ${TRIAL_DAYS} days, no card`,
    "Your currency, your date format",
    "Export everything, any time",
  ];

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-14 sm:py-16">{children}</div>

      <aside className="relative hidden flex-col justify-center overflow-hidden border-l border-border bg-card px-10 lg:flex">
        {/* One wash of Forest behind the panel. Surfaces stay Stone, per the
            token rules — this is emphasis, not a green room. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-transparent"
        />

        <div className="relative mx-auto w-full max-w-sm">
          <Link href="/" className="flex items-center gap-2" aria-label="Oykot Money">
            <LogoMark size={28} />
            <Wordmark height={17} />
          </Link>

          <p className="mt-6 font-heading text-2xl leading-snug font-bold">
            Always know what&rsquo;s left.
          </p>

          <div className="mt-7">
            <DailyPreviewCard />
          </div>

          <ul className="mt-7 space-y-2.5 text-sm text-muted-foreground">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <Check size={14} weight="bold" className="shrink-0 text-primary" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
