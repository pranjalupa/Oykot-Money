import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { AuthSplit } from "@/components/auth-split";
import { getEnabledProviders } from "@/lib/supabase/providers";

export const metadata = { title: "Sign in · Oykot Money" };

export default async function LoginPage() {
  const { google } = await getEnabledProviders();

  return (
    <AuthSplit>
      <Suspense>
        <AuthForm mode="signin" googleEnabled={google} />
      </Suspense>
    </AuthSplit>
  );
}
