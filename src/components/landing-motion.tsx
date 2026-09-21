"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The landing page's two bits of motion. Both are decoration: the page reads
 * exactly the same with JavaScript off, with an observer that never fires, or
 * with "reduce motion" switched on.
 */

/** Fades a block up the first time it comes into view, then stops watching. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  /** Milliseconds, for staggering a row of cards. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // No observer (old browser, odd environment) means show it, not hide it.
    if (typeof IntersectionObserver === "undefined") {
      node.setAttribute("data-shown", "");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.style.transitionDelay = `${delay}ms`;
        node.setAttribute("data-shown", "");
        observer.disconnect();
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className ?? ""}`}>
      {children}
    </div>
  );
}

/**
 * Counts a figure up on first paint. It's the one number on the page, and a
 * figure that lands rather than appears is the difference between a screenshot
 * and something that looks alive.
 *
 * Renders the final value immediately for anyone who asked for less motion —
 * and as the server-rendered text either way, so it's never missing.
 */
export function CountUp({
  value,
  locale = "en-IN",
  durationMs = 900,
}: {
  value: number;
  /** Grouping style for the digits. A string, not a formatter — a function
      can't cross from a server component into a client one. */
  locale?: string;
  durationMs?: number;
}) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - started) / durationMs, 1);
      // Ease out: fast at first, settling into the real figure.
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    // State starts at the real figure so the server and the first paint agree;
    // the first frame (before paint) drops it to ~0 and the count runs from
    // there. Setting it to 0 here instead would be a synchronous setState in
    // an effect, which is a cascading render.
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return <span className="tabular">{shown.toLocaleString(locale)}</span>;
}
