import { FINANCE_TARIFF_COST_LABEL, FINANCE_TARIFF_SALE_LABEL } from "@/lib/constants/finance-tariff-labels";
import { formatIncidentYesNo } from "@/lib/incident-yes-no";
import { getIncidentTypeLabel } from "@/lib/incident-type-label";
import type { FinanceListRow } from "@/types/finance.types";
import type { Shipment, ShipmentStatus } from "@/types/shipment.types";
import type { Employee } from "@/types/resources.types";
import { formatPhone } from "@/lib/utils";

const SHIPMENT_STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: "Pendiente",
  delivered: "Entregado",
  delivered_with_delay: "Entregado con retraso",
  not_delivered: "No entregado",
  at_risk: "En riesgo",
  returned: "Cerrado",
};

/**
 * Las fechas se guardan a medianoche UTC, así que hay que formatearlas en UTC.
 * Sin `timeZone` el navegador las pasa a la hora local (México, UTC-6) y el día
 * se recorre: "2026-07-01" se exportaba como "30 jun 2026".
 */
function fmtDateEs(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
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

export type ExcelCell = string | number | null | undefined;

/** Ancho de columna calculado a partir del contenido, con topes razonables. */
function columnWidth(aoa: ExcelCell[][], index: number): number {
  const longest = aoa.reduce(
    (max, row) => Math.max(max, String(row[index] ?? "").length),
    0
  );
  return Math.min(Math.max(longest + 2, 10), 60);
}

/**
 * Genera un .xlsx y lo descarga en el navegador.
 *
 * Usa exceljs y lo carga de forma diferida: la librería pesa bastante y solo
 * hace falta cuando alguien exporta, no en cada carga de la tabla.
 */
export async function downloadXlsxFromAoa(
  filename: string,
  sheetName: string,
  aoa: ExcelCell[][]
): Promise<void> {
  if (aoa.length === 0) return;

  const ExcelJS = (await import("exceljs")).default;

  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  // Excel no admite más de 31 caracteres ni ciertos símbolos en el nombre de hoja.
  const safeName = (sheetName || "Datos").replace(/[\\/*?:[\]]/g, "").slice(0, 31);
  const sheet = workbook.addWorksheet(safeName || "Datos");

  sheet.addRows(aoa.map((row) => row.map((cell) => cell ?? "")));

  const [headers = []] = aoa;
  sheet.columns = headers.map((_, i) => ({ width: columnWidth(aoa, i) }));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

// ── Colaboradores ─────────────────────────────────────────────────────────────

/** Columnas que se pueden exportar de la tabla de colaboradores, en orden. */
export const EMPLOYEE_EXPORT_COLUMNS: { key: string; label: string }[] = [
  { key: "name", label: "Nombre" },
  { key: "email", label: "Correo" },
  { key: "phone", label: "Teléfono" },
  { key: "birthDate", label: "Fecha de nacimiento" },
  { key: "age", label: "Edad" },
  { key: "hireDate", label: "Fecha de ingreso" },
  { key: "tenure", label: "Antigüedad" },
  { key: "position", label: "Puesto" },
  { key: "department", label: "Departamento" },
  { key: "nss", label: "NSS" },
  { key: "rfc", label: "RFC" },
  { key: "curp", label: "CURP" },
  { key: "address", label: "Domicilio" },
];

/** "4 de octubre de 1990". Las fechas vienen como "YYYY-MM-DD": se leen en UTC. */
function fmtDateLongEs(iso: string | null): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "35 años, 11 meses" desde la fecha dada hasta `now`. */
function elapsedSince(iso: string, now: Date): string {
  const d = new Date(`${iso}T00:00:00Z`);
  let y = now.getFullYear() - d.getUTCFullYear();
  let m = now.getMonth() - d.getUTCMonth();
  if (m < 0) {
    y--;
    m += 12;
  }
  const months = `${m} mes${m !== 1 ? "es" : ""}`;
  return y > 0 ? `${y} año${y !== 1 ? "s" : ""}, ${months}` : months;
}

/**
 * Hoja de colaboradores con las columnas elegidas. El teléfono sale con el
 * mismo formato que en la tabla: exportarlo pelado hacía que el archivo no se
 * pareciera a lo que la persona tenía en pantalla.
 */
export function employeesToExcelAoa(
  employees: Employee[],
  selected: Set<string>,
  now = new Date()
): ExcelCell[][] {
  const columns = EMPLOYEE_EXPORT_COLUMNS.filter((c) => selected.has(c.key));
  const headers = columns.map((c) => c.label);

  const rows = employees.map((emp) =>
    columns.map((c): ExcelCell => {
      switch (c.key) {
        case "age":
          return emp.birthDate ? elapsedSince(emp.birthDate, now) : "";
        case "tenure":
          return emp.hireDate ? elapsedSince(emp.hireDate, now) : "";
        case "birthDate":
        case "hireDate":
          return fmtDateLongEs(emp[c.key] ?? null);
        case "phone":
          return emp.phone ? formatPhone(emp.phone) : "";
        default:
          return (emp[c.key as keyof Employee] as string | null | undefined) ?? "";
      }
    })
  );

  return [headers, ...rows];
}
