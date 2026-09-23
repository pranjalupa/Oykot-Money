import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LEGAL } from "@/lib/legal";
import { LogoMark, Wordmark } from "@/components/logo";

/** The signed-out header on pricing and the legal pages — the landing nav's twin. */
export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
      <Link href="/" className="flex items-center gap-2.5" aria-label="Oykot Money, home">
        <LogoMark size={30} />
        <Wordmark height={17} />
      </Link>
      <nav aria-label="Main" className="flex shrink-0 items-center gap-1 text-sm whitespace-nowrap sm:gap-1.5">
        <Link href="/pricing" className="lp-nav-link rounded-full px-3 py-2">
          Pricing
        </Link>
        <Link href="/login" className="lp-nav-link rounded-full px-3 py-2">
          Sign in
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants(), "ml-1 h-10 rounded-full px-4 font-semibold sm:h-10 sm:px-4")}
        >
          Start free
        </Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-muted-foreground sm:px-6">
        <p>
          © 2026 {LEGAL.product} · {LEGAL.location}
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-4">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/legal/refunds" className="hover:text-foreground">Refunds</Link>
          <a href={`mailto:${LEGAL.email}`} className="hover:text-foreground">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
