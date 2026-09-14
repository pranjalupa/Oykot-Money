"use client";

import { useSyncExternalStore } from "react";

/**
 * True from Tailwind's `sm` breakpoint up. For the few decisions CSS can't
 * make — how many bars a chart draws. False during SSR, so phones render
 * right first and desktops adjust on hydration.
 */
export function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const q = window.matchMedia("(min-width: 640px)");
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 640px)").matches,
    () => false,
  );
}
