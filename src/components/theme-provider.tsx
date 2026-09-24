"use client";

import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * The public site is light, always: the landing page, pricing, sign-in and
 * sign-up, the legal pages, and the password-reset flow. It's designed as one
 * light, editorial surface, and a visitor's dark-mode setting shouldn't turn it
 * into a different page.
 *
 * Signed out, every page you can reach is public (the middleware sends
 * everything else to /login), so "signed out" is the rule. `/auth` is added
 * because a password-reset link arrives with a recovery session. Inside the
 * app, the user's own choice stands.
 *
 * `forcedTheme` rather than `setTheme`: forcing doesn't touch the saved
 * preference, so signing in brings their dark mode straight back, and
 * next-themes' pre-paint script honours it, so there's no dark flash.
 */
export function ThemeProvider({
  children,
  signedIn,
  ...props
}: ComponentProps<typeof NextThemesProvider> & { signedIn: boolean }) {
  const pathname = usePathname();
  const publicPage = !signedIn || pathname.startsWith("/auth");
  return (
    <NextThemesProvider {...props} forcedTheme={publicPage ? "light" : undefined}>
      {children}
    </NextThemesProvider>
  );
}
