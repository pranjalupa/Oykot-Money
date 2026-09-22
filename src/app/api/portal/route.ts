import { CustomerPortal } from "@polar-sh/nextjs";
import { requireUser } from "@/lib/auth";

/**
 * Polar's customer portal — where someone changes their card or cancels.
 *
 * The customer is resolved from the signed-in session, never from a query
 * parameter: taking an id from the URL would let anyone open anyone else's
 * billing.
 */
export const GET = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
  // `getExternalCustomerId`, not `getCustomerId`: ours is the id we sent as
  // `customerExternalId` at checkout, not the one Polar minted.
  getExternalCustomerId: async () => {
    const user = await requireUser();
    return user.id;
  },
  server: process.env.POLAR_SERVER === "production" ? "production" : "sandbox",
});
