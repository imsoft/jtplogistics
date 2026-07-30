"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useRouter } from "next/navigation";
import { useServerTable } from "@/hooks/use-server-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPhone } from "@/lib/utils";
import { formatIncidentYesNo } from "@/lib/incident-yes-no";
import { getIncidentTypeLabel } from "@/lib/incident-type-label";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import {
  downloadXlsxFromAoa,
  excelExportFilename,
  shipmentsToExcelAoa,
} from "@/lib/excel-export";
import type { Shipment, ShipmentStatus } from "@/types/shipment.types";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

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
    badgeClass: "bg-gray-100 text-gray-800",
    rowClass: "",
  },
  delivered: {
    label: "Entregado",
    badgeClass: "bg-blue-100 text-blue-800",
    rowClass: "bg-blue-50",
  },
  delivered_with_delay: {
    label: "Entregado con retraso",
    badgeClass: "bg-purple-100 text-purple-800",
    rowClass: "bg-purple-50",
  },
  not_delivered: {
    label: "No entregado",
    badgeClass: "bg-orange-100 text-orange-800",
    rowClass: "bg-orange-50",
  },
  at_risk: {
    label: "En riesgo",
    badgeClass: "bg-red-100 text-red-800",
    rowClass: "bg-red-50",
  },
  returned: {
    label: "Cerrado",
    badgeClass: "bg-pink-100 text-pink-800",
    rowClass: "bg-pink-50",
  },
};

const STATUS_FILTER_ALL = "all" as const;

