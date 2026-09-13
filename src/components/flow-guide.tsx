"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Lightbulb, X } from "@phosphor-icons/react";
import { dismissGuide, resetGuides } from "@/app/onboarding-actions";
import { Button } from "@/components/ui/button";
import { GUIDES, type GuideId } from "@/lib/guides";
import { cn } from "@/lib/utils";

type Guides = { dismissed: Set<string>; dismiss: (id: GuideId) => void; reset: () => Promise<void> };

const GuidesContext = createContext<Guides | null>(null);

/**
 * Holds which guides are dismissed for the whole signed-in session. The layout
 * isn't re-rendered on client navigation, so the list lives in state here —
 * otherwise a guide you just dismissed would come back on the next page.
 */
export function GuidesProvider({ dismissed, children }: { dismissed: string[] | null; children: React.ReactNode }) {
  const [set, setSet] = useState(() => new Set(dismissed ?? []));

  const dismiss = useCallback((id: GuideId) => {
    setSet((s) => new Set(s).add(id));
    dismissGuide(id).catch(() => {
      // Hidden for this visit either way; it may return on the next load.
    });
  }, []);

  const reset = useCallback(async () => {
    await resetGuides();
    setSet(new Set());
  }, []);

  const value = useMemo(() => ({ dismissed: set, dismiss, reset }), [set, dismiss, reset]);
  if (dismissed === null) return <>{children}</>;
  return <GuidesContext.Provider value={value}>{children}</GuidesContext.Provider>;
}

export function useGuides() {
  return useContext(GuidesContext);
}

/** The first-use card for one flow. Renders nothing once dismissed, or when signed out. */
export function FlowGuide({ id, compact = false, className }: { id: GuideId; compact?: boolean; className?: string }) {
  const guides = useGuides();
  if (!guides || guides.dismissed.has(id)) return null;
  const guide = GUIDES[id];

  return (
    <aside
      aria-label={guide.title}
      className={cn(
        "relative rounded-xl border border-primary/25 bg-primary/5 text-sm",
        compact ? "p-3" : "p-4 sm:p-5",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => guides.dismiss(id)}
        aria-label="Dismiss this guide"
        title="Dismiss"
        className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X size={14} weight="bold" />
      </button>

      <p className="flex items-center gap-2 pr-8 font-heading font-semibold">
        <Lightbulb size={compact ? 15 : 17} weight="fill" className="shrink-0 text-primary" />
        {guide.title}
      </p>
      <ol className={cn("flex flex-col text-muted-foreground", compact ? "mt-2 gap-1 text-xs" : "mt-3 gap-1.5")}>
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-2.5">
            <span
              aria-hidden
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-foreground",
                compact ? "size-4 text-[10px]" : "mt-px size-5 text-[11px]",
              )}
            >
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {!compact && (
        <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => guides.dismiss(id)}>
          Got it
        </Button>
      )}
    </aside>
  );
}

/** Settings: bring every guide back. */
export function ResetGuidesButton() {
  const guides = useGuides();
  const [done, setDone] = useState(false);
  if (!guides) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await guides.reset();
        setDone(true);
      }}
      className="text-sm font-medium underline underline-offset-4 hover:text-foreground"
    >
      {done ? "Tips are back on every page" : "Show tips again"}
    </button>
  );
}
