import * as XLSX from "xlsx";
import { FINANCE_TARIFF_COST_LABEL, FINANCE_TARIFF_SALE_LABEL } from "@/lib/constants/finance-tariff-labels";
import { formatIncidentYesNo } from "@/lib/incident-yes-no";
import { getIncidentTypeLabel } from "@/lib/incident-type-label";
import type { FinanceListRow } from "@/types/finance.types";
import type { Shipment, ShipmentStatus } from "@/types/shipment.types";

const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Pendiente",
  delivered: "Entregado",
  delivered_with_delay: "Entregado con retraso",
  not_delivered: "No entregado",
  at_risk: "En riesgo",
  returned: "Cerrado",
};

function fmtDateEs(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Nombre de archivo: prefijo + fecha local (YYYY-MM-DD). */
export function excelExportFilename(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${prefix}-${y}-${m}-${day}.xlsx`;
}

export function downloadXlsxFromAoa(
  filename: string,
  sheetName: string,
  aoa: (string | number | null | undefined)[][]
): void {
  if (aoa.length === 0) return;
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  const safeName = (sheetName || "Datos").slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, safeName);
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function shipmentsToExcelAoa(
  shipments: Shipment[],
  incidentTypes: { value: string; label: string }[]
): (string | number)[][] {
  const headers = [
    "Estado",
    "ECO",
    "Cliente",
    "Origen",
    "Destino",
    "Recolección",
    "Entrega",
    "Proveedor",
    "Comentarios",
    "Tipo de incidencia",
    "Celular",
    "Incidencia",
  ];
  const rows = shipments.map((s) => [
    SHIPMENT_STATUS_LABEL[s.status] ?? s.status,
    s.eco ?? "",
    s.client ?? "",
    s.origin ?? "",
    s.destination ?? "",
    fmtDateEs(s.pickupDate),
    fmtDateEs(s.deliveryDate),
    s.legalName ?? "",
    s.comments ?? "",
    s.incidentType ? getIncidentTypeLabel(s.incidentType, incidentTypes) : "",
    s.phone ?? "",
    s.incident ? formatIncidentYesNo(s.incident) : "",
  ]);
  return [headers, ...rows];
}

export function financesToExcelAoa(rows: FinanceListRow[]): (string | number)[][] {
  const headers = [
    "Estado",
    "ECO",
    "Cliente",
    "Origen",
    "Destino",
    FINANCE_TARIFF_SALE_LABEL,
    FINANCE_TARIFF_COST_LABEL,
    "Operador",
    "Recolección",
    "Entrega",
  ];
  const data = rows.map((f) => [
    SHIPMENT_STATUS_LABEL[f.status as ShipmentStatus] ?? f.status,
    f.eco ?? "",
    f.client ?? "",
    f.origin ?? "",
    f.destination ?? "",
    f.sale ?? "",
    f.cost ?? "",
    f.operatorName ?? "",
    fmtDateEs(f.pickupDate),
    fmtDateEs(f.deliveryDate),
  ]);
  return [headers, ...data];
}
