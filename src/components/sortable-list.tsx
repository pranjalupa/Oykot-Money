"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical } from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Drag-to-reorder over a list of ids.
 *
 * The order is applied locally the moment you drop and the server is told
 * afterwards — waiting for a round trip makes a drag feel broken. If the save
 * fails, `onReorder` reports it and the list snaps back to `ids`.
 *
 * An 8px activation distance keeps a click on a row's own buttons from being
 * read as the start of a drag.
 */
export function SortableList({
  ids,
  onReorder,
  children,
  className,
}: {
  ids: string[];
  onReorder: (ids: string[]) => Promise<boolean>;
  children: (id: string, index: number) => React.ReactNode;
  className?: string;
}) {
  // Server order wins whenever it changes underneath us — a revalidate after
  // some other edit shouldn't leave the list showing a stale arrangement.
  //
  // Adjusted during render rather than in an effect: the parent builds a fresh
  // array every render so a reference check can't work, and an effect would
  // paint the stale order first and then correct it. Keying on the joined ids
  // and re-syncing here re-renders before anything reaches the screen.
  const key = ids.join(",");
  const [sync, setSync] = useState({ key, order: ids });
  if (sync.key !== key) setSync({ key, order: ids });
  const order = sync.order;
  const setOrder = (next: string[]) => setSync({ key, order: next });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;

    const previous = order;
    const next = arrayMove(order, from, to);
    setOrder(next);
    if (!(await onReorder(next))) setOrder(previous);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <ul className={className}>{order.map((id, i) => children(id, i))}</ul>
      </SortableContext>
    </DndContext>
  );
}

/**
 * One row. The handle is a real button so it lands in the tab order: focus it
 * and space/arrow-keys move the row, which is the whole reason the old arrow
 * buttons could be retired without losing keyboard access.
 */
export function SortableRow({
  id,
  children,
  className,
  handleLabel,
  disabled = false,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  handleLabel: string;
  disabled?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 bg-card",
        isDragging && "relative z-10 shadow-lg ring-1 ring-border",
        className,
      )}
    >
      {!disabled && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={handleLabel}
                className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <DotsSixVertical size={14} weight="bold" />
              </button>
            }
          />
          <TooltipContent className="max-[640px]:hidden">
            {handleLabel}
          </TooltipContent>
        </Tooltip>
      )}
      {children}
    </li>
  );
}
