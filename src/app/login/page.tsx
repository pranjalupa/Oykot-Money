import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getEnabledProviders } from "@/lib/supabase/providers";

export const metadata = { title: "Sign in · Oykot Money" };

export default async function LoginPage() {
  const { google } = await getEnabledProviders();

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <Suspense>
        <AuthForm mode="signin" googleEnabled={google} />
      </Suspense>
    </div>
  );
}
