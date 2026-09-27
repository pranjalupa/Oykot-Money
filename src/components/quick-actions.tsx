import Link from "next/link";
import { Target, HandCoins } from "@phosphor-icons/react/dist/ssr";

/**
 * Shortcuts the tab bar doesn't already give you, one tap from the number that
 * made you open the app. Phones only: on desktop the sidebar is on screen.
 *
 * Two, not four. Add and Money were here too, and both sit in the tab bar a
 * thumb's width away (UX audit F-10). The room they leave goes to the hint,
 * now visible instead of a title attribute nobody on a phone can see.
 */
const ACTIONS = [
  { href: "/needs", label: "Budget", icon: Target, hint: "Set this month's plan" },
  { href: "/money#settlements", label: "People", icon: HandCoins, hint: "Who owes whom" },
] as const;

export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-2 gap-2 sm:hidden">
      {ACTIONS.map(({ href, label, icon: Icon, hint }) => (
        <Link
          key={label}
          href={href}
          className="flex min-h-[64px] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 transition-[background-color,transform] duration-150 active:scale-[0.96] active:bg-muted"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon size={20} weight="bold" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium">{label}</span>
            <span className="block truncate text-xs text-muted-foreground">{hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
