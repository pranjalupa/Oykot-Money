"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import {
  ChartPieSlice,
  Gear,
  House,
  Money,
  Moon,
  Plus,
  ShoppingBag,
  SidebarSimple,
  SignOut,
  SquaresFour,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/logo";

/**
 * The sidebar collapses to icons on wide screens and shows labels in the mobile
 * drawer. A tooltip is only worth showing in the first case — repeating a label
 * that's already on screen is noise, so this wraps conditionally.
 */
function MaybeTooltip({
  show,
  label,
  children,
}: {
  show: boolean;
  label: string;
  children: React.ReactElement;
}) {
  if (!show) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side="right" className="max-[640px]:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

type NavItem = { href: string; label: string; icon: Icon };

/**
 * Grouped rather than one flat list — with eight destinations, a single run of
 * links makes you read all of them to find one. The headings say what kind of
 * question each group answers.
 */
const SECTIONS: { heading: string | null; items: NavItem[] }[] = [
  {
    heading: null,
    // Daily / Monthly / Yearly are tabs on the home page now, not three
    // separate destinations — one entry, not three.
    items: [{ href: "/", label: "Home", icon: House }],
  },
  {
    heading: "Groups",
    items: [
      { href: "/needs", label: "Needs", icon: ChartPieSlice },
      { href: "/wants", label: "Wants", icon: ShoppingBag },
      { href: "/investments", label: "Investments", icon: TrendUp },
      { href: "/income", label: "Income", icon: Money },
    ],
  },
  {
    heading: null,
    items: [
      // People live inside Money now, as Settlements.
      { href: "/money", label: "Money", icon: Wallet },
      { href: "/settings", label: "Settings", icon: Gear },
    ],
  },
];

const GROUP_ITEMS = SECTIONS[1].items;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const tabClass = (active: boolean) =>
  cn(
    "flex min-w-14 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
    active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
  );

/** One bottom tab on phones. */
function TabLink({ href, label, icon: Icon, active }: NavItem & { active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
      <Icon size={22} weight={active ? "fill" : "regular"} />
      <span>{label}</span>
    </Link>
  );
}

function ThemeToggle({ expanded = false }: { expanded?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  // True on the client, false during SSR — without an effect that renders twice.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Until mounted we don't know the resolved theme; render a stable icon
  // rather than guessing and flipping on hydration.
  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <MaybeTooltip show={!expanded} label={label}>
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={label}
        className={cn(
          "flex items-center gap-2.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          expanded ? "w-full px-2.5 py-2" : "size-9 justify-center",
        )}
      >
        {isDark ? (
          <Sun size={17} weight="bold" />
        ) : (
          <Moon size={17} weight="bold" />
        )}
        {expanded && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
      </button>
    </MaybeTooltip>
  );
}

function NavLinks({ onNavigate, compact = false }: { onNavigate?: () => void; compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex flex-1 flex-col gap-5 overflow-y-auto", compact && "items-center")}>
      {SECTIONS.map((section, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {section.heading && !compact && (
            <p className="mb-1 px-2.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              {section.heading}
            </p>
          )}
          {section.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <MaybeTooltip key={href} show={compact} label={label}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-label={compact ? label : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
                    compact ? "size-10 justify-center" : "px-2.5 py-2",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon size={17} weight={active ? "fill" : "regular"} />
                  {!compact && label}
                </Link>
              </MaybeTooltip>
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
      <MaybeTooltip show={!expanded} label="Sign out">
        <button
          type="submit"
          aria-label="Sign out"
          className={cn(
            "flex items-center gap-2.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            expanded ? "w-full px-2.5 py-2" : "size-9 justify-center",
          )}
        >
          <SignOut size={17} weight="bold" />
          {expanded && <span>Sign out</span>}
        </button>
      </MaybeTooltip>
    </form>
  );
}

export function AppNav({
  email,
  name,
  collapsed: initialCollapsed = false,
}: {
  email: string | null;
  name: string | null;
  /** From the `sidebar` cookie, so the first paint already has the right width. */
  collapsed?: boolean;
}) {
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // The content's left offset follows <html data-sidebar> in CSS (see AppShell),
  // so it moves with the sidebar without a server round-trip.
  function toggleCollapsed() {
    const next = collapsed ? "expanded" : "collapsed";
    setCollapsed(!collapsed);
    document.documentElement.dataset.sidebar = next;
    document.cookie = `sidebar=${next}; path=/; max-age=31536000; samesite=lax`;
  }
  const pathname = usePathname();

  // A sheet that stays open after you navigate hides the page you asked for.
  // Close it when the route changes — adjusted during render, so there is no
  // frame where the new page shows under an open sheet.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setGroupsOpen(false);
  }
  const groupActive = GROUP_ITEMS.some((i) => isActive(pathname, i.href));

  return (
    <>
      {/* Desktop sidebar -------------------------------------------------- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card py-4 transition-[width] duration-200 lg:flex",
          collapsed ? "w-16 px-2" : "w-56 px-3",
        )}
      >
        <div className={cn("mb-6 flex items-center", collapsed ? "justify-center" : "justify-between")}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 px-2.5" aria-label="Oykot Money">
              <LogoMark size={24} />
              <Wordmark height={15} />
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mb-2" aria-label="Oykot Money">
              <LogoMark size={24} />
            </Link>
          )}
          <MaybeTooltip show label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <SidebarSimple size={18} weight="bold" />
            </button>
          </MaybeTooltip>
        </div>

        <NavLinks compact={collapsed} />

        <div className={cn("mt-4 flex flex-col gap-0.5 border-t border-border pt-3", collapsed && "items-center")}>
          <ThemeToggle expanded={!collapsed} />
          <SignOutButton expanded={!collapsed} />
          {!collapsed && (name || email) && (
            <div className="min-w-0 px-2.5 pt-2">
              {name && (
                <p className="truncate text-xs font-medium text-foreground">{name}</p>
              )}
              {email && (
                <p className="truncate text-[11px] text-muted-foreground">{email}</p>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile: a slim top bar, and the main tabs at the bottom where a thumb
          reaches. The old ≡ drawer hid every destination behind one icon. */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2" aria-label="Oykot Money">
            <LogoMark size={26} />
            <Wordmark height={15} />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          <TabLink href="/" label="Home" icon={House} active={isActive(pathname, "/")} />

          <Sheet open={groupsOpen} onOpenChange={setGroupsOpen}>
            <SheetTrigger className={tabClass(groupActive)}>
              <SquaresFour size={22} weight={groupActive ? "fill" : "regular"} />
              <span>Groups</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <SheetTitle className="px-5 pt-4 font-heading text-lg font-bold">Groups</SheetTitle>
              <div className="grid grid-cols-2 gap-2 px-4">
                {GROUP_ITEMS.map(({ href, label, icon: Icon }) => {
                  const active = isActive(pathname, href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setGroupsOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border border-border px-3 py-3 text-sm font-medium transition-colors",
                        active ? "bg-secondary text-secondary-foreground" : "hover:bg-muted",
                      )}
                    >
                      <Icon size={18} weight={active ? "fill" : "regular"} />
                      {label}
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/?add=1" aria-label="Add transaction" className="flex items-center justify-center px-2">
            <span className="flex size-12 -translate-y-2.5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background">
              <Plus size={22} weight="bold" />
            </span>
          </Link>

          <TabLink href="/money" label="Money" icon={Wallet} active={isActive(pathname, "/money")} />
          <TabLink href="/settings" label="Settings" icon={Gear} active={isActive(pathname, "/settings")} />
        </div>
      </nav>
    </>
  );
}
