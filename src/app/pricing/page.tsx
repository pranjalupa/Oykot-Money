import { headers } from "next/headers";
import { Info } from "@phosphor-icons/react/dist/ssr";
import { FaqList } from "@/components/faq-list";
import { PricingTable } from "@/components/pricing-table";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getUser, getUserPrefs } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { priceCurrencyForCountry, TRIAL, TRIAL_DAYS, YEARLY_OFFER } from "@/lib/pricing";
import { formatDay } from "@/lib/dates";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEGAL } from "@/lib/legal";
import { configured as razorpayReady, isTestMode } from "@/lib/payments/razorpay";

export const metadata = { title: "Pricing · Oykot Money" };
export const dynamic = "force-dynamic";

const FAQ = [
  {
    q: "How does the free trial work?",
    a: `${TRIAL_DAYS} days, everything included. In India there's no card: on day ${TRIAL.INR.autopayFromDay} we'll ask you to set up UPI Autopay, and nothing is charged until the ${TRIAL_DAYS} days are up. Everywhere else a card starts the trial and is charged when it ends, unless you cancel before then.`,
  },
  {
    q: "What if I don't continue?",
    a: "Your account becomes read-only. You can still see and export everything, you just can't add to it until you subscribe.",
  },
  { q: "Can I cancel?", a: "Any time, from Settings. You keep access until the end of the period you've paid for." },
  {
    q: "What if I pay for a year and stop using it?",
    a: `Ask within ${YEARLY_OFFER.refundDays} days of the charge and you get the whole year back, no questions. After that you keep access to the end of the year you paid for.`,
  },
  {
    q: "Will the price go up?",
    a: "Not yours. The price you subscribe at is held for as long as the subscription runs without a break.",
  },
  { q: "Do you convert my money between currencies?", a: "No. Your budget stays in the currency you chose; the price you pay is set separately." },
  { q: "Is my data private?", a: "Yes. It's only ever used to run your budget. No ads, no selling it. See the privacy policy." },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string }>;
}) {
  const [{ trial }, user, h] = await Promise.all([searchParams, getUser(), headers()]);
  const [access, prefs] = user ? await Promise.all([getAccess(), getUserPrefs()]) : [null, null];
  const viewer = !access
    ? "guest"
    : access.state === "active" || access.state === "complimentary"
      ? "paid"
      : access.state === "expired"
        ? "expired"
        : access.state === "pending"
          ? "pending"
          : "trial";
  // Signed in, prices follow the region their trial follows (their profile),
  // not wherever their connection happens to be today.
  const currency = access?.priceCurrency ?? priceCurrencyForCountry(h.get("x-vercel-ip-country"));
  const trialEnds =
    access?.state === "trial"
      ? formatDay(access.trialEndsAt.toISOString(), prefs?.locale ?? "en-IN", { day: "numeric", month: "long" })
      : undefined;

  return (
    <div className="min-h-svh">
      {!user && <PublicHeader />}
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        {trial === "ended" && (
          <p className="mx-auto mb-8 flex max-w-md items-start gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
            <Info size={18} weight="duotone" className="mt-0.5 shrink-0" />
            Your free trial has ended. Everything you entered is safe and you can still export
            it. Choose a plan to keep adding.
          </p>
        )}
        <div className="mb-10 text-center">
          <p className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Pricing
          </p>
          <h1 className="mt-4 font-heading text-[clamp(2.2rem,5vw,3.6rem)] leading-[1.02] font-extrabold tracking-[-0.035em]">
            How would you like to pay?
          </h1>
          <p className="mt-4 text-muted-foreground">
            One plan, everything in it. Free for {TRIAL_DAYS} days
            {TRIAL[currency].card ? "." : ", no card."}
          </p>
        </div>

        <PricingTable
          defaultCurrency={currency}
          trialEnds={trialEnds}
          viewer={viewer}
          checkout={{
            razorpay: razorpayReady(),
            polar: Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_PRODUCT_MONTHLY),
            test: isTestMode() || process.env.POLAR_SERVER !== "production",
          }}
          headingLevel={2}
        />

        <section className="mx-auto mt-3 grid max-w-4xl gap-6 rounded-[2rem] bg-muted px-6 py-7 sm:grid-cols-[1fr_auto] sm:items-center sm:px-10">
          <div>
            <h2 className="font-heading text-xl font-bold">Something missing?</h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Budgets are personal, and this one is shaped around how one person keeps theirs.
              If it doesn&rsquo;t fit the way you do it, say so. That&rsquo;s how the next
              version gets decided.
            </p>
          </div>
          <a
            href={`mailto:${LEGAL.email}`}
            className={cn(buttonVariants({ size: "lg" }), "rounded-full px-6 sm:h-11")}
          >
            Tell us what you need
          </a>
        </section>

        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-center font-heading text-[clamp(1.8rem,4vw,2.6rem)] font-extrabold tracking-[-0.03em]">
            Questions, answered.
          </h2>
          <div className="mt-8">
            <FaqList items={FAQ} />
          </div>
        </section>
      </main>
      {!user && <PublicFooter />}
    </div>
  );
}
