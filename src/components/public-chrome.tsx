import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { LEGAL } from "@/lib/legal";
import { LogoMark, Wordmark } from "@/components/logo";

export function PublicHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <Link href="/" className="flex items-center gap-2" aria-label="Oykot Money">
        <LogoMark size={28} />
        <Wordmark height={17} />
      </Link>
      <nav className="flex items-center gap-1 text-sm sm:gap-3">
        <Link href="/pricing" className="rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground">
          Pricing
        </Link>
        <Link href="/login" className="rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground">
          Sign in
        </Link>
        <Link href="/signup" className={buttonVariants({ size: "sm" })}>
          Start free trial
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
        <nav className="flex flex-wrap gap-4">
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
