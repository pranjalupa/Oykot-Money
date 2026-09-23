"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CheckCircle, TrendDown } from "@phosphor-icons/react";
import {
  DailyScreen,
  FloatCard,
  MockRowView,
  PhoneFrame,
  SAMPLE,
  SplitCard,
  mockMoney,
} from "@/components/landing-mockups";
import { cn } from "@/lib/utils";
import type { PriceCurrency } from "@/lib/pricing";

/**
 * The hero: a phone running the app's Daily screen, playing the product's
 * whole argument on a loop — the Add tile is tapped, a lunch lands in Today,
 * the day's number counts down, "Logged in 3 seconds" floats off the phone.
 *
 * It loops only while on screen. With reduced motion it shows the finished
 * state and never moves. The figures follow the visitor's currency.
 */

/** idle → the Add tile is tapped → the row lands → the number settles → the note shows. */
type Phase = "idle" | "press" | "logged" | "counted" | "done";

const REDUCE = "(prefers-reduced-motion: reduce)";
function subscribeReduce(onChange: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function HeroDemo({ currency }: { currency: PriceCurrency }) {
  const d = SAMPLE[currency];
  const [animPhase, setPhase] = useState<Phase>("idle");
  const [animValue, setValue] = useState(d.daily);
  const root = useRef<HTMLDivElement>(null);
  // Read, not mirrored into state: with reduced motion the phone simply *is*
  // the finished state, and the loop below never starts.
  const reduce = useSyncExternalStore(subscribeReduce, () => window.matchMedia(REDUCE).matches, () => false);
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
        setValue(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }

    const after = d.daily - d.logged.amount;

    /**
     * `fresh`: start from scratch (first run, or back on screen) — snap.
     * Otherwise it's the loop coming round, so play it backwards: the row
     * leaves and the number climbs back *with* it. Snapping the number while
     * the row was still fading out read as the phone glitching.
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

    // Only while someone can see it: no timers in a background tab or under the fold.
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
  // it the moment the row appeared made the screen change in three places at
  // three different times.
  const counted = phase === "counted" || phase === "done";

  return (
    <div ref={root} className="relative mx-auto w-fit">
      {/* The description a screen reader gets instead of a number that keeps changing. */}
      <p className="sr-only">
        An example of the app on a phone: logging a {mockMoney(d.logged.amount, currency)} lunch
        drops what&rsquo;s safe to spend today from {mockMoney(d.daily, currency)} to{" "}
        {mockMoney(d.daily - d.logged.amount, currency)}.
      </p>

      <div aria-hidden className="relative">
        <div data-lp-tilt>
          <PhoneFrame>
            <DailyScreen
              currency={currency}
              amount={value}
              spent={d.spent + (counted ? d.logged.amount : 0)}
              pressed={phase === "press"}
              newRow={
                // The row takes its height before it fades in, so the list
                // grows smoothly rather than jumping.
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-500 ease-out",
                    logged ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <MockRowView
                      row={d.logged}
                      currency={currency}
                      className={cn(
                        "transition-all duration-500",
                        logged ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
                        phase === "logged" && "bg-primary/10",
                      )}
                    />
                  </div>
                </div>
              }
            />
          </PhoneFrame>
        </div>

        {/* Off the left edge: the moment itself. */}
        <div data-lp-float="0.5" className="absolute top-[46%] -left-5 sm:-left-28">
          <FloatCard
            className={cn(
              "flex items-center gap-2.5 py-2.5 pr-4 transition-all duration-500",
              phase === "done" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
            )}
          >
            <CheckCircle size={22} weight="fill" className="shrink-0 text-positive" />
            <span className="leading-tight">
              <span className="block text-[12.5px] font-semibold">Logged in 3 seconds</span>
              <span className="block text-[11px] text-muted-foreground tabular-nums">
                {d.logged.name} · −{mockMoney(d.logged.amount, currency)}
              </span>
            </span>
          </FloatCard>
        </div>

        {/* Off the right edge: the month the day belongs to. */}
        <div data-lp-float="1" className="absolute -right-4 bottom-4 sm:-right-32">
          <SplitCard />
        </div>

        {/* Top right: where the day's number comes from. */}
        <div data-lp-float="1.4" className="absolute top-20 -right-3 sm:-right-20">
          <FloatCard className="flex items-center gap-2 py-2 pr-3.5">
            <span className="grid size-6 place-items-center rounded-full bg-primary/12 text-primary">
              <TrendDown size={13} weight="bold" />
            </span>
            <span className="text-[11.5px] font-semibold">Under pace this week</span>
          </FloatCard>
        </div>
      </div>
    </div>
  );
}
