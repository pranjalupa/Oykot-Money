import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getEnabledProviders } from "@/lib/supabase/providers";

export const metadata = { title: "Create account · Oykot Money" };

export default async function SignupPage() {
  const { google } = await getEnabledProviders();

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <Suspense>
        <AuthForm mode="signup" googleEnabled={google} />
      </Suspense>
    </div>
  );
}
