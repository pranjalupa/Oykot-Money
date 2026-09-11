import { Suspense } from "react";
import { headers } from "next/headers";
import { AuthForm } from "@/components/auth-form";
import { getEnabledProviders } from "@/lib/supabase/providers";
import { currencyForCountry } from "@/lib/currency";

export const metadata = { title: "Create account · Oykot Money" };

export default async function SignupPage() {
  const { google } = await getEnabledProviders();
  // Vercel sets this on every request; absent locally, which falls back to ₹.
  const country = (await headers()).get("x-vercel-ip-country");

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <Suspense>
        <AuthForm
          mode="signup"
          googleEnabled={google}
          defaultCurrency={currencyForCountry(country)}
        />
      </Suspense>
    </div>
  );
}
