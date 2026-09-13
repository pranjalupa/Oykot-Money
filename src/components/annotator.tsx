"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  ArrowArcLeft,
  ArrowArcRight,
  ArrowCounterClockwise,
  Check,
  Crosshair,
  Eye,
  NotePencil,
  PencilSimple,
  Trash,
  X,
} from "@phosphor-icons/react";
import {
  createAnnotation,
  deleteAnnotation,
  listAnnotations,
  restoreAnnotation,
  setAnnotationStatus,
  updateAnnotationNote,
  type Annotation,
} from "@/app/annotation-actions";
import { cn } from "@/lib/utils";

/**
 * Point at anything on any page, write a note, and it's saved against that
 * spot. Rendered only for the accounts in lib/annotator.ts.
 *
 * Everything the tool draws sits inside [data-annotator], which is how pick
 * mode tells "the page" apart from "the tool".
 *
 * Shortcuts: Alt+Shift+A picks, Alt+Shift+L opens the list, Esc backs out,
 * ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z undo and redo while the list is open.
 */

type Rect = { top: number; left: number; width: number; height: number };
type Target = {
  rect: Rect;
  selector: string;
  tagName: string;
  elementText: string | null;
  selectedText: string | null;
};
type Step = { label: string; run: () => Promise<void>; revert: () => Promise<void> };

