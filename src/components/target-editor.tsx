"use client";

import { useActionState, useEffect, useState } from "react";
import { Warning } from "@phosphor-icons/react";
import { toast } from "sonner";
import { setTargets, clearMonthTargets, type ActionResult } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GROUP_META, SPEND_GROUPS } from "@/lib/targets";
import { cn } from "@/lib/utils";

/**
 * The 50/30/20 dial. Writing with scope=default changes what every future
 * month inherits; scope=month bends just this one.
 */
export function TargetEditor({
  targets,
  month,
  hasOverride,
}: {
  targets: Record<string, number>;
  month: string;
  hasOverride: boolean;
}) {
  const [scope, setScope] = useState<"default" | "month">(
    hasOverride ? "month" : "default",
  );
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(SPEND_GROUPS.map((g) => [g, targets[g] ?? 0])),
  );

  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setTargets,
    null,
  );

  const total = SPEND_GROUPS.reduce((s, g) => s + (values[g] || 0), 0);
  const balanced = total === 100;

  useEffect(() => {
    if (state?.ok) toast.success("Target split saved");
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="month" value={month} />

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { key: "default", label: "Every month" },
            { key: "month", label: "Just this month" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setScope(t.key)}
            aria-pressed={scope === t.key}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              scope === t.key
                ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {SPEND_GROUPS.map((g) => (
          <div key={g} className="flex flex-col gap-1.5">
            <Label htmlFor={g}>
              {GROUP_META[g].label}
            </Label>
            <div className="relative">
              <Input
                id={g}
                name={g}
                type="number"
                min={0}
                max={100}
                value={values[g]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [g]: Number(e.target.value) }))
                }
                className="tabular pr-7"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                %
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Live proportion bar — the split you're describing, drawn. */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
        {SPEND_GROUPS.map((g) => (
          <div
            key={g}
            style={{
              width: `${Math.min(values[g] || 0, 100)}%`,
              backgroundColor: `var(--${g})`,
            }}
          />
        ))}
      </div>

      <p
        className={cn(
          "tabular text-xs",
          balanced ? "text-muted-foreground" : "text-negative",
        )}
      >
        {balanced
          ? "Adds up to 100%."
          : `Adds up to ${total}%. It needs to be 100%.`}
      </p>

      {state && !state.ok && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <Warning size={16} weight="fill" className="mt-0.5 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !balanced}>
          {pending ? "Saving…" : "Save split"}
        </Button>

        {hasOverride && (
          <Button
            type="submit"
            variant="ghost"
            formAction={clearMonthTargets}
            className="text-muted-foreground"
          >
            Reset this month to default
          </Button>
        )}
      </div>
    </form>
  );
}
