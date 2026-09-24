import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Archivo, Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { getUser, getProfile, getUserPrefs } from "@/lib/auth";
import { TimezoneSync } from "@/components/timezone-sync";
import { getAccess } from "@/lib/access";
import { formatDay } from "@/lib/dates";
import { DEFAULT_REGION } from "@/lib/region";
import { CurrencyProvider } from "@/components/currency-provider";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { Annotator } from "@/components/annotator";
import { GuidesProvider } from "@/components/flow-guide";
import { isAnnotator } from "@/lib/annotator";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});


export const metadata: Metadata = {
  title: "Oykot Money",
  description: "Personal budgeting for your needs, wants and investments.",
  applicationName: "Oykot Money",
  // Installed on a phone it's an app, not a browser tab: no Safari chrome,
  // the status bar tinted by the page, and its own name under the icon.
  appleWebApp: { capable: true, title: "Oykot", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // Next writes the modern `mobile-web-app-capable`; older iOS only honours
  // the apple-prefixed one, and that's the tag that makes the home-screen
  // launch full screen rather than inside Safari.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Lets the page reach under the notch and the home bar, which is what makes
  // the `env(safe-area-inset-*)` padding in app-nav.tsx mean anything. Without
  // it those insets are always zero.
  viewportFit: "cover",
  // Matches the app background in each theme, so the iOS status bar and the
  // Android toolbar don't sit on a slab of the wrong colour.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#171716" },
  ],
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
        className={`${inter.variable} ${archivo.variable} antialiased`}
      >
        <ThemeProvider
          signedIn={Boolean(user)}
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
                trial={
                  access
                    ? {
                        state: access.state,
                        daysLeft: access.daysLeft,
                        enforced: access.enforced,
                        autopayDue: access.autopayDue,
                        trialEnds: formatDay(access.trialEndsAt.toISOString(), prefs?.locale ?? "en-IN", {
                          day: "numeric",
                          month: "long",
                        }),
                      }
                    : null
                }
                sidebarCollapsed={sidebarCollapsed}
              >
                {children}
              </AppShell>
              {user && isAnnotator(user.email) && <Annotator />}
              </GuidesProvider>
            </CurrencyProvider>
          </TooltipProvider>
          <ServiceWorker />
          {/* Clear of the bottom tab bar on phones. */}
          <Toaster position="bottom-center" mobileOffset={{ bottom: 88 }} />
        </ThemeProvider>
      </body>
    </html>
  );
}
