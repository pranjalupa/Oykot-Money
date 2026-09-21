import { Suspense } from "react";
import { headers } from "next/headers";
import { AuthForm } from "@/components/auth-form";
import { AuthSplit } from "@/components/auth-split";
import { getEnabledProviders } from "@/lib/supabase/providers";
import { currencyForCountry } from "@/lib/currency";

export const metadata = { title: "Create account · Oykot Money" };

export default async function SignupPage() {
  const { google } = await getEnabledProviders();
  // Vercel sets this on every request; absent locally, which falls back to ₹.
  const country = (await headers()).get("x-vercel-ip-country");

  return (
    <AuthSplit>
      <Suspense>
        <AuthForm
          mode="signup"
          googleEnabled={google}
          defaultCurrency={currencyForCountry(country)}
        />
      </Suspense>
    </AuthSplit>
  );
}
