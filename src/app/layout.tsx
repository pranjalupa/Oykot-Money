import type { Metadata } from "next";
import { Archivo, Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/app-shell";
import { getUser } from "@/lib/auth";
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

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${archivo.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell signedIn={!!user} email={user?.email ?? null}>
            {children}
          </AppShell>
          <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
