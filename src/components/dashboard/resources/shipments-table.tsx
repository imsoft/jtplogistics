"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { DataTableSkeleton } from "@/components/ui/skeletons";
import { useRouter } from "next/navigation";
import { useServerTable } from "@/hooks/use-server-table";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable, STICKY_ACTIONS_CLASS } from "@/components/ui/data-table";
import { SortableColumnHeader } from "@/components/ui/sortable-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMxn, formatPhone } from "@/lib/utils";
import { formatIncidentYesNo, incidentAllowsIncidentType } from "@/lib/incident-yes-no";
import { getIncidentTypeLabel } from "@/lib/incident-type-label";
import { useIncidentTypes } from "@/hooks/use-incident-types";
import { IncidentTypeBadge } from "@/components/dashboard/resources/incident-type-badge";
import type { Shipment, ShipmentStatus } from "@/types/shipment.types";
import { ChevronDown, FileText, ImageDown, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { trackingFileName } from "@/lib/shipment-tracking";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUnitTypes } from "@/hooks/use-unit-types";
import { shipmentTotal, SHIPMENT_TOTAL_FORMULA } from "@/lib/shipment-total";
import {
  downloadShipmentLetters,
  instructionLetterFromShipment,
  shipmentLetterMissing,
} from "@/components/dashboard/resources/shipment-pdf-download";
import { toast } from "sonner";
import { useCollaboratorPermissions } from "@/hooks/use-collaborator-permissions";
import { LOCK_TEXT, shipmentLockReason } from "@/lib/shipment-lock";
import { useConfirm } from "@/components/ui/confirm-provider";
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

export const SHIPMENT_STATUS_CONFIG: Record<
  ShipmentStatus,
  { label: string; badgeClass: string; rowClass: string }
> = {
  pending: {
    label: "Pendiente",
    badgeClass: "bg-gray-100 text-gray-800",
    rowClass: "",
  },
  in_transit: {
    label: "En tránsito",
    badgeClass: "bg-blue-100 text-blue-800",
    rowClass: "",
  },
  delivered: {
    label: "Entregado",
    badgeClass: "bg-blue-200 text-blue-900",
    rowClass: "bg-blue-50",
  },
  delivered_with_delay: {
    label: "Entregado con retraso",
    badgeClass: "bg-amber-100 text-amber-800",
    rowClass: "bg-amber-50",
  },
  not_delivered: {
    label: "No entregado",
    badgeClass: "bg-red-200 text-red-900",
    rowClass: "bg-red-50",
  },
  at_risk: {
    label: "En riesgo",
    badgeClass: "bg-red-100 text-red-800",
    rowClass: "bg-red-50",
  },
  returned: {
    label: "Cerrado",
    badgeClass: "bg-green-100 text-green-800",
    rowClass: "bg-green-50",
  },
};

/**
 * Cómo se pinta el estado de un embarque. Un cerrado con incidencia se pinta
 * en ámbar (atención) para distinguirlo del cerrado limpio, que va en verde.
 */
export function shipmentStatusDisplay(status: string, incident?: string | null) {
  if (status === "returned" && incidentAllowsIncidentType(incident ?? "")) {
    return { label: "Cerrado con incidencia", badgeClass: "bg-amber-100 text-amber-800", rowClass: "bg-amber-50" };
  }
  return SHIPMENT_STATUS_CONFIG[status as ShipmentStatus] ?? { label: status, badgeClass: "", rowClass: "" };
}

const STATUS_FILTER_ALL = "all" as const;

const STATUS_ORDER: ShipmentStatus[] = ["pending", "in_transit", "delivered", "delivered_with_delay", "not_delivered", "at_risk", "returned"];

/**
 * Estado del embarque en la tabla: con permiso de editar, un menú para
 * cambiarlo ahí mismo, también si está "sin incidencias" (sigue su curso
 * hasta cerrarse). Cerrado queda de solo lectura: se reabre desde la ficha
 * confirmando el correo.
 */
