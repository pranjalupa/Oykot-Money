import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account · Oykot Money" };

export default function SignupPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
