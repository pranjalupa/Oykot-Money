"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureUserSetup } from "@/lib/auth";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "/"),
  };
}

export async function signIn(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { ok: false, error: "Enter your email and password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: error.message };

  // A returning user might predate the seed, or have signed up before their
  // starter data was written. Cheap to check, and it makes the app never empty.
  if (data.user) await ensureUserSetup(data.user.id);

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/");
}

export async function signUp(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const { email, password } = readCredentials(formData);

  if (!email) return { ok: false, error: "Enter an email address." };
  if (password.length < 8)
    return { ok: false, error: "Use a password of at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) return { ok: false, error: error.message };

  // With email confirmation on, there's no session yet — say so rather than
  // bouncing them to a login that will fail.
  if (!data.session) {
    return {
      ok: true,
      message: "Check your email to confirm your account, then sign in.",
    };
  }

  if (data.user) await ensureUserSetup(data.user.id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
