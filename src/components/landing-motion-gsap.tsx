"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

/**
 * All the landing page's motion, wired by `data-lp-*` attributes so the page
 * itself stays a server component and every section reads as plain markup.
 * GSAP is imported here and nowhere else — it's in the landing's bundle only,
 * never the app's.
 *
 * Three rules this follows:
 *
 * - **The hero headline never waits for JavaScript.** It has a CSS entrance
 *   (`.lp-rise`) so it paints on the first frame; hiding the page's largest
 *   element until hydration would hurt LCP on a slow phone. GSAP only adds to
 *   the hero: scroll parallax, the phone's tilt, the magnetic button.
 * - **Reveals animate opacity, never visibility.** `autoAlpha` would take
 *   unrevealed content out of the tab order, and a keyboard user tabbing down
 *   the page would skip straight past the pricing buttons.
 * - **Reduced motion means none of it.** Everything that moves lives inside
 *   `matchMedia("(prefers-reduced-motion: no-preference)")`; the nav's scroll
 *   state is a colour change, not motion, so it stays outside.
 *
 * Hooks:
 *   data-lp-nav, data-lp-hero, data-lp-hero-card
 *   data-lp-float="n"     a hero card that drifts n× as fast on scroll
 *   data-lp-rise           a mockup that rises into its data-lp-panel
 *   data-lp-reveal         fade up as it enters, batched with its neighbours
 *   data-lp-words          heading: words rise out of a mask
 *   data-lp-chart          the problem chart: draw, pop, then labels
 *     data-lp-draw / data-lp-fade / data-lp-pop / data-lp-late
 *   data-lp-bars           a group whose data-lp-bar children fill in
 *   data-lp-pace           PaceMini's columns grow
 *   data-lp-rows           a table body whose rows slide in
 *   data-lp-zero           the privacy "0"
 *   data-lp-tilt           leans toward the pointer (fine pointers only)
 *   data-lp-magnetic       drifts toward the pointer, presses on click
 */
export function LandingMotion({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe) return;

      /* Don't measure a page that isn't laid out yet. Opened in a background
         tab, the page hydrates while React's streamed content is still in a
         display:none container; ScrollTrigger then measures every position as
         zero, fires every trigger at once, and parks the hero's parallax at
         its end state — headline dimmed to a quarter — until something
         resizes. So: start on the first real size, and re-measure whenever
         the page's height changes after that (a font landing, an FAQ opening). */
      let started = false;
      let refresh: gsap.core.Tween | undefined;
      const laidOut = () =>
        el.getClientRects().length > 0 && el.offsetHeight > 0;
      const start = contextSafe(() => {
        started = true;
        setup(el);
      });
      const observer = new ResizeObserver(
        contextSafe(() => {
          if (!laidOut()) return;
          if (!started) return start();
          refresh?.kill();
          refresh = gsap.delayedCall(0.15, () => ScrollTrigger.refresh());
        }),
      );
      observer.observe(el);

      return () => {
        observer.disconnect();
        refresh?.kill();
      };
    },
    { scope: root },
  );

  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}

