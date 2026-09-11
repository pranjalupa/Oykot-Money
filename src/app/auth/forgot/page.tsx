import { ForgotPasswordForm } from "@/components/password-forms";

export const metadata = { title: "Reset password · Oykot Money" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-16">
      <ForgotPasswordForm />
    </div>
  );
}
