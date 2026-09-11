"use client";

import { useEffect } from "react";
import { saveTimezone } from "@/app/actions";

/**
 * Reports the browser's timezone when it differs from the saved one.
 *
 * Only the browser knows where the user actually is; the server runs on UTC.
 * Runs once per mismatch — saving revalidates the layout, `saved` then matches,
 * and the effect has nothing left to do. Renders nothing.
 */
export function TimezoneSync({ saved }: { saved: string | null }) {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === saved) return;
    const fd = new FormData();
    fd.set("timezone", zone);
    void saveTimezone(fd);
  }, [saved]);

  return null;
}