/** Everything that moves. Created inside the useGSAP context, so it reverts with it. */
function setup(el: HTMLElement) {
  const q = gsap.utils.selector(el);

  const hero = el.querySelector<HTMLElement>("[data-lp-hero]");
  const nav = el.querySelector<HTMLElement>("[data-lp-nav]");

  /* The nav: transparent at the top, a frosted bar once you've scrolled.
     Colour, not motion — always on. Worked out from the scroll position on
     every update rather than from enter/leave callbacks: with `end: "max"`,
     landing exactly on the bottom of the page counts as *leaving*. */
  if (nav) {
    const sync = () => nav.toggleAttribute("data-scrolled", window.scrollY > 12);
    ScrollTrigger.create({ start: 0, end: "max", onUpdate: sync, onRefresh: sync });
    sync();
  }

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    /* Fade up, in batches: cards that arrive together stagger together. */
    const reveals = q("[data-lp-reveal]");
    gsap.set(reveals, { opacity: 0, y: 28 });
    ScrollTrigger.batch(reveals, {
      start: "top 90%",
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "expo.out",
          stagger: 0.09,
          overwrite: true,
        }),
    });

    /* Mockups rise into their panels a beat after the panel arrives, so the
       product shot lands rather than appearing with its frame. */
    for (const mock of q("[data-lp-rise]") as HTMLElement[]) {
      gsap.from(mock, {
        y: 70,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        delay: 0.1,
        scrollTrigger: { trigger: mock.closest("[data-lp-panel]") ?? mock, start: "top 85%", once: true },
      });
    }

    /* Headings: each word rises out of its own mask. Reverted once done,
           so the DOM is plain text again (and SplitText's aria-label with it). */
    for (const heading of q("[data-lp-words]") as HTMLElement[]) {
      const split = SplitText.create(heading, {
        type: "words",
        mask: "words",
        // Masks get "lp-word-mask", which globals.css extends past the line
        // box: at this leading the descenders of g and y hang below it.
        wordsClass: "lp-word",
      });
      gsap.from(split.words, {
        yPercent: 110,
        duration: 1,
        ease: "expo.out",
        stagger: 0.055,
        scrollTrigger: { trigger: heading, start: "top 88%", once: true },
        onComplete: () => split.revert(),
      });
    }

    /* The problem chart tells its story in order: the month drains, hits
           zero on the 20th, and sits there for ten days. */
    const chart = el.querySelector<HTMLElement>("[data-lp-chart]");
    if (chart) {
      const draws = chart.querySelectorAll("[data-lp-draw]");
      gsap.set(draws, { strokeDasharray: 1, strokeDashoffset: 1 });
      gsap
        .timeline({
          scrollTrigger: { trigger: chart, start: "top 78%", once: true },
        })
        .from(chart.querySelectorAll("[data-lp-fade]"), {
          opacity: 0,
          duration: 0.6,
        })
        .to(
          draws[0],
          { strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" },
          "<",
        )
        .from(chart.querySelector("[data-lp-pop]"), {
          scale: 0,
          transformOrigin: "50% 50%",
          duration: 0.55,
          ease: "back.out(3)",
        })
        .to(
          draws[1],
          { strokeDashoffset: 0, duration: 0.9, ease: "power1.out" },
          "<0.1",
        )
        .from(
          chart.querySelectorAll("[data-lp-late]"),
          { opacity: 0, y: 6, duration: 0.5, stagger: 0.1 },
          "<0.25",
        );
    }

    /* Bars fill from the left, columns grow from the floor. */
    for (const group of q("[data-lp-bars]") as HTMLElement[]) {
      gsap.from(group.querySelectorAll("[data-lp-bar]"), {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 1.2,
        ease: "expo.out",
        stagger: 0.12,
        scrollTrigger: { trigger: group, start: "top 85%", once: true },
      });
    }
    for (const pace of q("[data-lp-pace]") as HTMLElement[]) {
      // PaceMini's columns: the spans in its bottom-aligned row.
      gsap.from(pace.querySelectorAll(".items-end > span"), {
        scaleY: 0,
        transformOrigin: "50% 100%",
        duration: 0.9,
        ease: "back.out(1.6)",
        stagger: 0.06,
        scrollTrigger: { trigger: pace, start: "top 85%", once: true },
      });
    }

    for (const body of q("[data-lp-rows]") as HTMLElement[]) {
      gsap.from(body.querySelectorAll("tr"), {
        opacity: 0,
        x: -14,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: body, start: "top 85%", once: true },
      });
    }

    const zero = el.querySelector("[data-lp-zero]");
    if (zero) {
      gsap.from(zero, {
        scale: 0.3,
        opacity: 0,
        duration: 1.1,
        ease: "elastic.out(1, 0.45)",
        scrollTrigger: { trigger: zero, start: "top 85%", once: true },
      });
    }

    /* Leaving the hero, the floating cards drift up faster than the phone
       they float off — each at its own speed (data-lp-float) — so the hero
       comes apart into planes as it goes. */
    const card = el.querySelector("[data-lp-hero-card]");
    if (hero && card) {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.6 },
      });
      tl.to(card, { yPercent: -8, ease: "none" }, 0);
      for (const float of q("[data-lp-float]") as HTMLElement[]) {
        const speed = Number(float.dataset.lpFloat) || 1;
        tl.to(float, { y: -90 * speed, ease: "none" }, 0);
      }
    }
  });

  /* Pointer toys: only with a mouse or trackpad, and only when motion is welcome. */
  mm.add(
    "(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)",
    () => {
      const local: (() => void)[] = [];
      const listen = <K extends keyof HTMLElementEventMap>(
        target: HTMLElement,
        type: K,
        fn: (e: HTMLElementEventMap[K]) => void,
      ) => {
        target.addEventListener(type, fn);
        local.push(() => target.removeEventListener(type, fn));
      };

      const tilt = el.querySelector<HTMLElement>("[data-lp-tilt]");
      if (tilt && hero) {
        gsap.set(tilt, { transformPerspective: 1000 });
        const rx = gsap.quickTo(tilt, "rotationX", {
          duration: 0.9,
          ease: "power3",
        });
        const ry = gsap.quickTo(tilt, "rotationY", {
          duration: 0.9,
          ease: "power3",
        });
        listen(hero, "pointermove", (e) => {
          const r = hero.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 12);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 9);
        });
        listen(hero, "pointerleave", () => {
          rx(0);
          ry(0);
        });
      }

      for (const btn of q("[data-lp-magnetic]") as HTMLElement[]) {
        const x = gsap.quickTo(btn, "x", { duration: 0.45, ease: "power3" });
        const y = gsap.quickTo(btn, "y", { duration: 0.45, ease: "power3" });
        const clamp = gsap.utils.clamp(-9, 9);
        listen(btn, "pointermove", (e) => {
          const r = btn.getBoundingClientRect();
          x(clamp((e.clientX - (r.left + r.width / 2)) * 0.28));
          y(clamp((e.clientY - (r.top + r.height / 2)) * 0.4));
        });
        listen(btn, "pointerleave", () =>
          gsap.to(btn, {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.9,
            ease: "elastic.out(1, 0.35)",
          }),
        );
        // The press lives here too: an inline transform from GSAP would
        // override a CSS :active scale.
        listen(btn, "pointerdown", () =>
          gsap.to(btn, { scale: 0.96, duration: 0.12, ease: "power2.out" }),
        );
        listen(btn, "pointerup", () =>
          gsap.to(btn, { scale: 1, duration: 0.4, ease: "back.out(3)" }),
        );
      }

      return () => local.forEach((off) => off());
    },
  );

}
