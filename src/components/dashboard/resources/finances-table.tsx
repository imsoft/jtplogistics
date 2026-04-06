"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { toast } from "sonner";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { Button } from "@/components/ui/button";
import {
  downloadXlsxFromAoa,
  excelExportFilename,
  financesToExcelAoa,
} from "@/lib/excel-export";
import { FINANCE_TARIFF_COST_LABEL, FINANCE_TARIFF_SALE_LABEL } from "@/lib/constants/finance-tariff-labels";
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
      header: ({ column }) => (
        <SortableColumnHeader
          column={column}
          title={FINANCE_TARIFF_SALE_LABEL}
          className="h-auto min-h-8 max-w-[min(100%,220px)] whitespace-normal py-1.5 text-left font-medium leading-tight"
        />
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
      header: ({ column }) => (
        <SortableColumnHeader
          column={column}
          title={FINANCE_TARIFF_COST_LABEL}
          className="h-auto min-h-8 max-w-[min(100%,220px)] whitespace-normal py-1.5 text-left font-medium leading-tight"
        />
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

  const exportToExcel = useCallback(() => {
    const aoa = financesToExcelAoa(finances);
    downloadXlsxFromAoa(excelExportFilename("finanzas"), "Finanzas", aoa);
    toast.success("Archivo Excel descargado.");
  }, [finances]);

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
      filterPlaceholder="Buscar…"
      initialColumnVisibility={{ search: false }}
      getRowId={(row) => row.id}
      onRowClick={(finance) => router.push(`/admin/dashboard/finances/${finance.id}`)}
      toolbar={
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 sm:w-auto"
          onClick={exportToExcel}
          disabled={finances.length === 0}
        >
          <FileDown className="size-4 shrink-0" />
          Exportar Excel
        </Button>
      }
    />
  );
}
