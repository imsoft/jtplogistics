import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SortableColumnHeaderProps {
  column: {
    toggleSorting: (desc: boolean) => void;
    getIsSorted: () => false | "asc" | "desc";
  };
  title: string;
  /** Para títulos largos (p. ej. tarifas en finanzas). */
  className?: string;
}

export function SortableColumnHeader({ column, title, className }: SortableColumnHeaderProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 size-4 shrink-0" />
    </Button>
  );
}
