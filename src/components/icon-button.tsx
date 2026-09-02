"use client";

import { forwardRef } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Props = Omit<React.ComponentProps<"button">, "aria-label"> & {
  /**
   * What the button does, in words. Required — an icon on its own is a rebus,
   * and this is the single prop that stops one shipping without a name.
   *
   * Becomes both the tooltip and the accessible name, so screen-reader users
   * and pointer users are told the same thing.
   */
  label: string;
  tone?: "default" | "active" | "danger";
};

const TONES = {
  default: "text-muted-foreground hover:bg-muted hover:text-foreground",
  active: "bg-primary/15 text-primary hover:bg-primary/25",
  danger: "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
} as const;

/**
 * An icon-only button that always carries its name.
 *
 * Tooltips are suppressed on touch, where there is no hover to trigger them and
 * the tooltip would only ever appear as a flash on tap — the aria-label still
 * carries the name there.
 */
export const IconButton = forwardRef<HTMLButtonElement, Props>(
  function IconButton(
    { label, tone = "default", className, children, ...props },
    ref,
  ) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              ref={ref}
              type="button"
              aria-label={label}
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-30",
                TONES[tone],
                className,
              )}
              {...props}
            >
              {children}
            </button>
          }
        />
        <TooltipContent className="max-[640px]:hidden">{label}</TooltipContent>
      </Tooltip>
    );
  },
);
