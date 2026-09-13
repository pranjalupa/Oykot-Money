import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Archivo, Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { getUser, getProfile, getUserPrefs } from "@/lib/auth";
import { TimezoneSync } from "@/components/timezone-sync";
import { getAccess } from "@/lib/access";
import { DEFAULT_REGION } from "@/lib/region";
import { CurrencyProvider } from "@/components/currency-provider";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { Annotator } from "@/components/annotator";
import { GuidesProvider } from "@/components/flow-guide";
import { isAnnotator } from "@/lib/annotator";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// One weight is all this face ships; it's an accent, never body copy.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Oykot Money",
  description: "Personal budgeting — needs, wants, investments.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Nav only makes sense once you're in; the auth pages render bare.
  const user = await getUser();
  const prefs = user ? await getUserPrefs() : null;
  const access = user ? await getAccess() : null;
  const profile = user ? await getProfile() : null;
  const name = profile?.displayName ?? null;
  const sidebarCollapsed = (await cookies()).get("sidebar")?.value === "collapsed";

  return (
    <html lang="en" data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"} suppressHydrationWarning>
      <body
        className={`${inter.variable} ${archivo.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Short delay, not zero: tooltips that fire the instant the pointer
              crosses a toolbar are noise. Long enough to mean "I paused here". */}
          <TooltipProvider delay={350}>
            <CurrencyProvider
              currency={prefs?.currency ?? DEFAULT_CURRENCY}
              region={prefs?.region ?? DEFAULT_REGION}
              timeZone={prefs?.timeZone}
            >
              {user && <TimezoneSync saved={prefs?.savedTimeZone ?? null} />}
              <GuidesProvider dismissed={profile ? profile.dismissedGuides : null}>
              <AppShell
                signedIn={!!user}
                email={user?.email ?? null}
                name={name}
                trial={access ? { state: access.state, daysLeft: access.daysLeft, enforced: access.enforced } : null}
                sidebarCollapsed={sidebarCollapsed}
              >
                {children}
              </AppShell>
              {user && isAnnotator(user.email) && <Annotator />}
              </GuidesProvider>
            </CurrencyProvider>
          </TooltipProvider>
          {/* Clear of the bottom tab bar on phones. */}
          <Toaster position="bottom-center" mobileOffset={{ bottom: 88 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
