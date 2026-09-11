"use client";

import Link from "next/link";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Anything that throws while rendering lands here instead of Next's raw error
 * screen. Nothing the user did is lost — every write is saved before a page
 * renders — so the honest message is "try again".
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <WarningCircle size={24} weight="duotone" />
      </span>
      <h1 className="mt-4 font-heading text-xl font-bold">Something went wrong</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        This page didn&rsquo;t load. Your data is safe — try again, and if it keeps
        happening, head home.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <ArrowClockwise size={16} weight="bold" />
          Try again
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Go home
        </Link>
      </div>
    </div>
  );
}
