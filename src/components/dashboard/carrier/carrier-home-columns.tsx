"use client";

import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { MoveRight } from "lucide-react";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { formatMxn } from "@/lib/utils";
import type { CarrierHomeRouteRow } from "@/types/carrier-home.types";

export function getCarrierHomeColumns(): ColumnDef<CarrierHomeRouteRow>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.origin} ${row.destination} ${row.unitTypeLabel} ${row.description ?? ""}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "origin",
      header: ({ column }) => <SortableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("origin")}</span>
      ),
    },
    {
      accessorKey: "destination",
      header: ({ column }) => <SortableColumnHeader column={column} title="Destino" />,
      cell: ({ row }) => row.getValue("destination") as string,
    },
    {
      accessorKey: "unitTypeLabel",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo de unidad" />,
      cell: ({ row }) => row.original.unitTypeLabel,
    },
    {
      accessorKey: "jtpTarget",
      header: ({ column }) => <SortableColumnHeader column={column} title="Target JTP (MXN)" />,
      cell: ({ row }) => {
        const v = row.original.jtpTarget;
        return v != null ? `$${formatMxn(v)}` : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "carrierTarget",
      header: ({ column }) => <SortableColumnHeader column={column} title="Mi target (MXN)" />,
      cell: ({ row }) => {
        const v = row.original.carrierTarget;
        return v != null ? `$${formatMxn(v)}` : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "carrierWeeklyVolume",
      header: "Vol./semana",
      cell: ({ row }) => {
        const v = row.original.carrierWeeklyVolume;
        return v != null ? v : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <Link
          href={`/carrier/dashboard/unit-types/${row.original.unitType}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Gestionar
          <MoveRight className="size-3.5" />
        </Link>
      ),
      enableSorting: false,
    },
  ];
}
