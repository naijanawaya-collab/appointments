"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Reorderable list (ED-3): drag with mouse/touch, or keyboard: focus a
 * handle, Space to lift, ↑↓ (or ←→ in grids) to move, Space to drop, Esc to
 * cancel. Moves are announced to screen readers.
 */
export function SortableList<T extends { id: string }>({
  items,
  label,
  itemLabel,
  onReorder,
  renderItem,
  layout = "list",
  className = "",
}: {
  items: T[];
  /** Accessible name of the list */
  label: string;
  itemLabel: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, handle: ReactNode, state: { dragging: boolean }) => ReactNode;
  layout?: "list" | "grid";
  className?: string;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(items.map((i) => [i.id, i]));
  const name = (id: string | number) => {
    const item = byId.get(String(id));
    return item ? itemLabel(item) : "item";
  };
  const position = (id: string | number) => items.findIndex((i) => i.id === id) + 1;

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = items.findIndex((i) => i.id === e.active.id);
    const to = items.findIndex((i) => i.id === e.over!.id);
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "To move an item, press Space. Use the arrow keys to move it, Space to drop it, or Escape to cancel.",
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${name(active.id)}, position ${position(active.id)} of ${items.length}.`,
          onDragOver: ({ active, over }) => (over ? `${name(active.id)} moved to position ${position(over.id)} of ${items.length}.` : `${name(active.id)} is outside the list.`),
          onDragEnd: ({ active, over }) => (over ? `${name(active.id)} dropped at position ${position(over.id)} of ${items.length}.` : `${name(active.id)} dropped.`),
          onDragCancel: ({ active }) => `Moving ${name(active.id)} cancelled.`,
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}>
        <ul className={`ed-sortable ed-sortable-${layout} ${className}`} aria-label={label}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id} label={itemLabel(item)}>
              {(handle, dragging) => renderItem(item, handle, { dragging })}
            </SortableItem>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, label, children }: { id: string; label: string; children: (handle: ReactNode, dragging: boolean) => ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button type="button" ref={setActivatorNodeRef} className="ed-handle" aria-label={`Move ${label}`} {...attributes} {...listeners}>
      <GripVertical size={18} aria-hidden />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      className={isDragging ? "is-dragging" : undefined}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }}
    >
      {children(handle, isDragging)}
    </li>
  );
}
