"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  CalendarBlank,
  ChartPieSlice,
  CalendarDots,
  Gear,
  House,
  List,
  Moon,
  ShoppingBag,
  SignOut,
  Sun,
  TrendUp,
  Wallet,
  type Icon,
} from "@phosphor-icons/react";
import { signOut } from "@/app/auth/actions";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: Icon };

/**
 * Grouped rather than one flat list — with eight destinations, a single run of
 * links makes you read all of them to find one. The headings say what kind of
 * question each group answers.
 */
const SECTIONS: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    items: [
      { href: "/", label: "This month", icon: House },
      { href: "/daily", label: "Daily", icon: CalendarBlank },
      { href: "/year", label: "Year", icon: CalendarDots },
    ],
  },
  {
    heading: "Where it goes",
    items: [
      { href: "/needs", label: "Needs", icon: ChartPieSlice },
      { href: "/wants", label: "Wants", icon: ShoppingBag },
      { href: "/investments", label: "Investments", icon: TrendUp },
    ],
  },
  {
    heading: null,
    items: [
      { href: "/accounts", label: "Accounts", icon: Wallet },
      { href: "/settings", label: "Settings", icon: Gear },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function ThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Until mounted we don't know the resolved theme; render a stable icon
  // rather than guessing and flipping on hydration.
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "flex items-center gap-2.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        expanded ? "w-full px-2.5 py-2" : "size-9 justify-center",
      )}
    >
      {isDark ? <Sun size={17} weight="bold" /> : <Moon size={17} weight="bold" />}
      {expanded && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-5 overflow-y-auto">
      {SECTIONS.map((section, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {section.heading && (
            <p className="mb-1 px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {section.heading}
            </p>
          )}
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon size={17} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function SignOutButton({ expanded = false }: { expanded?: boolean }) {
  return (
    <form action={signOut} className={expanded ? "w-full" : undefined}>
      <button
        type="submit"
        aria-label="Sign out"
        title="Sign out"
        className={cn(
          "flex items-center gap-2.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          expanded ? "w-full px-2.5 py-2" : "size-9 justify-center",
        )}
      >
        <SignOut size={17} weight="bold" />
        {expanded && <span>Sign out</span>}
      </button>
    </form>
  );
}

export function AppNav({ email }: { email: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A drawer that stays open after you navigate hides the page you asked for.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop sidebar -------------------------------------------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-card px-3 py-4 lg:flex">
        <Link
          href="/"
          className="mb-6 px-2.5 font-heading text-lg font-extrabold"
        >
          Oykot
        </Link>

        <NavLinks />

        <div className="mt-4 flex flex-col gap-0.5 border-t border-border pt-3">
          <ThemeToggle expanded />
          <SignOutButton expanded />
          {email && (
            <p className="truncate px-2.5 pt-2 text-[11px] text-muted-foreground">
              {email}
            </p>
          )}
        </div>
      </aside>

      {/* Mobile bar + drawer ---------------------------------------------- */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <List size={19} weight="bold" />
            </SheetTrigger>

            <SheetContent side="left" className="p-0">
              <div className="flex h-full flex-col px-3 py-4">
                <SheetTitle className="mb-6 px-2.5 font-heading text-lg font-extrabold">
                  Oykot
                </SheetTitle>
                <NavLinks onNavigate={() => setOpen(false)} />
                <div className="mt-4 flex flex-col gap-0.5 border-t border-border pt-3">
                  <ThemeToggle expanded />
                  <SignOutButton expanded />
                  {email && (
                    <p className="truncate px-2.5 pt-2 text-[11px] text-muted-foreground">
                      {email}
                    </p>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="font-heading text-lg font-extrabold">
            Oykot
          </Link>
        </div>
      </header>
    </>
  );
}
