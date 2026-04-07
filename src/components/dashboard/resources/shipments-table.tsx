"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const STATUS_FILTER_ALL = "all" as const;

function dateInRange(iso: string | null, from: string, to: string): boolean {
  const part = iso?.slice(0, 10);
  if (!part) return false;
  if (from && part < from) return false;
  if (to && part > to) return false;
  return true;
}

function getColumns(incidentTypes: { value: string; label: string }[]): ColumnDef<Shipment>[] {
  return [
    {
      id: "search",
      accessorFn: (row) => {
        const itLabel = getIncidentTypeLabel(row.incidentType, incidentTypes);
        return `${row.eco ?? ""} ${row.client ?? ""} ${row.legalName ?? ""} ${row.origin ?? ""} ${row.destination ?? ""} ${row.product ?? ""} ${row.operatorName ?? ""} ${row.truck ?? ""} ${row.trailer ?? ""} ${row.unit ?? ""} ${row.phone ?? ""} ${row.comments ?? ""} ${row.incident ?? ""} ${row.incidentType ?? ""} ${itLabel}`;
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
          <span className="block max-w-[180px] truncate sm:max-w-[220px]" title={v}>
            {v}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      accessorKey: "operatorName",
      header: ({ column }) => <SortableColumnHeader column={column} title="Proveedor" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("operatorName");
        return v ? (
          <span className="block max-w-[180px] truncate sm:max-w-[220px]" title={v}>
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
        <SortableColumnHeader column={column} title="Razón social" />
      ),
      cell: ({ row }) => {
        const v = row.getValue<string | null>("legalName");
        return v ? (
          <span className="block max-w-[140px] truncate sm:max-w-[180px]" title={v}>
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
              <span className="block max-w-[200px] cursor-default truncate text-left sm:max-w-[260px]">
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
              <span className="block max-w-[140px] cursor-default truncate sm:max-w-[180px]">{display}</span>
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
          <span className="whitespace-nowrap font-mono text-xs">{v}</span>
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
              <span className="block max-w-[140px] cursor-default truncate sm:max-w-[180px]">{display}</span>
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

export function ShipmentsTable() {
  const router = useRouter();
  const incidentTypes = useIncidentTypes();
  const columns = useMemo(() => getColumns(incidentTypes), [incidentTypes]);
  const [compactView, setCompactView] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1500
  );
  const { data: shipments, isLoaded, error } = useAdminFetch<Shipment>(
    "/api/admin/shipments",
    "Error al cargar embarques"
  );

  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [pickupFrom, setPickupFrom] = useState("");
  const [pickupTo, setPickupTo] = useState("");
  const [deliveryFrom, setDeliveryFrom] = useState("");
  const [deliveryTo, setDeliveryTo] = useState("");

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

  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (statusFilter !== STATUS_FILTER_ALL && s.status !== statusFilter) return false;
      if (pickupFrom || pickupTo) {
        if (!dateInRange(s.pickupDate, pickupFrom, pickupTo)) return false;
      }
      if (deliveryFrom || deliveryTo) {
        if (!dateInRange(s.deliveryDate, deliveryFrom, deliveryTo)) return false;
      }
      return true;
    });
  }, [shipments, statusFilter, pickupFrom, pickupTo, deliveryFrom, deliveryTo]);

  const exportToExcel = useCallback(() => {
    const aoa = shipmentsToExcelAoa(filteredShipments, incidentTypes);
    downloadXlsxFromAoa(excelExportFilename("embarques"), "Embarques", aoa);
    toast.success("Archivo Excel descargado.");
  }, [filteredShipments, incidentTypes]);

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
      key={compactView ? "shipments-compact" : "shipments-full"}
      columns={columns}
      data={filteredShipments}
      filterColumn="search"
      filterPlaceholder="Buscar…"
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
      onRowClick={(shipment) => router.push(`/admin/dashboard/shipments/${shipment.id}`)}
      getRowClassName={getRowClassName}
      toolbar={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5 w-full sm:w-auto sm:min-w-[200px]">
            <Label htmlFor="shipment-filter-status" className="text-xs text-muted-foreground">
              Estado
            </Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="shipment-filter-status" className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={STATUS_FILTER_ALL}>Todos los estados</SelectItem>
                {(Object.keys(SHIPMENT_STATUS_CONFIG) as ShipmentStatus[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SHIPMENT_STATUS_CONFIG[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-2">
            <div className="space-y-1.5 min-w-0 sm:w-[150px]">
              <Label htmlFor="shipment-filter-pickup-from" className="text-xs text-muted-foreground">
                Recolección desde
              </Label>
              <Input
                id="shipment-filter-pickup-from"
                type="date"
                value={pickupFrom}
                onChange={(e) => setPickupFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0 sm:w-[150px]">
              <Label htmlFor="shipment-filter-pickup-to" className="text-xs text-muted-foreground">
                Recolección hasta
              </Label>
              <Input
                id="shipment-filter-pickup-to"
                type="date"
                value={pickupTo}
                onChange={(e) => setPickupTo(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0 sm:w-[150px]">
              <Label htmlFor="shipment-filter-delivery-from" className="text-xs text-muted-foreground">
                Entrega desde
              </Label>
              <Input
                id="shipment-filter-delivery-from"
                type="date"
                value={deliveryFrom}
                onChange={(e) => setDeliveryFrom(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0 sm:w-[150px]">
              <Label htmlFor="shipment-filter-delivery-to" className="text-xs text-muted-foreground">
                Entrega hasta
              </Label>
              <Input
                id="shipment-filter-delivery-to"
                type="date"
                value={deliveryTo}
                onChange={(e) => setDeliveryTo(e.target.value)}
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
              disabled={filteredShipments.length === 0}
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
