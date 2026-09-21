import { headers } from "next/headers";
import { CaretDown, Info } from "@phosphor-icons/react/dist/ssr";
import { PricingTable } from "@/components/pricing-table";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { getUser } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { priceCurrencyForCountry, TRIAL_DAYS } from "@/lib/pricing";

export const metadata = { title: "Pricing · Oykot Money" };
export const dynamic = "force-dynamic";

const FAQ = [
  {
    q: "What happens when the trial ends?",
    a: "You choose monthly or yearly. If you don't, your account becomes read-only — you can still see and export everything, you just can't add to it until you subscribe.",
  },
  { q: "Can I cancel?", a: "Any time, from Settings. You keep access until the end of the period you've paid for." },
  { q: "Do you convert my money between currencies?", a: "No. Your budget stays in the currency you chose; the price you pay is set separately." },
  { q: "Is my data private?", a: "Yes. It's only ever used to run your budget — no ads, no selling it. See the privacy policy." },
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ trial?: string }>;
}) {
  const [{ trial }, user, h] = await Promise.all([searchParams, getUser(), headers()]);
  const access = user ? await getAccess() : null;
  const viewer = !access
    ? "guest"
    : access.state === "active" || access.state === "complimentary"
      ? "paid"
      : access.state === "expired"
        ? "expired"
        : "trial";

  return (
    <div className="min-h-svh">
      {!user && <PublicHeader />}
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        {trial === "ended" && (
          <p className="mx-auto mb-8 flex max-w-md items-start gap-2 rounded-lg bg-muted px-4 py-3 text-sm">
            <Info size={18} weight="duotone" className="mt-0.5 shrink-0" />
            Your free trial has ended. Everything you entered is safe and you can still export
            it — choose a plan to keep adding.
          </p>
        )}
        <div className="mb-8 text-center sm:mb-10">
          <p className="mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary" />
            {TRIAL_DAYS} days free · no card needed
          </p>
          <h1 className="mt-5 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
            One plan. Everything in it.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pay monthly, or save with yearly. Cancel whenever you like.
          </p>
        </div>

        <PricingTable
          defaultCurrency={priceCurrencyForCountry(h.get("x-vercel-ip-country"))}
          viewer={viewer}
        />

        <section className="mx-auto mt-14 max-w-2xl sm:mt-20">
          <h2 className="text-center font-heading text-xl font-bold">Questions</h2>
          <div className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {/* `name` makes them exclusive: opening one closes the rest, so the
                page never turns into the wall of text it was. All start shut —
                React drops an `open` attribute on hydration anyway. */}
            {FAQ.map((f) => (
              <details key={f.q} name="faq" className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold hover:bg-muted/40">
                  {f.q}
                  <CaretDown
                    size={16}
                    weight="bold"
                    aria-hidden
                    className="shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      {!user && <PublicFooter />}
    </div>
  );
}
