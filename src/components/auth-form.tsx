"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Warning, CheckCircle } from "@phosphor-icons/react";
import { signIn, signUp, type AuthResult } from "@/app/auth/actions";
import { GoogleButton } from "@/components/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Label } from "@/components/ui/label";
import { CurrencySelect } from "@/components/currency-select";
import { DEFAULT_CURRENCY, type CurrencyCode } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function AuthForm({
  mode,
  googleEnabled = false,
  defaultCurrency = DEFAULT_CURRENCY,
}: {
  mode: "signin" | "signup";
  googleEnabled?: boolean;
  /** Pre-selected on signup — guessed from the visitor's country. */
  defaultCurrency?: CurrencyCode;
}) {
  const isSignUp = mode === "signup";
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  // Set by /auth/callback when a confirmation link fails or has expired.
  const linkFailed = searchParams.get("error") === "confirm";

  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    isSignUp ? signUp : signIn,
    null,
  );

  return (
    <div className="w-full max-w-sm">
      <div className="mb-7 text-center">
        <p className="font-heading text-2xl font-extrabold">Oykot</p>
        <h1 className="mt-4 font-heading text-xl font-bold">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="accent-note mt-1 text-sm text-muted-foreground">
          {isSignUp
            ? "Your budget, your numbers, nobody else's."
            : "Pick up where your money left off."}
        </p>
      </div>

      {googleEnabled && <GoogleButton next={next} />}

      <form
        action={action}
        className={cn("flex flex-col gap-4", googleEnabled && "mt-4")}
      >
        <input type="hidden" name="next" value={next} />

        {isSignUp && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              maxLength={80}
              placeholder="What should we call you?"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            {!isSignUp && (
              <Link
                href="/auth/forgot"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            )}
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            required
            minLength={isSignUp ? 8 : undefined}
            placeholder={isSignUp ? "At least 8 characters" : "••••••••"}
          />
        </div>

        {isSignUp && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Currency</Label>
            <CurrencySelect id="currency" defaultValue={defaultCurrency} />
            <p className="text-xs text-muted-foreground">
              What your budget is counted in. You can change it later in Settings.
            </p>
          </div>
        )}

        {linkFailed && !state && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
            That confirmation link didn&rsquo;t work — it may have expired or
            already been used. Sign in below, or create the account again.
          </p>
        )}

        {state && !state.ok && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
            {state.error}
          </p>
        )}

        {state?.ok && state.message && (
          <p className="flex items-start gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
            <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account? " : "New here? "}
        <Link
          href={isSignUp ? "/login" : "/signup"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
