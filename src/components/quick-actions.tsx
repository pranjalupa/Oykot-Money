import Link from "next/link";
import { Plus, Target, Wallet, HandCoins } from "@phosphor-icons/react/dist/ssr";

/**
 * The four things you actually do, one tap from the number that made you open
 * the app. Phones only: on desktop the sidebar is already on screen and the
 * header carries Add.
 *
 * Each tile is its own link with a 44px-plus target, and the labels are words
 * rather than icons alone — an icon grid you have to decode is worse than the
 * menu it replaced.
 */
const ACTIONS = [
  { href: "/?add=1", label: "Add", icon: Plus, hint: "Log money in or out" },
  { href: "/needs", label: "Budget", icon: Target, hint: "Set this month's plan" },
  { href: "/money#settlements", label: "Settle", icon: HandCoins, hint: "Money with people" },
  { href: "/money", label: "Money", icon: Wallet, hint: "Accounts and net worth" },
] as const;

export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2 sm:hidden">
      {ACTIONS.map(({ href, label, icon: Icon, hint }) => (
        <Link
          key={label}
          href={href}
          title={hint}
          className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-1 py-3 transition-colors active:bg-muted"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-foreground">
            <Icon size={20} weight="bold" />
          </span>
          <span className="text-xs font-medium">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
