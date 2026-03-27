"use client";

import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { formatMxn } from "@/lib/utils";
import type { Finance } from "@/types/finance.types";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getColumns(): ColumnDef<Finance>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.eco ?? ""} ${row.client ?? ""} ${row.origin ?? ""} ${row.destination ?? ""} ${row.product ?? ""} ${row.legalName ?? ""} ${row.operatorName ?? ""} ${row.truck ?? ""} ${row.trailer ?? ""} ${row.unit ?? ""} ${row.phone ?? ""} ${row.incident ?? ""} ${row.incidentType ?? ""}`,
      filterFn: "fuzzy",
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "eco",
      header: ({ column }) => <SortableColumnHeader column={column} title="ECO" />,
      cell: ({ row }) => row.getValue("eco") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "client",
      header: ({ column }) => <SortableColumnHeader column={column} title="Cliente" />,
      cell: ({ row }) => row.getValue("client") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "origin",
      header: ({ column }) => <SortableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) => row.getValue("origin") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "destination",
      header: ({ column }) => <SortableColumnHeader column={column} title="Destino" />,
      cell: ({ row }) => row.getValue("destination") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "sale",
      header: ({ column }) => <SortableColumnHeader column={column} title="Venta" />,
      cell: ({ row }) => {
        const v = row.getValue<number | null>("sale");
        return v != null ? `$${formatMxn(v)}` : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "cost",
      header: ({ column }) => <SortableColumnHeader column={column} title="Costo" />,
      cell: ({ row }) => {
        const v = row.getValue<number | null>("cost");
        return v != null ? `$${formatMxn(v)}` : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "operatorName",
      header: ({ column }) => <SortableColumnHeader column={column} title="Operador" />,
      cell: ({ row }) => row.getValue("operatorName") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "pickupDate",
      header: ({ column }) => <SortableColumnHeader column={column} title="Recolección" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("pickupDate");
        return v ? fmtDate(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "deliveryDate",
      header: ({ column }) => <SortableColumnHeader column={column} title="Entrega" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("deliveryDate");
        return v ? fmtDate(v) : <span className="text-muted-foreground">—</span>;
      },
    },
  ];
}

export function FinancesTable() {
  const router = useRouter();
  const { data: finances, isLoaded, error } = useAdminFetch<Finance>(
    "/api/admin/finances",
    "Error al cargar finanzas"
  );

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (finances.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay registros de finanzas.
      </p>
    );
  }

  return (
    <DataTable<Finance, unknown>
      columns={getColumns()}
      data={finances}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(finance) => router.push(`/admin/dashboard/finances/${finance.id}`)}
    />
  );
}
