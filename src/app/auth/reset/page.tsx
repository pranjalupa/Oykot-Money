import Link from "next/link";
import { ResetPasswordForm } from "@/components/password-forms";
import { getUser } from "@/lib/auth";

export const metadata = { title: "New password · Oykot Money" };
export const dynamic = "force-dynamic";

/**
 * Reached through the reset email, which signs the user in for this one step.
 * Without that session there's nothing to update — say so, and offer a new link.
 */
export default async function ResetPasswordPage() {
  const user = await getUser();

  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="w-full max-w-sm text-center">
          <p className="font-heading text-2xl font-extrabold">Oykot</p>
          <h1 className="mt-4 font-heading text-xl font-bold">That link has expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Reset links work once and only for a while.
          </p>
          <Link
            href="/auth/forgot"
            className="mt-6 inline-block font-medium underline underline-offset-4"
          >
            Send a new link
          </Link>
        </div>
      )}
    </div>
  );
}
