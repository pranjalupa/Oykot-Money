import { headers } from "next/headers";
import { Landing } from "@/components/landing";
import { priceCurrencyForCountry } from "@/lib/pricing";

/**
 * The landing page, served at "/" for anyone signed out — the middleware
 * rewrites to this segment so the address bar never shows /landing.
 *
 * It lives in its own segment only so it can have its own loading.tsx: the
 * root one is the app's skeleton, and it wraps every route beside it.
 */

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Oykot Money · Know what's safe to spend today",
  description:
    "No bank login. No spreadsheets. One number every morning that tells you how much you can spend without wrecking the month.",
};

export default async function LandingPage() {
  const h = await headers();
  return <Landing currency={priceCurrencyForCountry(h.get("x-vercel-ip-country"))} />;
}
