"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ensureUserSetup } from "@/lib/auth";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Where confirmation emails should send people back to.
 *
 * Derived from the actual request, so a signup on localhost confirms to
 * localhost and one on production confirms to production. Without this,
 * Supabase falls back to the project's Site URL — which ships as
 * http://localhost:3000 and puts a dead link in every real signup email.
 *
 * NEXT_PUBLIC_SITE_URL overrides, for the case where the public address
 * differs from the host header (a proxy or custom domain).
 *
 * Supabase only honours this if the URL is in the project's redirect
 * allow-list — see the deploy notes in AGENTS.md.
 */
async function siteOrigin(): Promise<string> {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";

  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

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

/**
 * Google OAuth. Run as a server action rather than from the browser so the
 * PKCE code verifier is written as a server cookie — the same cookie
 * /auth/callback needs to exchange the code. Doing it client-side with the
 * browser client puts the verifier somewhere the callback can't read.
 */
export async function signInWithGoogle(
  _prev: AuthResult | null,
  formData: FormData,
): Promise<AuthResult> {
  const rawNext = String(formData.get("next") ?? "/");
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!data.url) return { ok: false, error: "Google sign-in is not available." };

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
