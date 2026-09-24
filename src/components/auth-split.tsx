import Link from "next/link";
import { headers } from "next/headers";
import { Check, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { DailyScreen, FloatCard, PhoneFrame, SAMPLE, SplitCard, mockMoney } from "@/components/landing-mockups";
import { LogoMark, Wordmark } from "@/components/logo";
import { LEGAL } from "@/lib/legal";
import { TRIAL, TRIAL_DAYS, priceCurrencyForCountry } from "@/lib/pricing";

/**
 * Sign in and sign up, after the Kravio / workspace references: the form in a
 * white container with the logo in its corner and a quiet footer, and beside
 * it a grey panel with a statement and the app on a phone, cropped by the
 * panel's bottom edge.
 *
 * No testimonial, though the references have one: there are no customers to
 * quote yet, and an invented quote is a fake review. The statement is ours.
 *
 * The panel only appears from `lg` up. On a phone the form is the whole
 * screen, which is what you want when you're typing a password with one thumb.
 */
export async function AuthSplit({ children }: { children: React.ReactNode }) {
  const currency = priceCurrencyForCountry((await headers()).get("x-vercel-ip-country"));
  const s = SAMPLE[currency];

  return (
    <div className="min-h-svh bg-muted lg:p-3">
      <div className="grid min-h-svh bg-card lg:min-h-[calc(100svh-1.5rem)] lg:grid-cols-2 lg:rounded-[2rem] lg:border lg:border-border lg:p-2">
        <div className="flex flex-col px-5 py-5 sm:px-10 sm:py-7">
          <header className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5" aria-label="Oykot Money, home">
              <LogoMark size={30} />
              <Wordmark height={17} />
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Pricing
            </Link>
          </header>

          <main id="main" className="flex flex-1 items-center justify-center py-12">
            {children}
          </main>

          <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Oykot Money</p>
            <p>
              Need help?{" "}
              <a href={`mailto:${LEGAL.email}`} className="font-medium text-foreground hover:underline">
                Contact us
              </a>
            </p>
          </footer>
        </div>

        <aside
          aria-label="About Oykot Money"
          className="relative hidden flex-col overflow-hidden rounded-[1.6rem] bg-muted lg:flex"
        >
          <div className="px-10 pt-12 xl:px-14">
            <p className="max-w-md font-heading text-[2rem] leading-[1.12] font-bold tracking-[-0.025em]">
              Always know <span className="text-muted-foreground">what&rsquo;s</span> safe to spend,{" "}
              <span className="text-muted-foreground">before you spend it.</span>
            </p>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                TRIAL[currency].card ? `Free for ${TRIAL_DAYS} days` : `Free for ${TRIAL_DAYS} days, no card`,
                "No bank login",
                "Export any time",
              ].map((p) => (
                <li key={p} className="flex items-center gap-1.5">
                  <Check size={14} weight="bold" className="text-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* The app on a phone, rising out of the panel's bottom edge. */}
          <div aria-hidden className="relative mt-12 flex min-h-[22rem] flex-1 justify-center overflow-hidden">
            {/* Top-aligned in a box that fills the rest of the panel, so the
                phone runs off the bottom edge however tall the window is. */}
            <div className="absolute top-0">
              <PhoneFrame>
                <DailyScreen currency={currency} logged />
              </PhoneFrame>
              <div className="absolute top-16 -left-36">
                <FloatCard className="flex items-center gap-2.5 py-2.5 pr-4">
                  <CheckCircle size={22} weight="fill" className="shrink-0 text-positive" />
                  <span className="leading-tight">
                    <span className="block text-[12.5px] font-semibold">Logged in 3 seconds</span>
                    <span className="block text-[11px] text-muted-foreground tabular-nums">
                      {s.logged.name} · −{mockMoney(s.logged.amount, currency)}
                    </span>
                  </span>
                </FloatCard>
              </div>
              <div className="absolute top-44 -right-40">
                <SplitCard />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
