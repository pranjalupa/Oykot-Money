"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Money } from "@/components/money";

/**
 * A hero figure that ticks from its old value to its new one when it changes
 * — log a ₹240 lunch and "safe to spend" counts down in front of you. It's
 * the same moment the landing page's demo plays, happening for real.
 *
 * It never animates on first render, so it doesn't replay every time a
 * screen opens; only a change to a figure already on screen moves. With
 * reduced motion it's a plain <Money>.
 *
 * The tone is decided by where the number is going, not where it is mid-way,
 * so a figure crossing zero doesn't flash the wrong colour.
 */

const REDUCE = "(prefers-reduced-motion: reduce)";
function subscribe(onChange: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function AnimatedMoney({
  minor,
  tone = "default",
  className,
}: {
  minor: number;
  tone?: "default" | "auto";
  className?: string;
}) {
  const reduce = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE).matches, () => false);
  const [shown, setShown] = useState(minor);
  const last = useRef(minor);

  useEffect(() => {
    const from = last.current;
    last.current = minor;
    if (from === minor || reduce) return;

    let raf = 0;
    const start = performance.now();
    const duration = 650;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (minor - from) * eased;
      // Whole units while it moves, so the paise don't flicker; exact at the end.
      setShown(t < 1 ? Math.round(value / 100) * 100 : minor);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [minor, reduce]);

  const resolved = tone === "auto" ? (minor < 0 ? "negative" : minor > 0 ? "positive" : "muted") : "default";
  return <Money minor={reduce ? minor : shown} tone={resolved} className={className} />;
}
