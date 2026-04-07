"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import {
  CARRIER_SUGGESTION_STATUS_COLORS,
  CARRIER_SUGGESTION_STATUS_LABELS,
} from "@/lib/constants/carrier-suggestion-status";
import type { CarrierSuggestion } from "@/types/carrier-suggestion.types";

interface CarrierSuggestionsTableProps {
  mode: "carrier" | "admin";
}

export function CarrierSuggestionsTable({ mode }: CarrierSuggestionsTableProps) {
  const router = useRouter();
  const endpoint =
    mode === "admin" ? "/api/admin/carrier-suggestions" : "/api/carrier/suggestions";
  const { data: rows, isLoaded, error } = useAdminFetch<CarrierSuggestion>(
    endpoint,
    "Error al cargar sugerencias"
  );

  const columns = useMemo<ColumnDef<CarrierSuggestion>[]>(() => {
    const base: ColumnDef<CarrierSuggestion>[] = [
      {
        id: "search",
        accessorFn: (row) =>
          `${row.title} ${row.description ?? ""} ${row.carrierName ?? ""} ${row.carrierEmail ?? ""} ${row.status}`,
        filterFn: "fuzzy",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <SortableColumnHeader column={column} title="Título" />,
        cell: ({ row }) => <span className="font-medium">{row.original.title}</span>,
      },
    ];

    if (mode === "admin") {
      base.push({
        accessorKey: "carrierName",
        header: ({ column }) => <SortableColumnHeader column={column} title="Transportista" />,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.carrierName ?? "—"}</span>
        ),
      });
    }

    base.push(
      {
        accessorKey: "status",
        header: ({ column }) => <SortableColumnHeader column={column} title="Estado" />,
        cell: ({ row }) => {
          const status = row.original.status ?? "pending";
          const color =
            CARRIER_SUGGESTION_STATUS_COLORS[status] ??
            "bg-secondary text-secondary-foreground";
          return (
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>
              {CARRIER_SUGGESTION_STATUS_LABELS[status] ?? status}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => <SortableColumnHeader column={column} title="Fecha" />,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {new Date(row.original.createdAt).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        ),
      }
    );

    return base;
  }, [mode]);

  if (!isLoaded) {
    return <p className="text-muted-foreground text-sm">Cargando…</p>;
  }

  if (error) {
    return (
      <p className="text-destructive rounded-lg border border-dashed p-4 text-center text-sm">
        {error}
      </p>
    );
  }

  return (
    <DataTable
      columns={columns}
      data={rows}
      filterColumn="search"
      filterPlaceholder="Buscar sugerencias…"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(row) =>
        router.push(
          mode === "admin"
            ? `/admin/dashboard/carrier-suggestions/${row.id}`
            : `/carrier/dashboard/suggestions/${row.id}/edit`
        )
      }
    />
  );
}