function StatusCell({
  shipment,
  canEdit,
  busy,
  onChange,
}: {
  shipment: Shipment;
  canEdit: boolean;
  busy: boolean;
  onChange: (next: ShipmentStatus) => void;
}) {
  const config = shipmentStatusDisplay(shipment.status, shipment.incident);
  const badge = (
    <Badge variant="outline" className={`whitespace-nowrap text-xs font-medium border-0 ${config.badgeClass}`}>
      {config.label}
    </Badge>
  );
  // Sin incidencias, el estado sí se cambia aquí; cerrado, solo desde su ficha.
  const lock = shipmentLockReason(shipment) === "closed" ? "closed" : null;
  if (!canEdit || lock) {
    return lock && canEdit ? <span title={`${LOCK_TEXT[lock].title}: se cambia desde su ficha.`}>{badge}</span> : badge;
  }
  return (
    // El menú vive en un portal, pero sus clics suben por React hasta la fila.
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={busy}
          aria-label={`Cambiar estado del embarque ${shipment.eco ?? ""}`}
          className="inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
        >
          {badge}
          {busy ? <Loader2 className="size-3 animate-spin" /> : <ChevronDown className="text-muted-foreground size-3 shrink-0" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {STATUS_ORDER.map((st) => (
            <DropdownMenuItem key={st} disabled={st === shipment.status} onSelect={() => onChange(st)}>
              <span className={`size-2 rounded-full ${SHIPMENT_STATUS_CONFIG[st].badgeClass}`} aria-hidden />
              {SHIPMENT_STATUS_CONFIG[st].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getColumns(incidentTypes: { value: string; label: string; color?: string | null }[], showSale: boolean): ColumnDef<Shipment>[] {
  const columns: ColumnDef<Shipment>[] = [
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
        const config = shipmentStatusDisplay(row.getValue<ShipmentStatus>("status"), row.original.incident);
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
      meta: { className: "hidden @xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Origen" />,
      cell: ({ row }) => row.getValue("origin") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "destination",
      meta: { className: "hidden @xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Destino" />,
      cell: ({ row }) => row.getValue("destination") ?? <span className="text-muted-foreground">—</span>,
    },
    {
      accessorKey: "pickupDate",
      meta: { className: "hidden @3xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Recolección" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("pickupDate");
        return v ? fmtDate(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "deliveryDate",
      meta: { className: "hidden @3xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Entrega" />,
      cell: ({ row }) => {
        const v = row.getValue<string | null>("deliveryDate");
        return v ? fmtDate(v) : <span className="text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: "legalName",
      meta: { className: "hidden @4xl/table:table-cell" },
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
    ...(showSale
      ? [
          {
            accessorKey: "sale",
            header: ({ column }) => <SortableColumnHeader column={column} title="Tarifa de venta" />,
            cell: ({ row }) => {
              const v = row.original.sale;
              return v != null ? (
                <span className="whitespace-nowrap tabular-nums">${formatMxn(v)}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              );
            },
            enableSorting: false,
          } satisfies ColumnDef<Shipment>,
          {
            id: "total",
            header: () => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help whitespace-nowrap" title={SHIPMENT_TOTAL_FORMULA}>
                    Total
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">{SHIPMENT_TOTAL_FORMULA}</TooltipContent>
              </Tooltip>
            ),
            cell: ({ row }) => {
              const v = shipmentTotal(row.original.cost);
              return v != null ? (
                <span className="whitespace-nowrap tabular-nums">${formatMxn(v)}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              );
            },
            enableSorting: false,
          } satisfies ColumnDef<Shipment>,
        ]
      : []),
    {
      accessorKey: "comments",
      meta: { className: "hidden @6xl/table:table-cell" },
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
      meta: { className: "hidden @5xl/table:table-cell" },
      header: ({ column }) => <SortableColumnHeader column={column} title="Tipo de incidencia" />,
      cell: ({ row }) => {
        // Cada tipo con el color que se le eligió en "Tipos de incidencia".
        return <IncidentTypeBadge value={row.getValue<string | null>("incidentType")} types={incidentTypes} />;
      },
    },
    {
      accessorKey: "phone",
      meta: { className: "hidden @5xl/table:table-cell" },
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
      meta: { className: "hidden @6xl/table:table-cell" },
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
  return columns;
}

function getRowClassName(shipment: Shipment): string {
  return shipmentStatusDisplay(shipment.status, shipment.incident).rowClass;
}

interface ShipmentsTableProps {
  apiEndpoint?: string;
  detailBasePath?: string;
  /** Dirección elimina siempre (cerrados, confirmando su correo); el colaborador según su permiso. */
  isAdmin?: boolean;
}

export function ShipmentsTable({
  apiEndpoint = "/api/admin/shipments",
  detailBasePath = "/admin/dashboard/shipments",
  isAdmin = true,
}: ShipmentsTableProps = {}) {
  const endpoint = apiEndpoint;
  const detailBase = detailBasePath;
  const router = useRouter();
  const incidentTypes = useIncidentTypes();
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
    refetch,
  } = useServerTable<Shipment>({
    endpoint,
    pageSize: 20,
    filters,
    errorMessage: "Error al cargar embarques",
  });

  // Tarifa de venta y Total aparecen solo cuando la API manda las tarifas (dirección, o colaborador que ve Finanzas).
  const showSale = useMemo(() => shipments.some((s) => "sale" in s), [shipments]);
  const { permissions } = useCollaboratorPermissions();
  const canDelete = isAdmin || Boolean(permissions?.canDeleteShipments);
  const canUpdate = isAdmin || Boolean(permissions?.canUpdateShipments);
  const confirm = useConfirm();
  const [savingStatus, setSavingStatus] = useState<string | null>(null);

  // Cambio rápido de estado desde la tabla. Solo "Cerrado" se confirma: deja
  // el embarque de solo lectura y pasa su registro a finanzas.
  const changeStatus = useCallback(
    async (shipment: Shipment, next: ShipmentStatus) => {
      if (next === "returned") {
        const ok = await confirm({
          title: `¿Cerrar el embarque ${shipment.eco ?? ""}?`.replace(" ?", "?"),
          description: "Queda de solo lectura y su registro pasa a la tabla de finanzas. Para volver a editarlo hay que reabrirlo confirmando el correo.",
          confirmLabel: "Cerrar embarque",
        });
        if (!ok) return;
      }
      setSavingStatus(shipment.id);
      try {
        const res = await fetch(`${endpoint}/${shipment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "No se pudo cambiar el estado.");
        toast.success(`Estado: ${SHIPMENT_STATUS_CONFIG[next].label}.`);
        refetch();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No se pudo cambiar el estado.");
      } finally {
        setSavingStatus(null);
      }
    },
    [confirm, endpoint, refetch]
  );
  const [deleting, setDeleting] = useState<Shipment | null>(null);
  const unitTypes = useUnitTypes();
  const [generating, setGenerating] = useState<string | null>(null);

  const generatePdf = useCallback(
    async (shipment: Shipment) => {
      const missing = shipmentLetterMissing(shipment);
      if (missing.length) {
        toast.error(`Para las cartas falta: ${missing.join(", ")}.`);
        return;
      }
      const unitLabel = unitTypes.find((u) => u.value === shipment.unit)?.label ?? shipment.unit ?? "";
      setGenerating(shipment.id);
      try {
        // Un solo PDF: primero la carta de instrucciones y después la carta porte.
        await downloadShipmentLetters(instructionLetterFromShipment(shipment, unitLabel), shipment.cartaPorte);
      } catch (e) {
        console.error(e);
        toast.error("No se pudieron generar las cartas.");
      } finally {
        setGenerating(null);
      }
    },
    [unitTypes]
  );

  // Imagen cuadrada de seguimiento para mandarle al cliente por WhatsApp.
  const downloadTracking = useCallback(async (shipment: Shipment) => {
    setGenerating(shipment.id);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/tracking-image`);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "No se pudo generar la imagen.");
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = trackingFileName(shipment.eco);
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar la imagen.");
    } finally {
      setGenerating(null);
    }
  }, []);

  const columns = useMemo(() => {
    const base = getColumns(incidentTypes, showSale).map((col) =>
      "accessorKey" in col && col.accessorKey === "status"
        ? ({
            ...col,
            cell: ({ row }) => (
              <StatusCell
                shipment={row.original}
                canEdit={canUpdate}
                busy={savingStatus === row.original.id}
                onChange={(next) => void changeStatus(row.original, next)}
              />
            ),
          } as ColumnDef<Shipment>)
        : col
    );
    const actions: ColumnDef<Shipment> = {
      id: "actions",
      // Pegada al borde derecho: en laptops la tabla se recorre de lado y el
      // botón quedaría escondido al final.
      meta: { className: STICKY_ACTIONS_CLASS },
      enableSorting: false,
      enableHiding: false,
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const shipment = row.original;
        // Cerrado o sin incidencias: solo dirección lo elimina.
        const showDelete = canDelete && (isAdmin || !shipmentLockReason(shipment));
        const busy = generating === shipment.id;
        return (
          // El menú vive en un portal, pero sus clics suben por React hasta la fila.
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={`Acciones del embarque ${shipment.eco ?? ""}`}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="size-3.5 animate-spin" /> : <MoreVertical className="size-3.5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => generatePdf(shipment)}>
                  <FileText className="size-4" />
                  Carta de instrucciones y carta porte
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void downloadTracking(shipment)}>
                  <ImageDown className="size-4" />
                  Imagen de seguimiento
                </DropdownMenuItem>
                {showDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(shipment)}>
                      <Trash2 className="size-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    };
    return [...base, actions];
  }, [incidentTypes, showSale, canDelete, isAdmin, generating, generatePdf, canUpdate, savingStatus, changeStatus, downloadTracking]);

  async function deleteShipment(confirmEmail: string) {
    if (!deleting) return;
    const res = await fetch(`${endpoint}/${deleting.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirmEmail }),
    });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo eliminar.");
    toast.success("Embarque eliminado.");
    refetch();
  }

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

  // Exportar: todas las filas con la búsqueda, los filtros y el orden actuales.
  const fetchAllForExport = useCallback(async () => {
    const res = await fetch(`${endpoint}?${buildQuery({ all: "1" })}`);
    if (!res.ok) throw new Error();
    return ((await res.json()) as { data: Shipment[] }).data;
  }, [buildQuery, endpoint]);

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
    <>
    <RowDeleteDialog
      open={deleting !== null}
      title="¿Eliminar embarque?"
      description={
        <>
          Se eliminará el embarque <strong>{deleting?.eco ?? "sin ECO"}</strong>
          {deleting?.origin || deleting?.destination ? ` (${deleting?.origin ?? "—"} → ${deleting?.destination ?? "—"})` : ""} junto con sus
          tarifas en Finanzas. Las facturas que se hayan hecho de él se conservan. No se puede deshacer.
        </>
      }
      requireEmail={deleting !== null && shipmentLockReason(deleting) !== null}
      onConfirm={deleteShipment}
      onClose={() => setDeleting(null)}
    />
    <DataTable<Shipment, unknown>
      exportTitle="Tabla de embarques"
      fetchAllForExport={fetchAllForExport}
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
      searchOnOwnRow
      toolbar={
        // Un solo renglón en escritorio: estado, las cuatro fechas, "Limpiar
        // filtros" y (lo pone la tabla) "Exportar", todos alineados abajo.
        <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-1 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
          {/* flex + gap (no space-y): la lista trae un elemento oculto que con
              space-y sumaba margen y subía "Estado" sobre las fechas. */}
          <div className="flex w-full flex-col gap-1.5 sm:w-52">
            <Label htmlFor="shipment-filter-status" className="text-xs text-muted-foreground">
              Estado
            </Label>
            <AppSelect
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v || STATUS_FILTER_ALL)}
              options={[{value: STATUS_FILTER_ALL, label: "Todos los estados"}, ...(Object.keys(SHIPMENT_STATUS_CONFIG) as ShipmentStatus[]).map((key) => ({value: key, label: SHIPMENT_STATUS_CONFIG[key].label}))]}
              className="w-full"
            />
          </div>
          {/* En celular, las fechas en dos columnas; en escritorio, en el mismo renglón. */}
          <div className="grid grid-cols-2 gap-3 sm:contents">
            <div className="flex min-w-0 flex-col gap-1.5 sm:w-36">
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
            <div className="flex min-w-0 flex-col gap-1.5 sm:w-36">
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
            <div className="flex min-w-0 flex-col gap-1.5 sm:w-36">
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
            <div className="flex min-w-0 flex-col gap-1.5 sm:w-36">
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
          <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:shrink-0 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      }
    />
    </>
  );
}
