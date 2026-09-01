"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  CalendarBlank,
  ChartPieSlice,
  Gear,
  House,
  Moon,
  ShoppingBag,
  SignOut,
  Sun,
  TrendUp,
  Wallet,
} from "@phosphor-icons/react";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Month", icon: House },
  { href: "/daily", label: "Daily", icon: CalendarBlank },
  { href: "/needs", label: "Needs", icon: ChartPieSlice },
  { href: "/wants", label: "Wants", icon: ShoppingBag },
  { href: "/investments", label: "Invest", icon: TrendUp },
  { href: "/year", label: "Year", icon: ChartPieSlice },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Gear },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Until mounted we don't know the resolved theme; render a stable icon
  // rather than guessing and flipping on hydration.
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
    </button>
  );
}

export function AppNav({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <Link href="/" className="mr-1 shrink-0 font-heading text-lg font-extrabold">
          Oykot
        </Link>

        <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon size={16} weight={active ? "fill" : "regular"} />
                <span className="hidden md:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <ThemeToggle />

        <form action={signOut}>
          <button
            type="submit"
            title={email ? `Sign out ${email}` : "Sign out"}
            aria-label="Sign out"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <SignOut size={18} weight="bold" />
          </button>
        </form>
      </div>
    </header>
  );
}
