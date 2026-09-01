import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in · Oykot Money" };

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <Suspense>
        <AuthForm mode="signin" />
      </Suspense>
    </div>
  );
}
