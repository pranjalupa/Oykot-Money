"use client";

import { useEffect } from "react";

/**
 * Registers the service worker once the page is up, so it never competes with
 * the first render. Failure is deliberately silent: the app works without it,
 * and a private window or a blocked registration isn't worth a console error.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") register();
    else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);
  return null;
}
