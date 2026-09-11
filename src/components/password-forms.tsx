"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle, Warning } from "@phosphor-icons/react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthResult,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Header({ title, note }: { title: string; note: string }) {
  return (
    <div className="mb-7 text-center">
      <p className="font-heading text-2xl font-extrabold">Oykot</p>
      <h1 className="mt-4 font-heading text-xl font-bold">{title}</h1>
      <p className="accent-note mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function Feedback({ state }: { state: AuthResult | null }) {
  if (!state) return null;
  if (!state.ok)
    return (
      <p
        role="alert"
        className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
      >
        <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
        {state.error}
      </p>
    );
  return state.message ? (
    <p className="flex items-start gap-2 rounded-md bg-secondary px-3 py-2 text-sm text-secondary-foreground">
      <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0" />
      {state.message}
    </p>
  ) : null;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    requestPasswordReset,
    null,
  );
  return (
    <div className="w-full max-w-sm">
      <Header title="Reset your password" note="We'll email you a link to set a new one." />
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <Feedback state={state} />
        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    updatePassword,
    null,
  );
  return (
    <div className="w-full max-w-sm">
      <Header title="Choose a new password" note="Then you're straight back in." />
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="At least 8 characters" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirm">Type it again</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <Feedback state={state} />
        <Button type="submit" disabled={pending} className="mt-1 w-full">
          {pending ? "Saving…" : "Save password"}
        </Button>
      </form>
    </div>
  );
}
