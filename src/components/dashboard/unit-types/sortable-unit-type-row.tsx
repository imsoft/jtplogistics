"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableUnitTypeRowProps {
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export function SortableUnitTypeRow({ id, disabled, children }: SortableUnitTypeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-4 py-3",
        isDragging && "z-10 bg-card opacity-90 shadow-md ring-1 ring-border"
      )}
    >
      <button
        type="button"
        className={cn(
          "touch-none text-muted-foreground hover:text-foreground shrink-0 rounded-md p-1 -ml-1",
          disabled && "pointer-events-none opacity-40"
        )}
        aria-label="Arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>
      <div className="min-w-0 flex-1 flex items-center gap-3">{children}</div>
    </div>
  );
}
