"use client";

import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { Badge } from "@/components/ui/badge";
import type { Shipment, ShipmentStatus } from "@/types/shipment.types";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; badgeClass: string; rowClass: string }
> = {
  pending: {
    label: "Pendiente",
    badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    rowClass: "",
  },
  delivered: {
    label: "Entregado",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    rowClass: "bg-blue-50 dark:bg-blue-950/40",
  },
  delivered_with_delay: {
    label: "Entregado con retraso",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    rowClass: "bg-purple-50 dark:bg-purple-950/40",
  },
  not_delivered: {
    label: "No entregado",
    badgeClass: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    rowClass: "bg-orange-50 dark:bg-orange-950/40",
  },
  at_risk: {
    label: "En riesgo",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    rowClass: "bg-red-50 dark:bg-red-950/40",
  },
  returned: {
    label: "Cerrado",
    badgeClass: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
    rowClass: "bg-pink-50 dark:bg-pink-950/40",
  },
};

function getColumns(): ColumnDef<Shipment>[] {
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
      accessorKey: "status",
      header: ({ column }) => <SortableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => {
        const status = row.getValue<ShipmentStatus>("status");
        const config = SHIPMENT_STATUS_CONFIG[status] ?? SHIPMENT_STATUS_CONFIG.pending;
        return (
          <Badge variant="outline" className={`whitespace-nowrap text-xs font-medium border-0 ${config.badgeClass}`}>
            {config.label}
          </Badge>
        );
      },
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
    {
      accessorKey: "incident",
      header: ({ column }) => <SortableColumnHeader column={column} title="Incidencia" />,
      cell: ({ row }) => row.getValue("incident") ?? <span className="text-muted-foreground">—</span>,
    },
  ];
}

function getRowClassName(shipment: Shipment): string {
  return SHIPMENT_STATUS_CONFIG[shipment.status]?.rowClass ?? "";
}

export function ShipmentsTable() {
  const router = useRouter();
  const { data: shipments, isLoaded, error } = useAdminFetch<Shipment>(
    "/api/admin/shipments",
    "Error al cargar embarques"
  );

  if (!isLoaded) return <p className="text-muted-foreground">Cargando…</p>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (shipments.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay embarques registrados.
      </p>
    );
  }

  return (
    <DataTable<Shipment, unknown>
      columns={getColumns()}
      data={shipments}
      filterColumn="search"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(shipment) => router.push(`/admin/dashboard/shipments/${shipment.id}`)}
      getRowClassName={getRowClassName}
    />
  );
}
