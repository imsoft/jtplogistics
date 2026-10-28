"use client";

import { useMemo, useState } from "react";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FINANCE_TARIFF_COST_LABEL, FINANCE_TARIFF_SALE_LABEL } from "@/lib/constants/finance-tariff-labels";
import { formatMxn } from "@/lib/utils";
import { SHIPMENT_STATUS_CONFIG } from "@/components/dashboard/resources/shipments-table";
import type { FinanceListRow } from "@/types/finance.types";
import type { ShipmentStatus } from "@/types/shipment.types";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { RowDeleteDialog } from "@/components/dashboard/resources/row-delete-dialog";

function fmtDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    // La fecha se guarda a medianoche UTC: en hora de México sería el día anterior.
    timeZone: "UTC",
  });
}

function getColumns(): ColumnDef<FinanceListRow>[] {
  return [
    {
      id: "search",
      accessorFn: (row) =>
        `${row.status} ${row.eco ?? ""} ${row.client ?? ""} ${row.origin ?? ""} ${row.destination ?? ""} ${row.product ?? ""} ${row.legalName ?? ""} ${row.operatorName ?? ""} ${row.truck ?? ""} ${row.trailer ?? ""} ${row.unit ?? ""} ${row.phone ?? ""} ${row.incident ?? ""} ${row.incidentType ?? ""}`,
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
        const status = row.getValue<string>("status");
        const cfg = SHIPMENT_STATUS_CONFIG[status as ShipmentStatus];
        return (
          <Badge
            variant="outline"
            className={`whitespace-nowrap border-0 text-xs font-medium ${cfg?.badgeClass ?? ""}`}
          >
            {cfg?.label ?? status}
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
      meta: { className: "hidden @3xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) => row.getValue("origin") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "destination",
      meta: { className: "hidden @3xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Destino" />,
      cell: ({ row }) => row.getValue("destination") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "sale",
      header: ({ column }) => (
        // Título corto en la tabla: el largo apila el encabezado en cinco
        // renglones en laptops. El nombre completo sale al pasar el cursor.
        <span title={FINANCE_TARIFF_SALE_LABEL}>
          <SortableColumnHeader column={column} title="Venta" />
        </span>
      ),
      cell: ({ row }) => {
        const v = row.getValue<number | null>("sale");
        return v != null ? (
          <span className="whitespace-nowrap font-medium tabular-nums">${formatMxn(v)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "cost",
      meta: { className: "hidden @xl/table:table-cell" },
      header: ({ column }) => (
        // Título corto en la tabla: el largo apila el encabezado en cinco
        // renglones en laptops. El nombre completo sale al pasar el cursor.
        <span title={FINANCE_TARIFF_COST_LABEL}>
          <SortableColumnHeader column={column} title="Compra" />
        </span>
      ),
      cell: ({ row }) => {
        const v = row.getValue<number | null>("cost");
        return v != null ? (
          <span className="whitespace-nowrap font-medium tabular-nums">${formatMxn(v)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "operatorName",
      meta: { className: "hidden @4xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Operador" />,
      cell: ({ row }) => row.getValue("operatorName") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "pickupDate",
      meta: { className: "hidden @5xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Recolección" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("pickupDate");
        return v ? fmtDate(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "deliveryDate",
      meta: { className: "hidden @5xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Entrega" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("deliveryDate");
        return v ? fmtDate(v) : <span className="text-muted-foreground">—</span>;
      },
    },
  ];
}

interface FinancesTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
  /** Dirección quita tarifas siempre; el colaborador con el permiso de eliminar en Finanzas. */
  isAdmin?: boolean;
}

export function FinancesTable({
  apiEndpoint = "/api/admin/finances",
  detailBasePath = "/admin/dashboard/finances",
  isAdmin = true,
}: FinancesTableProps = {}) {
  const endpoint = apiEndpoint;
  const detailBase = detailBasePath;
  const router = useRouter();
  const { permissions } = useCollaboratorPermissions();
  const canDelete = isAdmin || Boolean(permissions?.canDeleteFinances);
  const [clearing, setClearing] = useState<FinanceListRow | null>(null);
  const columns = useMemo(() => {
    const base = getColumns();
    if (!canDelete) return base;
    const actions: ColumnDef<FinanceListRow> = {
      id: "actions",
      // Pegada al borde derecho: en laptops la tabla se recorre de lado y el
      // botón quedaría escondido al final.
      meta: { className: "sticky right-0 z-[1] bg-background w-10" },
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) =>
        row.original.sale == null && row.original.cost == null ? null : (
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Quitar tarifas del embarque ${row.original.eco ?? ""}`}
            title="Quitar tarifas"
            onClick={(e) => {
              e.stopPropagation();
              setClearing(row.original);
            }}
          >
            <Trash2 className="text-destructive size-3.5" />
          </Button>
        ),
    };
    return [...base, actions];
  }, [canDelete]);
  const { data: rows, isLoaded, error, reload } = useAdminFetch<FinanceListRow>(
    endpoint,
    "Error al cargar finanzas"
  );


  if (!isLoaded) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay embarques registrados.
      </p>
    );
  }

  async function clearTariffs() {
    if (!clearing) return;
    const res = await fetch(`${endpoint}/${clearing.id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudieron quitar las tarifas.");
    toast.success("Tarifas eliminadas.");
    reload();
  }

  return (
    <>
    <RowDeleteDialog
      open={clearing !== null}
      title="¿Quitar las tarifas?"
      description={
        <>
          Se quitarán la tarifa de venta
          {clearing?.sale != null ? ` ($${formatMxn(clearing.sale)})` : ""} y la de compra
          {clearing?.cost != null ? ` ($${formatMxn(clearing.cost)})` : ""} del embarque{" "}
          <strong>{clearing?.eco ?? "sin ECO"}</strong>. El embarque sigue en su tabla y las cifras quedan en la
          bitácora por si hay que reponerlas.
        </>
      }
      confirmLabel="Quitar tarifas"
      onConfirm={clearTariffs}
      onClose={() => setClearing(null)}
    />
    <DataTable<FinanceListRow, unknown>
      exportTitle="Tabla de finanzas"
      columns={columns}
      data={rows}
      filterColumn="search"
      filterPlaceholder="Buscar embarques…"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(row) => router.push(`${detailBase}/${row.id}`)}
    />
    </>
  );
}
