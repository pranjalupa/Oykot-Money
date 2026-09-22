import { Checkout } from "@polar-sh/nextjs";

/**
 * Polar's hosted checkout. The adapter creates the session and redirects, so
 * the card is only ever entered on Polar's page — this app never sees one.
 *
 * `server` follows POLAR_SERVER: "sandbox" while testing, "production" when
 * it's real money. Getting that wrong is the classic way to take a live
 * payment during a test, so it's explicit rather than inferred.
 */
export const GET = Checkout({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  successUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/settings?paid=1`,
  server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
});