const ROOT = "[data-annotator]";
const INTERACTIVE = "a, button, input, select, textarea, label, summary, [role=button], [role=tab], [role=link], [role=menuitem], [role=switch], [role=checkbox]";

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/** A CSS path from the nearest usable id (or body) down to the element. */
function selectorFor(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node !== document.body && node !== document.documentElement) {
    // Generated ids (React's useId, Base UI, Radix) change between loads; skip them.
    if (node.id && /^[A-Za-z][\w-]*$/.test(node.id) && !GENERATED_ID.test(node.id)) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      return parts.join(" > ");
    }
    const parent: Element | null = node.parentElement;
    const tag = node.tagName.toLowerCase();
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${siblings.indexOf(node) + 1})` : tag);
    node = parent;
  }
  return ["body", ...parts].join(" > ");
}

const GENERATED_ID = /^(base-ui-|radix-)|_[rR]_/;

const textOf = (el: Element) => (el as HTMLElement).innerText?.replace(/\s+/g, " ").trim().slice(0, 500) || null;

/** By selector first; if the page has shifted, the same tag with the same text. */
function findTarget(a: Pick<Annotation, "selector" | "tagName" | "elementText">): Element | null {
  try {
    const el = document.querySelector(a.selector);
    if (el) return el;
  } catch {
    // An old selector can be invalid CSS; fall through to the text match.
  }
  if (!a.tagName || !a.elementText) return null;
  const want = a.elementText.slice(0, 80);
  return (
    Array.from(document.querySelectorAll(a.tagName)).find(
      (el) => !el.closest(ROOT) && textOf(el)?.startsWith(want),
    ) ?? null
  );
}
const pathOnly = (p: string) => p.split("?")[0];
const inTool = (el: EventTarget | null) => el instanceof Element && !!el.closest(ROOT);

export function Annotator() {
  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState<Annotation[]>([]);
  const [picking, setPicking] = useState(false);
  const [hover, setHover] = useState<Rect | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [scope, setScope] = useState<"page" | "all">("page");
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">("open");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [pins, setPins] = useState<{ id: string; n: number; top: number; left: number }[]>([]);
  const [flash, setFlash] = useState<Rect | null>(null);
  const [pendingShow, setPendingShow] = useState<Annotation | null>(null);
  const hoverEl = useRef<Element | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await listAnnotations());
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    listAnnotations().then(setItems, (e: Error) => toast.error(e.message));
  }, []);

  /** Oldest is #1, so a number never changes when new notes are added. */
  const numbers = useMemo(() => {
    const byAge = [...items].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    return new Map(byAge.map((a, i) => [a.id, i + 1]));
  }, [items]);

  const openHere = useMemo(
    () => items.filter((a) => a.status === "open" && pathOnly(a.path) === pathname),
    [items, pathname],
  );

  const visible = items.filter(
    (a) =>
      (scope === "all" || pathOnly(a.path) === pathname) &&
      (statusFilter === "all" || a.status === statusFilter),
  );

  /* ---------------------------------------------------------------- history */

  // The stacks live in a ref so undo/redo stay stable — a toast's Undo button
  // outlives the render that created it. `depth` is only there to re-render
  // the header buttons.
  const stacks = useRef<{ undo: Step[]; redo: Step[] }>({ undo: [], redo: [] });
  const [depth, setDepth] = useState({ undo: 0, redo: 0 });
  const syncDepth = useCallback(
    () => setDepth({ undo: stacks.current.undo.length, redo: stacks.current.redo.length }),
    [],
  );

  const redo = useCallback(async () => {
    const step = stacks.current.redo.pop();
    if (!step) return;
    try {
      await step.run();
      stacks.current.undo.push(step);
      toast(`Redid: ${step.label.toLowerCase()}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
    syncDepth();
    await refresh();
  }, [refresh, syncDepth]);

  const undo = useCallback(async () => {
    const step = stacks.current.undo.pop();
    if (!step) return;
    try {
      await step.revert();
      stacks.current.redo.push(step);
      toast(`Undid: ${step.label.toLowerCase()}`, { action: { label: "Redo", onClick: () => redo() } });
    } catch (e) {
      toast.error((e as Error).message);
    }
    syncDepth();
    await refresh();
  }, [redo, refresh, syncDepth]);

  /** Record a step that has already happened. */
  const record = useCallback(
    (step: Step) => {
      stacks.current = { undo: [...stacks.current.undo, step], redo: [] };
      syncDepth();
      toast(step.label, { action: { label: "Undo", onClick: () => undo() } });
    },
    [syncDepth, undo],
  );

  const perform = useCallback(
    async (step: Step) => {
      try {
        await step.run();
        record(step);
      } catch (e) {
        toast.error((e as Error).message);
      }
      await refresh();
    },
    [record, refresh],
  );

  /* -------------------------------------------------------------- pick mode */

  useEffect(() => {
    if (!picking) return;

    const onMove = (e: PointerEvent) => {
      const el = e.target instanceof Element && !inTool(e.target) ? e.target : null;
      hoverEl.current = el;
      setHover(el ? rectOf(el) : null);
    };
    // Stop buttons and links reacting while you aim at them.
    const onDown = (e: PointerEvent) => {
      if (inTool(e.target)) return;
      if (e.target instanceof Element && e.target.closest(INTERACTIVE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (inTool(e.target) || !(e.target instanceof Element)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // A text selection wins over the element under the pointer.
      const sel = window.getSelection();
      const selected = sel && !sel.isCollapsed ? sel.toString().replace(/\s+/g, " ").trim() : "";
      let el: Element = e.target;
      let rect = rectOf(el);
      if (selected && sel!.rangeCount) {
        const range = sel!.getRangeAt(0);
        const node = range.commonAncestorContainer;
        el = node instanceof Element ? node : (node.parentElement ?? el);
        const r = range.getBoundingClientRect();
        rect = { top: r.top, left: r.left, width: r.width, height: r.height };
      }
      setTarget({
        rect,
        selector: selectorFor(el),
        tagName: el.tagName.toLowerCase(),
        elementText: textOf(el),
        selectedText: selected ? selected.slice(0, 1000) : null,
      });
      setDraft("");
      setPicking(false);
    };

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("click", onClick, true);
    document.documentElement.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("click", onClick, true);
      document.documentElement.style.cursor = "";
      setHover(null);
    };
  }, [picking]);

  /* -------------------------------------------------------------- shortcuts */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest("input, textarea, [contenteditable=true]");
      if (e.key === "Escape") {
        if (picking) setPicking(false);
        else if (target) setTarget(null);
        else if (editing) setEditing(null);
        return;
      }
      if (e.altKey && e.shiftKey && e.code === "KeyA") {
        e.preventDefault();
        setTarget(null);
        setPicking((p) => !p);
      } else if (e.altKey && e.shiftKey && e.code === "KeyL") {
        e.preventDefault();
        setPanelOpen((o) => !o);
      } else if (panelOpen && !typing && (e.metaKey || e.ctrlKey) && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [picking, target, editing, panelOpen, undo, redo]);

  /* ------------------------------------------------------------------- pins */

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setPins(
          openHere.flatMap((a) => {
            const el = findTarget(a);
            if (!el) return [];
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return [];
            return [{ id: a.id, n: numbers.get(a.id) ?? 0, top: r.top, left: r.left + r.width }];
          }),
        );
      });
    };
    measure();
    // Pages stream in and re-render; a slow poll catches what events don't.
    const poll = window.setInterval(measure, 1000);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(poll);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [openHere, numbers]);

  /* ------------------------------------------------------------------- show */

  const show = (a: Annotation) => {
    if (pathOnly(a.path) !== pathname) router.push(a.path);
    setPendingShow(a);
  };

  useEffect(() => {
    if (!pendingShow || pathOnly(pendingShow.path) !== pathname) return;
    let tries = 0;
    let clear = 0;
    const attempt = window.setInterval(() => {
      const el = findTarget(pendingShow);
      if (el || ++tries > 30) {
        window.clearInterval(attempt);
        setPendingShow(null);
        if (!el) {
          toast("That spot isn't on the page any more", { description: pendingShow.elementText ?? undefined });
          return;
        }
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        window.setTimeout(() => setFlash(rectOf(el)), 350);
        clear = window.setTimeout(() => setFlash(null), 2200);
      }
    }, 100);
    return () => {
      window.clearInterval(attempt);
      window.clearTimeout(clear);
    };
  }, [pendingShow, pathname]);

  /* ---------------------------------------------------------------- actions */

  const save = async () => {
    if (!target || !draft.trim()) return;
    setSaving(true);
    try {
      const row = await createAnnotation({
        path: window.location.pathname + window.location.search,
        pageTitle: document.title,
        selector: target.selector,
        tagName: target.tagName,
        elementText: target.elementText,
        selectedText: target.selectedText,
        note: draft,
        viewportWidth: window.innerWidth,
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      });
      setTarget(null);
      setDraft("");
      record({
        label: "Annotation saved",
        run: () => restoreAnnotation(row),
        revert: () => deleteAnnotation(row.id),
      });
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (a: Annotation) => {
    const next = a.status === "open" ? "resolved" : "open";
    perform({
      label: next === "resolved" ? `Resolved #${numbers.get(a.id)}` : `Reopened #${numbers.get(a.id)}`,
      run: () => setAnnotationStatus(a.id, next),
      revert: () => setAnnotationStatus(a.id, a.status),
    });
  };

  const remove = (a: Annotation) =>
    perform({
      label: `Deleted #${numbers.get(a.id)}`,
      run: () => deleteAnnotation(a.id),
      revert: () => restoreAnnotation(a),
    });

  const saveEdit = (a: Annotation) => {
    if (!editing || !editing.text.trim() || editing.text === a.note) return setEditing(null);
    const text = editing.text;
    setEditing(null);
    perform({
      label: `Edited #${numbers.get(a.id)}`,
      run: () => updateAnnotationNote(a.id, text),
      revert: () => updateAnnotationNote(a.id, a.note),
    });
  };

  /* ----------------------------------------------------------------- render */

  const composerStyle = target ? placeNear(target.rect, 320, 190) : undefined;

  return (
    <div data-annotator className="print:hidden">
      {/* Hover outline while picking */}
      {picking && hover && <Outline rect={hover} className="border-primary bg-primary/10" />}
      {target && <Outline rect={target.rect} className="border-primary bg-primary/10" />}
      {flash && <Outline rect={flash} className="animate-pulse border-primary bg-primary/20" />}

      {/* Pins on this page */}
      {!picking &&
        pins.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              setPanelOpen(true);
              setScope("page");
              setStatusFilter("open");
              document.getElementById(`annotation-${p.id}`)?.scrollIntoView({ block: "nearest" });
            }}
            aria-label={`Annotation ${p.n}`}
            className="fixed z-[70] flex size-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-md ring-2 ring-background transition-transform hover:scale-125"
            style={{ top: p.top, left: p.left }}
          >
            {p.n}
          </button>
        ))}

      {/* Composer */}
      {target && (
        <div
          className="fixed z-[80] w-80 rounded-xl border border-border bg-card p-3 text-card-foreground shadow-xl"
          style={composerStyle}
        >
          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
            {target.selectedText ? (
              <>Selected “{target.selectedText}”</>
            ) : (
              <>
                <code className="rounded bg-muted px-1">{target.tagName}</code> {target.elementText ?? ""}
              </>
            )}
          </p>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
            }}
            rows={3}
            placeholder="What should change here?"
            className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">⌘↵ to save</span>
            <div className="flex gap-1.5">
              <ToolButton onClick={() => setTarget(null)}>Cancel</ToolButton>
              <ToolButton primary disabled={!draft.trim() || saving} onClick={save}>
                {saving ? "Saving…" : "Save"}
              </ToolButton>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {panelOpen && (
        <aside className="fixed right-3 bottom-20 z-[75] flex max-h-[min(640px,calc(100svh-7rem))] w-[380px] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <p className="font-heading text-sm font-semibold">Annotations</p>
            <div className="flex items-center gap-0.5">
              <IconAction label="Undo (⌘Z)" disabled={!depth.undo} onClick={undo}>
                <ArrowArcLeft size={16} />
              </IconAction>
              <IconAction label="Redo (⌘⇧Z)" disabled={!depth.redo} onClick={redo}>
                <ArrowArcRight size={16} />
              </IconAction>
              <IconAction label="Close" onClick={() => setPanelOpen(false)}>
                <X size={16} />
              </IconAction>
            </div>
          </header>
          <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
            <Segmented
              value={scope}
              onChange={setScope}
              options={[
                ["page", "This page"],
                ["all", "All pages"],
              ]}
            />
            <Segmented
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                ["open", "Open"],
                ["resolved", "Resolved"],
                ["all", "All"],
              ]}
            />
          </div>
          <ol className="flex-1 overflow-y-auto">
            {visible.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nothing here. Press <strong>Annotate</strong> and click anything on the page.
              </li>
            )}
            {visible.map((a) => (
              <li
                key={a.id}
                id={`annotation-${a.id}`}
                className={cn("border-b border-border px-3 py-3 last:border-b-0", a.status === "resolved" && "opacity-70")}
              >
                <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {numbers.get(a.id)}
                  </span>
                  {a.status === "resolved" && <span className="font-medium text-primary">Resolved</span>}
                  {scope === "all" && <code className="truncate">{a.path}</code>}
                  <span className="ml-auto shrink-0">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</span>
                </div>
                <p className="mb-1.5 line-clamp-2 text-xs text-muted-foreground">
                  {a.selectedText ? <>“{a.selectedText}”</> : <>{a.elementText ?? `<${a.tagName}>`}</>}
                </p>
                {editing?.id === a.id ? (
                  <textarea
                    autoFocus
                    value={editing.text}
                    onChange={(e) => setEditing({ id: a.id, text: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveEdit(a);
                    }}
                    onBlur={() => saveEdit(a)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{a.note}</p>
                )}
                {a.reply && (
                  <p className="mt-2 rounded-lg bg-muted px-2.5 py-2 text-xs whitespace-pre-wrap">
                    <span className="font-semibold">Claude: </span>
                    {a.reply}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-0.5">
                  <IconAction label="Show on page" onClick={() => show(a)}>
                    <Eye size={15} />
                  </IconAction>
                  <IconAction label="Edit" onClick={() => setEditing({ id: a.id, text: a.note })}>
                    <PencilSimple size={15} />
                  </IconAction>
                  <IconAction label={a.status === "open" ? "Resolve" : "Reopen"} onClick={() => toggleStatus(a)}>
                    {a.status === "open" ? <Check size={15} /> : <ArrowCounterClockwise size={15} />}
                  </IconAction>
                  <IconAction label="Delete" danger onClick={() => remove(a)}>
                    <Trash size={15} />
                  </IconAction>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      )}

      {/* Launcher */}
      <div className="fixed right-3 bottom-3 z-[75] flex items-center gap-1 rounded-full border border-border bg-card p-1 text-card-foreground shadow-lg">
        <button
          type="button"
          onClick={() => {
            setTarget(null);
            setPicking((p) => !p);
          }}
          title="Alt+Shift+A"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
            picking ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          <Crosshair size={16} weight={picking ? "bold" : "regular"} />
          {picking ? "Click anything · Esc" : "Annotate"}
        </button>
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          title="Alt+Shift+L"
          aria-label="Annotation list"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
            panelOpen ? "bg-muted" : "hover:bg-muted",
          )}
        >
          <NotePencil size={16} />
          <span className="tabular-nums">{items.filter((a) => a.status === "open").length}</span>
        </button>
      </div>
    </div>
  );
}

/** Below the target if it fits, otherwise above, always inside the viewport. */
function placeNear(rect: Rect, width: number, height: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const below = rect.top + rect.height + 8;
  const top = below + height < vh ? below : Math.max(8, rect.top - height - 8);
  const left = Math.min(Math.max(8, rect.left), vw - width - 8);
  return { top, left };
}

function Outline({ rect, className }: { rect: Rect; className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none fixed z-[65] rounded-md border-2 transition-all duration-75", className)}
      style={{ top: rect.top - 3, left: rect.left - 3, width: rect.width + 6, height: rect.height + 6 }}
    />
  );
}

function ToolButton({
  primary,
  className,
  ...props
}: React.ComponentProps<"button"> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "h-8 rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-50",
        primary ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted",
        className,
      )}
      {...props}
    />
  );
}

function IconAction({
  label,
  danger,
  children,
  ...props
}: Omit<React.ComponentProps<"button">, "aria-label"> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="flex rounded-lg bg-muted p-0.5">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
            value === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
