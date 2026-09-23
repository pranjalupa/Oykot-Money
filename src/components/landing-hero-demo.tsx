"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle, ForkKnife, Plus, Train, Coffee } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { PriceCurrency } from "@/lib/pricing";

/**
 * The hero's whole argument, played out: an expense gets logged and the day's
 * number drops to match. Built from the same tokens as the app's Daily card,
 * so it follows the theme and can't go stale like a screenshot would.
 *
 * It loops only while on screen. With reduced motion it shows the finished
 * state — the row logged, the number updated — and never moves.
 */

type Row = { name: string; category: string; amount: number; icon: "train" | "food" | "coffee" };

const DEMO: Record<
  PriceCurrency,
  { daily: number; spent: number; budget: number; existing: Row; logged: Row }
> = {
  INR: {
    daily: 1850,
    spent: 38_400,
    budget: 61_500,
    existing: { name: "Metro", category: "Transport", amount: 60, icon: "train" },
    logged: { name: "Lunch", category: "Food", amount: 240, icon: "food" },
  },
  USD: {
    daily: 57,
    spent: 1_180,
    budget: 1_900,
    existing: { name: "Coffee", category: "Food", amount: 5, icon: "coffee" },
    logged: { name: "Lunch", category: "Food", amount: 14, icon: "food" },
  },
};

const ICON = { train: Train, food: ForkKnife, coffee: Coffee };

/** idle → the + is pressed → the row lands → the number settles → the note shows. */
type Phase = "idle" | "press" | "logged" | "counted" | "done";

function money(n: number, currency: PriceCurrency) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

const REDUCE = "(prefers-reduced-motion: reduce)";
function subscribeReduce(onChange: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function HeroDemo({ currency }: { currency: PriceCurrency }) {
  const d = DEMO[currency];
  const [animPhase, setPhase] = useState<Phase>("idle");
  const [animValue, setValue] = useState(d.daily);
  const root = useRef<HTMLDivElement>(null);
  // Read, not mirrored into state: with reduced motion the card simply *is*
  // the finished state, and the loop below never starts.
  const reduce = useSyncExternalStore(
    subscribeReduce,
    () => window.matchMedia(REDUCE).matches,
    () => false,
  );
  const phase: Phase = reduce ? "done" : animPhase;
  const value = reduce ? d.daily - d.logged.amount : animValue;

  useEffect(() => {
    if (reduce) return;

    let timers: number[] = [];
    let raf = 0;
    let running = false;

    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    function tween(from: number, to: number, ms: number) {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(from + (to - from) * eased));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    const after = d.daily - d.logged.amount;

    /**
     * `fresh`: start from scratch (first run, or back on screen) — snap.
     * Otherwise it's the loop coming round, so play it backwards: the row
     * leaves and the number climbs back *with* it. Snapping the number while
     * the row was still fading out read as the card glitching.
     */
    function cycle(fresh = false) {
      setPhase("idle");
      if (fresh) setValue(d.daily);
      else tween(after, d.daily, 500);
      at(1300, () => setPhase("press"));
      at(1650, () => setPhase("logged"));
      at(2050, () => {
        setPhase("counted");
        tween(d.daily, after, 800);
      });
      at(2900, () => setPhase("done"));
      at(6400, () => cycle());
    }

    function stop() {
      running = false;
      timers.forEach(clearTimeout);
      timers = [];
      cancelAnimationFrame(raf);
    }

    // Only run while someone can see it: no timers ticking in a background tab
    // or under the fold.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        cycle(true);
      } else if (!entry.isIntersecting && running) {
        stop();
      }
    });
    if (root.current) observer.observe(root.current);

    return () => {
      observer.disconnect();
      stop();
    };
  }, [d, reduce]);

  const logged = phase === "logged" || phase === "counted" || phase === "done";
  // The month total moves with the day's number, not with the row: updating
  // it the moment the row starts appearing made the card change in three
  // places at three different times.
  const counted = phase === "counted" || phase === "done";
  const spent = d.spent + (counted ? d.logged.amount : 0);
  const Logged = ICON[d.logged.icon];
  const Existing = ICON[d.existing.icon];

  return (
    <div ref={root} className="relative mx-auto w-full max-w-[25rem]">
      {/* The description a screen reader gets instead of a number that keeps changing. */}
      <p className="sr-only">
        An example of the app: logging a {money(d.logged.amount, currency)} lunch drops what&rsquo;s
        safe to spend today from {money(d.daily, currency)} to{" "}
        {money(d.daily - d.logged.amount, currency)}.
      </p>

      <div aria-hidden className="relative">
        {/* A second card behind, leaning away — the month's split. Depth, and a
            hint that there's more under the one number. */}
        <div className="absolute inset-x-5 -top-[4.5rem] h-40 translate-x-3 rotate-[4deg] rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-sm">
          <p className="text-xs font-medium text-white/60">This month</p>
          <div className="mt-3 flex h-2 gap-1 overflow-hidden rounded-full">
            <span className="w-1/2 rounded-full bg-lemon-400/80" />
            <span className="w-[30%] rounded-full bg-white/40" />
            <span className="w-1/5 rounded-full bg-forest-400" />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-white/50">
            <span>Needs</span>
            <span>Wants</span>
            <span>Investments</span>
          </div>
        </div>

        <div className="lp-lift relative rounded-[1.75rem] border border-border bg-card p-5 text-card-foreground">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Safe to spend today</p>
            <span
              className={cn(
                "grid size-9 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-200",
                phase === "press" && "scale-90",
              )}
            >
              <Plus size={16} weight="bold" />
            </span>
          </div>

          <p className="mt-1 font-heading text-[2.9rem] leading-none font-bold tracking-tight tabular-nums">
            {money(value, currency)}
            <span className="ml-1.5 font-sans text-base font-medium tracking-normal text-muted-foreground">
              / day
            </span>
          </p>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
              style={{ width: `${(spent / d.budget) * 100}%` }}
            />
          </div>
          <p className="mt-2.5 text-[13px] text-muted-foreground tabular-nums">
            <span className="font-semibold text-foreground">{money(spent, currency)}</span> of{" "}
            {money(d.budget, currency)} spent this month
          </p>

          <div className="mt-5 border-t border-border pt-3">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Today</p>
            {/* The new row takes its height before it fades in, so the card
                grows smoothly rather than jumping. */}
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-out",
                logged ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <DemoRow
                  row={d.logged}
                  Icon={Logged}
                  currency={currency}
                  className={cn(
                    "transition-all duration-500",
                    logged ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
                    phase === "logged" && "bg-primary/8",
                  )}
                />
              </div>
            </div>
            <DemoRow row={d.existing} Icon={Existing} currency={currency} />
          </div>
        </div>

        <div
          className={cn(
            "absolute -bottom-5 left-4 flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium text-card-foreground shadow-lg transition-all duration-500",
            phase === "done" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          <CheckCircle size={18} weight="fill" className="text-positive" />
          Logged in 3 seconds
        </div>
      </div>
    </div>
  );
}

function DemoRow({
  row,
  Icon,
  currency,
  className,
}: {
  row: Row;
  Icon: typeof Train;
  currency: PriceCurrency;
  className?: string;
}) {
  return (
    <div className={cn("-mx-2 flex items-center gap-3 rounded-xl px-2 py-2", className)}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted">
        <Icon size={16} weight="duotone" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{row.name}</span>
        <span className="block text-xs text-muted-foreground">{row.category}</span>
      </span>
      <span className="text-sm font-semibold tabular-nums">−{money(row.amount, currency)}</span>
    </div>
  );
}