function getColumns(incidentTypes: { value: string; label: string }[]): ColumnDef<Shipment>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => {
        const itLabel = getIncidentTypeLabel(row.incidentType, incidentTypes);
        return `${row.eco ?? ""} ${row.client ?? ""} ${row.legalName ?? ""} ${row.origin ?? ""} ${row.destination ?? ""} ${row.product ?? ""} ${row.truck ?? ""} ${row.trailer ?? ""} ${row.unit ?? ""} ${row.phone ?? ""} ${row.comments ?? ""} ${row.incident ?? ""} ${row.incidentType ?? ""} ${itLabel}`;
      },
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
      cell: ({ row }) => {
        const v = row.getValue<string | null>("client");
        return v ? (
          <span className="block max-w-45 truncate sm:max-w-55" title={v}>
            {v}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
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
      accessorKey: "legalName",
      header: ({ column }) => (
        <SortableColumnHeader column={column} title="Proveedor" />
      ),
      cell: ({ row }) => {
        const v = row.getValue<string | null>("legalName");
        return v ? (
          <span className="block max-w-35 truncate sm:max-w-45" title={v}>
            {v}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "comments",
      header: ({ column }) => <SortableColumnHeader column={column} title="Comentarios" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("comments")?.trim();
        if (!v) return <span className="text-muted-foreground">—</span>;
        const shortText = v.length > 48 ? `${v.slice(0, 48)}…` : v;
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-50 cursor-default truncate text-left sm:max-w-65">
                {shortText}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
              {v}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "incidentType",
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo de incidencia" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("incidentType")?.trim();
        if (!v) return <span className="text-muted-foreground">—</span>;
        const display = getIncidentTypeLabel(v, incidentTypes);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-35 cursor-default truncate sm:max-w-45">{display}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
              {display}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
    {
      accessorKey: "phone",
      header: ({ column }) => <SortableColumnHeader column={column} title="Celular" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("phone");
        return v ? (
          <span className="whitespace-nowrap font-mono text-xs">{formatPhone(v)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "incident",
      header: ({ column }) => <SortableColumnHeader column={column} title="Incidencia" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("incident")?.trim();
        if (!v) return <span className="text-muted-foreground">—</span>;
        const display = formatIncidentYesNo(v);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-35 cursor-default truncate sm:max-w-45">{display}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
              {display}
            </TooltipContent>
          </Tooltip>
        );
      },
    },
  ];
}

function getRowClassName(shipment: Shipment): string {
  return SHIPMENT_STATUS_CONFIG[shipment.status]?.rowClass ?? "";
}

interface ShipmentsTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
}

export function ShipmentsTable({
  apiEndpoint = "/api/admin/shipments",
  detailBasePath = "/admin/dashboard/shipments",
}: ShipmentsTableProps = {}) {
  const endpoint = apiEndpoint;
  const detailBase = detailBasePath;
  const router = useRouter();
  const incidentTypes = useIncidentTypes();
  const columns = useMemo(() => getColumns(incidentTypes), [incidentTypes]);
  const [compactView, setCompactView] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1500
  );

  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [pickupFrom, setPickupFrom] = useState("");
  const [pickupTo, setPickupTo] = useState("");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");

  const filters: Record<string, string> = {
    ...(statusFilter !== STATUS_FILTER_ALL ? { status: statusFilter } : {}),
    ...(pickupFrom ? { pickupFrom } : {}),
    ...(pickupTo ? { pickupTo } : {}),
    ...(deliveryFrom ? { deliveryFrom } : {}),
    ...(deliveryTo ? { deliveryTo } : {}),
  };

  const {
    data: shipments,
    total,
    pageIndex,
    pageCount,
    pageSize,
    setPageIndex,
    setPageSize,
    sorting,
    setSorting,
    search,
    setSearch,
    isLoading,
    isFetching,
    error,
    buildQuery,
  } = useServerTable<Shipment>({
    endpoint,
    pageSize: 20,
    filters,
    errorMessage: "Error al cargar embarques",
  });

  const hasActiveQuery =
    search.trim() !== "" || Object.keys(filters).length > 0;

  const clearFilters = useCallback(() => {
    setStatusFilter(STATUS_FILTER_ALL);
    setPickupFrom("");
    setPickupTo("");
    setDeliveryFrom("");
    setDeliveryTo("");
  }, []);

  useEffect(() => {
    const onResize = () => {
      setCompactView(window.innerWidth < 1500);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const exportToExcel = useCallback(async () => {
    try {
      const res = await fetch(`${endpoint}?${buildQuery({ all: "1" })}`);
      if (!res.ok) throw new Error();
      const json = (await res.json()) as { data: Shipment[] };
      const aoa = shipmentsToExcelAoa(json.data, incidentTypes);
      await downloadXlsxFromAoa(excelExportFilename("embarques"), "Embarques", aoa);
      toast.success("Archivo Excel descargado.");
    } catch {
      toast.error("No se pudo exportar el archivo.");
    }
  }, [buildQuery, incidentTypes, endpoint]);

  if (isLoading) return <DataTableSkeleton />;
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (total === 0 && !hasActiveQuery) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
        No hay embarques registrados.
      </p>
    );
  }

  return (
    <DataTable<Shipment, unknown>
      key={compactView ? "shipments-compact" : "shipments-full"}
      columns={columns}
      data={shipments}
      filterPlaceholder="Buscar…"
      manualPagination
      pageCount={pageCount}
      pageIndex={pageIndex}
      totalCount={total}
      onPageChange={setPageIndex}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      manualSorting
      sorting={sorting}
      onSortingChange={setSorting}
      search={search}
      onSearchChange={setSearch}
      isFetching={isFetching}
      initialColumnVisibility={
        compactView
          ? {
              search: false,
              legalName: false,
              comments: false,
              phone: false,
              incident: false,
              incidentType: false,
            }
          : { search: false }
      }
      getRowId={(row) => row.id}
      onRowClick={(shipment) => router.push(`${detailBase}/${shipment.id}`)}
      getRowClassName={getRowClassName}
      toolbar={
        <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5 w-full sm:w-auto sm:min-w-50">
            <Label htmlFor="shipment-filter-status" className="text-xs text-muted-foreground">
              Estado
            </Label>
            <AppSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[{value: STATUS_FILTER_ALL, label: "Todos los estados"}, ...(Object.keys(SHIPMENT_STATUS_CONFIG) as ShipmentStatus[]).map((key) => ({value: key, label: SHIPMENT_STATUS_CONFIG[key].label}))]}
              className="w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-2">
            <div className="space-y-1.5 min-w-0 sm:w-37.5">
              <Label htmlFor="shipment-filter-pickup-from" className="text-xs text-muted-foreground">
                Recolección desde
              </Label>
              <DatePicker
                id="shipment-filter-pickup-from"
                value={pickupFrom}
                onChange={(value) => setPickupFrom(value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0 sm:w-37.5">
              <Label htmlFor="shipment-filter-pickup-to" className="text-xs text-muted-foreground">
                Recolección hasta
              </Label>
              <DatePicker
                id="shipment-filter-pickup-to"
                value={pickupTo}
                onChange={(value) => setPickupTo(value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0 sm:w-37.5">
              <Label htmlFor="shipment-filter-delivery-from" className="text-xs text-muted-foreground">
                Entrega desde
              </Label>
              <DatePicker
                id="shipment-filter-delivery-from"
                value={deliveryFrom}
                onChange={(value) => setDeliveryFrom(value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0 sm:w-37.5">
              <Label htmlFor="shipment-filter-delivery-to" className="text-xs text-muted-foreground">
                Entrega hasta
              </Label>
              <DatePicker
                id="shipment-filter-delivery-to"
                value={deliveryTo}
                onChange={(value) => setDeliveryTo(value)}
                className="w-full"
              />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:ml-auto sm:w-auto sm:shrink-0">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={clearFilters}>
              Limpiar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={exportToExcel}
              disabled={total === 0}
            >
              <FileDown className="size-4 shrink-0" />
              Exportar Excel
            </Button>
          </div>
        </div>
      }
    />
  );
}
