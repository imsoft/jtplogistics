"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { TICKET_STATUS_LABELS } from "@/lib/support";
import type { SupportTicketRow } from "@/types/support.types";

export const TICKET_STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800",
  in_progress: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export function formatTicketDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

/** Nombre del equipo relacionado, si el reporte trae uno. */
export function ticketEquipment(row: SupportTicketRow): string | null {
  return row.laptop?.name ?? row.phone?.name ?? null;
}

export function getMyTicketColumns(): ColumnDef<SupportTicketRow>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.title} ${row.description} ${ticketEquipment(row) ?? ""} ${
          TICKET_STATUS_LABELS[row.status]
        }`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "title",
      header: ({ column }) => <SortableColumnHeader column={column} title="Asunto" />,
      cell: ({ row }) => (
        <div className="min-w-0 max-w-[22rem]">
          <p className="truncate font-medium">{row.original.title}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.description}</p>
        </div>
      ),
    },
    {
      id: "equipment",
      accessorFn: (row) => ticketEquipment(row) ?? "",
      header: "Equipo",
      cell: ({ row }) => {
        const name = ticketEquipment(row.original);
        return name ?? <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => <SortableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <Badge className={TICKET_STATUS_STYLES[row.original.status]}>
          {TICKET_STATUS_LABELS[row.original.status]}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableColumnHeader column={column} title="Reportado" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap">{formatTicketDate(row.original.createdAt)}</span>
      ),
    },
    {
      id: "answer",
      header: "Respuesta",
      cell: ({ row }) =>
        row.original.resolution ? (
          <span className="line-clamp-1 max-w-[16rem] text-muted-foreground">
            {row.original.resolution}
          </span>
        ) : (
          <span className="text-muted-foreground">Sin respuesta aún</span>
        ),
    },
  ];
}
