import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SortableColumnHeaderProps {
  column: {
    toggleSorting: (desc: boolean) => void;
    getIsSorted: () => false | "asc" | "desc";
  };
  title: string;
}

export function SortableColumnHeader({ column, title }: SortableColumnHeaderProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown className="ml-2 size-4" />
    </Button>
  );
}
