"use client";

import { useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { CategoryIcon, ICON_GROUPS } from "@/components/category-icon";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Pick an icon by looking at it.
 *
 * The value rides along in a hidden input so this drops into the existing
 * form-action dialogs without any of them needing to become controlled.
 *
 * Search matches the icon's own name *and* its group heading, so "food" finds
 * the fork and "travel"-ish words find the plane — nobody knows an icon is
 * called `ForkKnife`, which is exactly what made the old dropdown unusable.
 */
export function IconPicker({
  name = "icon",
  defaultValue,
  id,
  label = "Icon",
}: {
  name?: string;
  defaultValue?: string | null;
  id: string;
  label?: string;
}) {
  const [selected, setSelected] = useState(defaultValue || "Tag");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_GROUPS;
    return ICON_GROUPS.map((g) => ({
      label: g.label,
      icons: g.label.toLowerCase().includes(q)
        ? g.icons
        : g.icons.filter((i) => i.toLowerCase().includes(q)),
    })).filter((g) => g.icons.length > 0);
  }, [query]);

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${id}-search`}>{label}</Label>
      <input type="hidden" name={name} value={selected} />

      <div className="relative">
        <MagnifyingGlass
          size={14}
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={`${id}-search`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons"
          className="h-8 pl-8 text-sm"
          // Enter in a search box inside a form would submit the dialog.
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        />
      </div>

      <div
        role="radiogroup"
        aria-label={label}
        className="max-h-52 overflow-y-auto rounded-md border border-border bg-muted/30 p-2"
      >
        {groups.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            Nothing matches &ldquo;{query}&rdquo;.
          </p>
        )}

        {groups.map((g) => (
          <div key={g.label} className="mb-2 last:mb-0">
            <p className="mb-1 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {g.label}
            </p>
            <div className="grid grid-cols-8 gap-1 max-[420px]:grid-cols-6">
              {g.icons.map((icon) => {
                const isOn = icon === selected;
                return (
                  <button
                    key={icon}
                    type="button"
                    role="radio"
                    aria-checked={isOn}
                    // Every icon still carries its name for anyone who needs it,
                    // it just isn't the only way to find one any more.
                    title={icon}
                    aria-label={icon}
                    onClick={() => setSelected(icon)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      isOn
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <CategoryIcon name={icon} size={18} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
