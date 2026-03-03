"use client";

import { type ColumnDef, type Row } from "@tanstack/react-table";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROUTE_STATUS_LABELS } from "@/lib/constants/route-status";
import { UNIT_TYPE_LABELS } from "@/lib/constants/unit-type";
import { formatMxn } from "@/lib/utils";
import type { Route } from "@/types/route.types";

export interface RoutesColumnsOptions {
  onDelete?: (route: Route) => void;
  viewOnly?: boolean;
  /** Vista transportista: solo Origen y Destino (sin descripción, target, estado ni acciones). */
  carrierView?: boolean;
}

export function getRoutesColumns({
  onDelete,
  viewOnly = false,
  carrierView = false,
}: RoutesColumnsOptions): ColumnDef<Route>[] {
  const columns: ColumnDef<Route>[] = [
    {
      id: "search",
      accessorFn: (row) => `${row.origin} ${row.destination}`.toLowerCase(),
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
      accessorKey: "destinationState",
      header: "Estado",
      cell: ({ row }: { row: Row<Route> }) => {
        const state = row.original.destinationState;
        return state ? state : <span className="text-muted-foreground">—</span>;
      },
    },
    ...(carrierView
      ? []
      : ([
          {
            accessorKey: "unitType",
            header: "Tipo de unidad",
            cell: ({ row }: { row: Row<Route> }) =>
              UNIT_TYPE_LABELS[row.getValue("unitType") as Route["unitType"]],
          },
          {
            accessorKey: "description",
            header: "Descripción",
            cell: ({ row }: { row: Row<Route> }) => {
              const description = row.original.description?.trim() ?? "";
              if (!description) {
                return <span className="text-muted-foreground">—</span>;
              }
              return (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block max-w-[140px] truncate cursor-default sm:max-w-[220px]">
                      {description}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                    {description}
                  </TooltipContent>
                </Tooltip>
              );
            },
          },
          {
            accessorKey: "target",
            header: ({ column }: { column: { toggleSorting: (asc: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) => (
              <SortableColumnHeader column={column} title="Target (MXN)" />
            ),
            cell: ({ row }: { row: Row<Route> }) => {
              const target = row.original.target;
              if (target == null) return <span className="text-muted-foreground">—</span>;
              return `$${formatMxn(target)}`;
            },
          },
          {
            accessorKey: "weeklyVolume",
            header: "Vol./semana",
            cell: ({ row }: { row: Row<Route> }) => {
              const v = row.original.weeklyVolume;
              return v != null ? v : <span className="text-muted-foreground">—</span>;
            },
          },
          {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }: { row: Row<Route> }) =>
              ROUTE_STATUS_LABELS[row.getValue("status") as Route["status"]],
          },
        ] as ColumnDef<Route>[])),
  ];

  if (!viewOnly && onDelete) {
    columns.push({
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const route = row.original;
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" asChild aria-label="Editar ruta">
              <Link href={`/admin/dashboard/routes/${route.id}/edit`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(route)}
              aria-label="Eliminar ruta"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      },
      enableSorting: false,
    });
  }

  return columns;
}
